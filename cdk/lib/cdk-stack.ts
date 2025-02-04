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

    new LinuxEc2Instance(this, 'EC2Instance1', {
      instanceType: 't2.small',
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
      subnetType: ec2.SubnetType.PUBLIC, // put EC2 in public subnet, so it can access the internet
      ebsVolumeSize: 40,
      osType: 'ubuntu',
    });
  }
}
