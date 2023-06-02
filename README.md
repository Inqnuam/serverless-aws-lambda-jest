## Description

> Jest Integration Test for serverless-aws-lambda

### Requirements

- [serverless-aws-lambda](https://github.com/Inqnuam/serverless-aws-lambda)
- Jest

## Installation

```bash
yarn add -D serverless-aws-lambda-jest
# or
npm install -D serverless-aws-lambda-jest
```

### Recommendations

Some recommendations to speed up jest integration tests by avoiding double bundeling of your Lambdas by Jest and serverless-aws-lambda.

- Use separate jest config files for you Unit and Integration test, example:
  - `jest.it.config.js` (Integration Test)
  - `jest.ut.config.js` (Unit Test)
- Do not write your Integration Tests inside the same (sub) directory as your Lambda handlers
- Specify your Integrations Test root directory inside your `jest.it.config.js`'s `rootDir`.
- Set jestPlugin at the end of your defineConfig plugins array.

---

## Usage

use [serverless-aws-lambda's](https://github.com/Inqnuam/serverless-aws-lambda) defineConfig to import this plugin

```js
// config.js
const { defineConfig } = require("serverless-aws-lambda/defineConfig");
const { jestPlugin } = require("serverless-aws-lambda-jest");

module.exports = defineConfig({
  plugins: [
    jestPlugin({
      configFile: "./jest.it.config.js",
      oneshot: false,
      coverage: {
        outDir: "./coverage/",
        json: true,
        badge: true,
      },
    }),
  ],
});
```

### Testing async events

The plugin exposes multiple global functions to wait for handler async invokation responses.

- [sqsResponse](src/index.ts#L254)
- [snsResponse](src/index.ts#L260)
- [s3Response](src/index.ts#L266)
- [dynamoResponse](src/index.ts#L273)

Simple example of implementation for a SQS event:

```ts
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const client = new SQSClient({
  region: "eu-west-3",
  endpoint: `http://localhost:${process.env.LOCAL_PORT}/@sqs`,
});
const cmd = new SendMessageCommand({
  QueueUrl: "MyQueueName",
  MessageBody: JSON.stringify({
    hello: {
      message: "world",
      firstVisit: true,
    },
  }),
});
test("Single SQS", async () => {
  const res = await client.send(cmd);
  const handlerResponse = await sqsResponse(res.MessageId);
  expect(handlerResponse.success).toBe(true);
});
```

see [more examples](examples).

### Coverage

Supported events

- Application Load Balancer (alb)
- API Gateway (http, httpApi)
- DynamoDB Streams
- S3
- SNS
- SQS

### Notes

- serverless-aws-lambda's `LOCAL_PORT` env variable is injected into process.env of your test files which could be used to make offline request against the local server.
- Set `oneshot` option to `true` to launch Integrations Tests and exit the process after the first test sequence. Node Process will exit with `0` code, or `1` if Jest tests fails.
  - It is also possible to delay exit process by passing `{delay: secondes}` to `oneshot`.
- use `coverage` option to generate coverage result json file and svg badge.
- See an [example project](example)
