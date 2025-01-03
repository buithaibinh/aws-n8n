#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

// initialize with defaults
const app = new cdk.App();

const region: string = app.node.tryGetContext('region') || 'ap-southeast-1';
const stage: string = app.node.tryGetContext('stage') || 'dev';
const appName: string = app.node.tryGetContext('appName') || 'n8n';
const keyName: string = app.node.tryGetContext('keyName') || 'n8n-key';

const account = process.env.CDK_DEFAULT_ACCOUNT;
if (!account) {
  throw new Error('CDK_DEFAULT_ACCOUNT is not set');
}

const stackName = `${appName}-${stage}`;

const stack = new CdkStack(app, stackName, {
  env: {
    account,
    region,
  },
  tags: {
    name: appName,
    environment: stage,
  },

  stage,
  keyName
});
