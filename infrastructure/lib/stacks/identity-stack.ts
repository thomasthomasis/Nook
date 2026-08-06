import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as path from "path";

export interface IdentityStackProps extends StackProps {
    vpc: ec2.Vpc;
    databaseSecurityGroup: ec2.SecurityGroup;
    databaseSecret: secretsmanager.ISecret;
    eventBus: events.EventBus;
    httpApiId: string;
    authorizerId: string;
}

export class IdentityStack extends Stack {
    constructor(scope: Construct, id: string, props: IdentityStackProps) {
        super(scope, id, props);

        // A dedicated security group FOR the Lambda, distinct from Aurora's.
        // We reference this group (not an IP range) as the allowed source on
        // Aurora's security group below — same pattern as the bastion.
        const lambdaSecurityGroup = new ec2.SecurityGroup(this, "IdentityLambdaSG", {
        vpc: props.vpc,
        description: "Identity domain Lambdas",
        });

        new ec2.CfnSecurityGroupIngress(this, "AllowIdentityLambdaToAurora", {
            groupId: props.databaseSecurityGroup.securityGroupId,
            sourceSecurityGroupId: lambdaSecurityGroup.securityGroupId,
            ipProtocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            description: "Allow Identity Lambdas to reach Aurora",
        });

        console.log("Resolved from:", __dirname);

        const registerUserFn = new lambdaNode.NodejsFunction(this, "RegisterUserFn", {
            entry: path.join(__dirname, "../../../backend/identity/src/handlers/register-user.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_LATEST,
            timeout: Duration.seconds(10),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [lambdaSecurityGroup],
            environment: {
                DB_SECRET_ARN: props.databaseSecret.secretArn,
                EVENT_BUS_NAME: props.eventBus.eventBusName,
            },
        });

        props.databaseSecret.grantRead(registerUserFn);
        props.eventBus.grantPutEventsTo(registerUserFn);

        const integration = new apigwv2.CfnIntegration(this, "RegisterUserIntegration", {
            apiId: props.httpApiId,
            integrationType: "AWS_PROXY",
            integrationUri: registerUserFn.functionArn,
            payloadFormatVersion: "2.0",
            integrationMethod: "POST",
        });

        new apigwv2.CfnRoute(this, "RegisterUserRoute", {
            apiId: props.httpApiId,
            routeKey: "POST /identity/users",
            target: `integrations/${integration.ref}`,
            authorizationType: "JWT",
            authorizerId: props.authorizerId,
        });

        registerUserFn.addPermission("AllowApiGatewayInvoke", {
            principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
            sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${props.httpApiId}/*/*/identity/users`,
        });
    }
}
