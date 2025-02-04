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
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import * as ec2_targets from 'aws-cdk-lib/aws-events-targets';

export interface CdkStackProps extends cdk.StackProps {
  stage: string;
  keyName: string;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const ec2_instance = new LinuxEc2Instance(this, 'EC2Instance1', {
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

    // setup auto on/off for EC2 instance using CloudWatch Events
    // on from 8am to 8pm, off from 8pm to 8am(GMT+7)
    const onRule = new Rule(this, 'EC2OnRule', {
      // start EC2 instance at 1am UTC = 8am GMT+7
      schedule: Schedule.cron({ minute: '0', hour: '1', weekDay: 'MON-FRI' }),
      description: 'Turn on EC2 instance',
    });

    const offRule = new Rule(this, 'EC2OffRule', {
      // stop EC2 instance at 13pm UTC = 8pm GMT+7
      schedule: Schedule.cron({ minute: '0', hour: '13', weekDay: 'MON-FRI' }),
      description: 'Turn off EC2 instance',
    });

    onRule.addTarget(new ec2_targets.AwsApi({
      service: 'EC2',
      action: 'startInstances',
      parameters: {
        InstanceIds: [ec2_instance.instance.instanceId],
      },
    }));

    offRule.addTarget(new ec2_targets.AwsApi({
      service: 'EC2',
      action: 'stopInstances',
      parameters: {
        InstanceIds: [ec2_instance.instance.instanceId],
      },
    }));

    // Output the public IP of the EC2 instance
    new CfnOutput(this, 'EC2PublicIp', {
      value: ec2_instance.instance.instancePublicIp,
    });
  }
}
