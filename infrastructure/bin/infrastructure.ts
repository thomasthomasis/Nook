#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AuthStack } from '../lib/stacks/auth-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { EventStack } from '../lib/stacks/event-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { IdentityStack } from '../lib/stacks/identity-stack';

const app = new cdk.App();
const authStack = new AuthStack(app, 'nook-dev-auth', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const databaseStack = new DatabaseStack(app, "nook-dev-database", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const eventStack = new EventStack(app, "nook-dev-events", {
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
apiStack.addStackDependency(authStack);

new StorageStack(app, "nook-dev-storage", {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

const monitoringStack = new MonitoringStack(app, "nook-dev-monitoring", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  eventBus: eventStack.eventBus,
});
monitoringStack.addStackDependency(eventStack);

const identityStack = new IdentityStack(app, "nook-dev-identity", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION
  },
  vpc: databaseStack.vpc,
  databaseSecurityGroup: databaseStack.databaseSecurityGroup, 
  databaseSecret: databaseStack.cluster.secret!,
  eventBus: eventStack.eventBus,
  httpApiId: apiStack.httpApi.httpApiId,
  authorizerId: apiStack.authorizerId,
});
identityStack.addStackDependency(databaseStack);
identityStack.addStackDependency(eventStack);
identityStack.addStackDependency(apiStack);

