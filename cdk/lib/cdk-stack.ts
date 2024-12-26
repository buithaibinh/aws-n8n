import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LinuxEc2InstanceProps, LinuxEc2Instance } from './linux-ec2';

export interface CdkStackProps extends cdk.StackProps {
  stage: string;
  keyName: string;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    // this repository is used to store the API image
    const ecrRepository = new ecr.Repository(this, 'ecrRepository', {
      repositoryName: `${id}-api`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteImages: true,
    });

    // create a new S3 bucket, with versioning enabled
    // this bucket is used to store the static data
    const bucket = new s3.Bucket(this, 'Bucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,

      publicReadAccess: false, // Block public access to the bucket and all of its contents
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,

      // CORS configuration
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          maxAge: 3000,
          exposedHeaders: ['ETag'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Thêm bucket policy để cho phép quyền truy cập công khai trong thư mục 'public'
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/public/*`], // Chỉ áp dụng cho thư mục public và các thư mục con
      })
    );

    // policy to allow the EC2 instance to access the S3 bucket
    const s3Policy = new iam.PolicyStatement({
      actions: ['s3:*'],
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
    });

    // policy for use Polly speech synthesis
    const pollyPolicy = new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*'],
    });

    new LinuxEc2Instance(this, 'EC2Instance1', {
      instanceType: 't2.micro',
      amiId: 'ami-06650ca7ed78ff6fa', // Ubuntu 24.04 LTS amd64
      keyName: props.keyName,
      securityGroupRules: [
        {
          port: 22,
          description: 'Allow SSH from my IP',
          allowedIps: ['118.69.55.211/32'], // only allow SSH from this IP
        },
        { port: 80, description: 'Allow HTTP' },
        { port: 443, description: 'Allow HTTPS' },
      ],
      subnetType: ec2.SubnetType.PUBLIC,
      ebsVolumeSize: 40,
      osType: 'ubuntu',
      rolePolicyStatements: [s3Policy, pollyPolicy],
    });

    // output the ecr repository name
    new CfnOutput(this, 'ecrRepositoryName', {
      value: ecrRepository.repositoryName,
    });

    // output the ecr repository uri
    new CfnOutput(this, 'ecrRepositoryUri', {
      value: ecrRepository.repositoryUri,
    });

    // output the bucket name
    new CfnOutput(this, 'bucketName', {
      value: bucket.bucketName,
    });
  }
}
