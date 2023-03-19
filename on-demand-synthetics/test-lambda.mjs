import { handler } from "./lib/on-demand-canary-stack.StartCanaryLambda.js";

process.env.canaries = JSON.stringify([
  {
    name: "ondemandcanarys198edc",
    url: "https://hudak.codes",
  },
  {
    name: "ondemandcanarys8eaed6",
    url: "https://jonathanhudak.com",
  },
  {
    name: "ondemandcanarysf28bce",
    url: "https://hudak.link",
  },
]);

async function run() {
  await handler({
    token: new Date(),
  });
}

run();
