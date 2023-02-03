## Description

> Jest TI for serverless-aws-lambda

# Installation

```bash
yarn add -D serverless-aws-lambda-jest
# or
npm install -D serverless-aws-lambda-jest
```

## Usage

use [serverless-aws-lambda's](https://github.com/Inqnuam/serverless-aws-lambda) defineConfig to import this plugin

```js
// config.js
const { defineConfig } = require("serverless-aws-lambda/defineConfig");
const { jestPlugin } = require("serverless-aws-lambda-jest");

module.exports = defineConfig({
  plugins: [jestPlugin({ configFile: "./jest.config.js" })],
});
```
