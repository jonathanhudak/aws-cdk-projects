import {
  SyntheticsClient,
  StartCanaryCommand,
  UpdateCanaryCommand,
  GetCanaryCommand,
  GetCanaryRunsCommand,
} from "@aws-sdk/client-synthetics";

const syntheticsClient = new SyntheticsClient({});

interface HandlerEvent {
  token: string;
}

const DEFAULT_CANARY_STATUS = "UNKNOWN";

async function waitForCanaryToBeReady(canaryName: string) {
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-synthetics/enums/canarystate.html
  let canaryStatus = "UNKNOWN";
  let getCanaryResponse;
  while (canaryStatus !== "STOPPED" && canaryStatus !== "READY") {
    getCanaryResponse = await syntheticsClient.send(
      new GetCanaryCommand({
        Name: canaryName,
      })
    );

    canaryStatus =
      getCanaryResponse?.Canary?.Status?.State ?? DEFAULT_CANARY_STATUS;

    console.log(`"${canaryName}" canaryStatus: ${canaryStatus}`);

    // Wait for a few seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`Canary "${canaryName}" is ready to run!`);
}

async function waitForCanaryTestToComplete(canaryName: string) {
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-synthetics/enums/canaryrunstate.html
  let canaryRunStatus = null;

  while (canaryRunStatus !== "PASSED" && canaryRunStatus !== "FAILED") {
    const getCanaryRunResponse = await syntheticsClient.send(
      new GetCanaryRunsCommand({
        Name: canaryName,
      })
    );

    const [lastRun] = getCanaryRunResponse.CanaryRuns ?? [];
    canaryRunStatus = lastRun?.Status?.State ?? null;

    console.log(`"${canaryName}" canaryRunStatus: ${canaryRunStatus}`);
    // Wait for a few seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `Canary run for "${canaryName}" has completed with status "${canaryRunStatus}"`
  );
}

export const handler = async (event: HandlerEvent) => {
  const canaries = JSON.parse(process.env.canaries || "[]");
  const token = event.token;
  console.info("event", event);

  const canaryPromises = canaries.map(
    async ({ name: canaryName, url }: { name: string; url: string }) => {
      await waitForCanaryToBeReady(canaryName);

      // Update the canary environment variables
      await syntheticsClient.send(
        new UpdateCanaryCommand({
          Name: canaryName,
          RunConfig: {
            EnvironmentVariables: {
              TOKEN: token,
              URL: url,
            },
          },
        })
      );

      // Poll the GetCanary command to check the status of the canary until it's ready to run
      await waitForCanaryToBeReady(canaryName);

      await syntheticsClient.send(
        new StartCanaryCommand({
          Name: canaryName,
        })
      );

      await waitForCanaryTestToComplete(canaryName);
    }
  );

  // Wait for all canaries to finish starting and become ready
  await Promise.all(canaryPromises);

  return {
    success: true,
  };
};
