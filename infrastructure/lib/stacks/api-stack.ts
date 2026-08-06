import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cognito from "aws-cdk-lib/aws-cognito";

export interface ApiStackProps extends StackProps {
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient; 
}

export class ApiStack extends Stack {
    public readonly httpApi: apigwv2.HttpApi;
    public readonly authorizerId: string;

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        this.httpApi = new apigwv2.HttpApi(this, "NookHttpApi", {
            apiName: "nook-dev-api",
            corsPreflight: {
                allowOrigins: ["*"], // tighten once a real app origin exists
                allowMethods: [apigwv2.CorsHttpMethod.ANY],
                allowHeaders: ["Authorization", "Content-Type"],
            },
        });

        const authorizer = new apigwv2.CfnAuthorizer(this, "CognitoAuthorizer", {
            apiId: this.httpApi.httpApiId,
            authorizerType: "JWT",
            identitySource: ["$request.header.Authorization"],
            name: "CognitoAuthorizer",
            jwtConfiguration: {
                audience: [props.userPoolClient.userPoolClientId],
                issuer: `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
            },
        });

        this.authorizerId = authorizer.ref;

        // No routes yet - the Identity domain will call httpApi.addRoutes(...)
        // once it has a real Lambda to attach.
    }
}