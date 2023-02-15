#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OnDemandCanaryStack } from '../lib/on-demand-canary-stack';

const app = new cdk.App();
new OnDemandCanaryStack(app, 'OnDemandCanaryStack');
