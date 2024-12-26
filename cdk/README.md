# Linux EC2 Instance Deployment

This project deploys a Linux-based EC2 instance using AWS CDK. The instance is configured with custom security group rules, IAM role, and optional block devices.

## Prerequisites

1. **AWS CLI**: Ensure the AWS CLI is installed and configured with the correct credentials and region. You can install it by following the instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).

   Set up your AWS CLI credentials by running:

   ```bash
   aws configure
   ```

2. AWS CDK: Install AWS CDK globally if you haven't already:

   ```bash
   npm install -g aws-cdk
   ```

3. **Node.js**: Ensure Node.js is installed on your machine. You can download it [here](https://nodejs.org/).
4. Create an EC2 Key Pair: You need a key pair to access the EC2 instance. You can create a key pair using the AWS CLI or AWS Management Console:

- **Using AWS CLI:**

  ```bash
  aws ec2 create-key-pair --key-name my-key-pair --query 'KeyMaterial' --output text > my-key-pair.pem
  chmod 400 my-key-pair.pem
  ```

- **Using AWS Management Console:** Go to EC2 Dashboard > Key Pairs > Create Key Pair.

## Project Setup

1.  Clone the repository (or copy the LinuxEc2Instance code into a project folder):

    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  Install the project dependencies:

    ```bash
    npm install
    ```

## Stack Configuration

The EC2 instance is customizable through the LinuxEc2InstanceProps interface, which accepts various parameters such as:

- **instanceType**: The EC2 instance type (default: t2.micro).
- **amiId**: The ID of the Amazon Machine Image (AMI) to use. Example: 'ami-0c55b159cbfafe1f0'. You can find the AMI ID for your region [here](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html). Make sure the AMI is available in your region.
- **keyName**: The name of the EC2 key pair to associate with the instance.
- **securityGroupRules**: An array of custom security group rules to apply to the instance. Each rule should have the following properties:
  - **port**: The port number to allow traffic on.
  - **description**: A description for the security group rule.
  - **allowedIps**: An array of IP ranges to allow traffic from. Example: ['203.0.113.1/32']
- **vpcId**: Optional, specify a custom VPC if needed.
- **rolePolicyStatements**: Optional IAM policy statements for the instance's role.
- **ebsVolumeSize**: Optional size of the EBS volume to attach

You can modify these settings directly in the LinuxEc2InstanceProps when instantiating the construct in your CDK app.

## Deploying the Stack

1. Bootstrap the environment (if not already bootstrapped):

   CDK requires bootstrapping in your AWS environment before deployment. Run the following command:

   ```bash
   cdk bootstrap
   ```

2. Deploy the stack:

   ```bash
   cdk deploy
   ```

   This command will deploy the stack in your AWS account. Once the deployment is complete, you will see the output containing the public IP address of the EC2 instance.

## Verifying the Deployment

1. **Check the Outputs:**

   After a successful deployment, CDK will output the Public IP of the EC2 instance. You can also check this in the AWS Console.

2. **SSH into the EC2 Instance:**

   Use the key pair you created earlier to SSH into the instance:

   ```bash
    ssh -i my-key-pair.pem ubuntu@<public-ip> # For Ubuntu AMI
    ssh -i my-key-pair.pem ec2-user@<public-ip> # For Amazon Linux AMI
    ssh -i my-key-pair.pem centos@<public-ip> # For CentOS AMI
    ssh -i my-key-pair.pem admin@<public-ip> # For Debian AMI
   ```

   Replace <Public-IP> with the public IP address from the stack output. Note that the username may vary depending on the AMI used. If you are using an Amazon Linux AMI, the username is `ec2-user`, `ubuntu` for Ubuntu AMIs, `centos` for CentOS AMIs and `admin` for Debian AMIs.

## Destroying the Stack

If you want to remove the resources created by this stack, run the following command:

```bash
cdk destroy
```

## Important Notes

- **Costs:** This project may incur charges on your AWS account. It is your responsibility to monitor the resources created and destroy them when not in use to avoid any charges.
- **Security Groups** Ensure that your security group rules are configured correctly. For example, only allow SSH access from trusted IP addresses.
- **Key Pair** Keep the `.pem` file secure and do not share it. If you lose the key pair, you will not be able to SSH into the instance.

## Customization

You can customize the `LinuxEc2Instance` construct by providing different values in the `LinuxEc2InstanceProps` interface. For example, you can change the instanceType, use a different amiId, or add custom IAM policies.

### Example Custom Deployment

To deploy an instance with a specific configuration, modify the props in the CDK stack file:

```typescript
const ec2Instance = new LinuxEc2Instance(this, 'MyLinuxInstance', {
  instanceType: 't3.micro',
  amiId: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 AMI for us-east-1
  keyName: 'myKeyPair',
  securityGroupRules: [
    { port: 22, description: 'Allow SSH', allowedIps: ['203.0.113.1/32'] },
    { port: 80, description: 'Allow HTTP from anywhere' },
  ],
  subnetType: ec2.SubnetType.PUBLIC,
  ebsVolumeSize: 20, // Attach a 20 GiB EBS volume
});
```

## License

Copyright (c) 2024, SK-Global. All Rights Reserved.
