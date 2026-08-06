import { Stack, StackProps, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class StorageStack extends Stack {
    public readonly mediaBucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
            bucketName: `nook-dev-media-${this.account}`, // buket names are globally unique across ALL of AWS, hence the account id
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    maxAge: 3000,
                },
            ],
            lifecycleRules: [
                {
                    id: "abort-incomplete-multipart-uploads",
                    abortIncompleteMultipartUploadAfter: Duration.days(7),
                },
            ],
            removalPolicy: RemovalPolicy.DESTROY, // dev only
            autoDeleteObjects: true, // dev only - lets 'cdk destroy' actually empty bucket first
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "MediaOAI", {
            comment: "OAI for nook-dev-media",
        });
        this.mediaBucket.grantRead(originAccessIdentity);

        this.distribution = new cloudfront.Distribution(this, "MediaDistribution", {
            comment: "nook-dev-media",
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.mediaBucket, { originAccessIdentity }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // cheapest tier - US/Europe edge locations only, fine for dev
        });
    }
}