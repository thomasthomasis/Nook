#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AuthStack } from '../lib/stacks/auth-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { EventStack } from '../lib/stacks/event-stack';
import { ApiStack } from '../lib/stacks/api-stack';

const app = new cdk.App();
const authStack = new AuthStack(app, 'nook-dev-auth', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new DatabaseStack(app, "nook-dev-database", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new EventStack(app, "nook-dev-events", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const apiStack = new ApiStack(app, "nook-dev-api", {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION,
  },
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});
apiStack.addStackDependency(authStack)