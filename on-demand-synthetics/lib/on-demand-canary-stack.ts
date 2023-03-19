import { StackProps } from "aws-cdk-lib";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import {
  Canary,
  Code,
  Runtime,
  Schedule,
  Test,
} from "@aws-cdk/aws-synthetics-alpha";

import {
  Effect,
  Policy,
  PolicyDocument,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";

import { URLS } from "./canaries";

export class OnDemandCanaryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const canaries = URLS.map(
      (URL, index) =>
        new Canary(this, `Canary-${index}`, {
          schedule: Schedule.expression("rate(0 minute)"),
          test: Test.custom({
            code: Code.fromAsset(path.join(__dirname, "./canary")),
            handler: "index.handler",
          }),
          runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_8,
          environmentVariables: {
            URL,
          },
        })
    );

    const startCanaryFunction = new lambdaNode.NodejsFunction(
      this,
      "StartCanaryLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        bundling: {
          minify: false,
          externalModules: ["@aws-sdk/*"],
          format: lambdaNode.OutputFormat.ESM,
        },
        timeout: cdk.Duration.minutes(15),
        environment: {
          canaries: JSON.stringify(
            canaries.map((canary: Canary, index) => ({
              name: canary.canaryName,
              url: URLS[index],
            }))
          ),
        },
      }
    );

    const syntheticsPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["synthetics:*"],
      resources: ["*"],
    });
    startCanaryFunction.addToRolePolicy(syntheticsPolicy);
  }
}
