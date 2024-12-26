import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import * as fs from 'fs';
import * as path from 'path';

export interface LinuxEc2InstanceProps {
  instanceType: string;
  amiId: string;
  keyName: string;
  securityGroupRules: Array<{
    port: number;
    description: string;
    allowedIps?: string[];
  }>; // Add allowedIps for SSH
  subnetType: ec2.SubnetType;
  vpcId?: string; // Optional, defaults to default VPC
  rolePolicyStatements?: iam.PolicyStatement[]; // Optional custom policy statements
  ebsVolumeSize?: number; // Optional EBS volume size in GiB

  osType: 'ubuntu' | 'amazon-linux' | 'debian' | 'centos'; // Extend to support multiple OS types
}

export class LinuxEc2Instance extends Construct {
  public readonly instance: ec2.Instance;
  public readonly publicIpOutput?: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: LinuxEc2InstanceProps) {
    super(scope, id);

    // Get region from the current stack context
    const region = cdk.Stack.of(this).region;

    // VPC (use provided or default VPC)
    const vpc = props.vpcId
      ? ec2.Vpc.fromLookup(this, 'CustomVPC', { vpcId: props.vpcId })
      : ec2.Vpc.fromLookup(this, 'DefaultVPC', { isDefault: true });

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: 'Security group for EC2 instance',
      allowAllOutbound: true,
    });

    // Add custom security group rules
    props.securityGroupRules.forEach((rule) => {
      if (rule.allowedIps) {
        // If allowed IPs are specified, only allow connections from those IPs
        rule.allowedIps.forEach((ip) => {
          securityGroup.addIngressRule(
            ec2.Peer.ipv4(ip),
            ec2.Port.tcp(rule.port),
            rule.description
          );
        });
      } else {
        // Otherwise, allow connections from anywhere (for non-SSH rules like HTTP/HTTPS)
        securityGroup.addIngressRule(
          ec2.Peer.anyIpv4(),
          ec2.Port.tcp(rule.port),
          rule.description
        );
      }
    });

    // IAM Role and Policies
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // Add SSM and other default policies
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );
    // make sure ec2 role have basic policy to write logs to cloudwatch
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
    );
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:GetRepositoryPolicy',
          'ecr:DescribeRepositories',
          'ecr:ListImages',
          'ecr:DescribeImages',
          'ecr:BatchGetImage',
          'ecr:GetLifecyclePolicy',
          'ecr:GetLifecyclePolicyPreview',
          'ecr:ListTagsForResource',
          'ecr:DescribeImageScanFindings',
        ],
        resources: ['*'],
      })
    );

    // Add custom policy statements if provided
    if (props.rolePolicyStatements) {
      props.rolePolicyStatements.forEach((policy) =>
        ec2Role.addToPolicy(policy)
      );
    }

    // Load User Data script based on OS type
    const userDataScriptPath = path.join(
      __dirname,
      `user-data/user-data-${props.osType}.sh`
    );
    if (!fs.existsSync(userDataScriptPath)) {
      throw new Error(
        `User Data script not found at path: ${userDataScriptPath}`
      );
    }
    const userDataScript = fs.readFileSync(userDataScriptPath, 'utf8');
    const userData = ec2.UserData.forLinux();
    userData.addCommands(...userDataScript.split('\n'));

    // EC2 Instance
    this.instance = new ec2.Instance(this, 'GenericInstance', {
      instanceType: new ec2.InstanceType(props.instanceType),
      machineImage: ec2.MachineImage.genericLinux({
        [region]: props.amiId, // Use stack's region dynamically
      }),
      vpc,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', props.keyName),
      securityGroup,
      vpcSubnets: { subnetType: props.subnetType },
      role: ec2Role,
      blockDevices: props.ebsVolumeSize
        ? [
            {
              deviceName: '/dev/sda1', // Root volume
              volume: ec2.BlockDeviceVolume.ebs(40, {
                volumeType: ec2.EbsDeviceVolumeType.GP3,
                deleteOnTermination: true,
                encrypted: false,
              }),
            },
          ]
        : undefined,

      userData, // Add user data script to the instance
    });
    // Elastic IP only if in public subnet
    if (props.subnetType === ec2.SubnetType.PUBLIC) {
      const elasticIp = new ec2.CfnEIP(this, 'ElasticIP');
      new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
        allocationId: elasticIp.attrAllocationId, // Updated to use allocationId
        instanceId: this.instance.instanceId,
      });

      // Output Public IP
      this.publicIpOutput = new cdk.CfnOutput(this, 'InstancePublicIP', {
        value: this.instance.instancePublicIp,
        description: 'Public IP of the EC2 instance',
      });
    }

    // Output Instance ID for easy reference
    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'The ID of the EC2 instance',
    });
  }
}
