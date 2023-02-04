## Description

> Jest Integration Test for serverless-aws-lambda

### Requirements

- serverless-aws-lambda
- jest

## Installation

```bash
yarn add -D serverless-aws-lambda-jest
# or
npm install -D serverless-aws-lambda-jest
```

### Recommendations

Some recommondations to speed up jest integration tests by avoiding double bundeling of your Lambdas by Jest and serverless-aws-lambda.

- Use separate jest config files for you Unit and Integration test, example:
  - `jest.it.config.js` (Integration Test)
  - `jest.ut.config.js` (Unit Test)
- Do not write your Integration Tests inside the same (sub) directory as your Lambda handlers
- Specify your Integrations Test root directory inside your `jest.it.config.js`'s `rootDir`.

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
    }),
  ],
});
```

### Notes

- serverless-aws-lambda's `LOCAL_PORT` env variable is injected into process.env of your test files which could be used to make offline request against the local server.
- `oneshot` option could be used inside your CI/CD pipeline to launch Integrations Tests and exit the process after the first test sequence. Node Process will exit with `0` code, or `1` if Jest tests fails.
- See an [example project](example)
