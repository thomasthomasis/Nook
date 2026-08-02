import { Stack, StackProps, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";

export class DatabaseStack extends Stack {
    public readonly vpc: ec2.Vpc;
    public readonly cluster: rds.DatabaseCluster;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, "NookVpc", {
            maxAzs: 2,
            natGateways: 1, // one NAT gateway is enough for dev; costs money per hour, worth knowing
            subnetConfiguration: [
                { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
                { name: "private-lambda", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
                { name: "isolated-db", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
            ],
        });

        const dbSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
            vpc: this.vpc,
            description: "Allows Lambdas in the private subnets to reach Aurora",
            allowAllOutbound: false,
        });

        this.cluster = new rds.DatabaseCluster(this, "NookCluster", {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_15_14,
            }),
            vpc: this.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            securityGroups: [dbSecurityGroup],
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 1,
            writer: rds.ClusterInstance.serverlessV2("Writer"),
            defaultDatabaseName: "nook",
            deletionProtection: false, // dev only
            removalPolicy: RemovalPolicy.DESTROY, //dev only
            backup: { retention: Duration.days(1) },
            storageEncrypted: true,
        });
    }
}