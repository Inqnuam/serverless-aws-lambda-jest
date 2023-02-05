const { defineConfig } = require("serverless-aws-lambda/defineConfig");
const { jestPlugin } = require("serverless-aws-lambda-jest");
const oneshot = process.argv.includes("oneshot");

module.exports = defineConfig({
  plugins: [
    jestPlugin({
      configFile: "./jest.it.config.js",
      oneshot,
      coverage: {
        outDir: "./coverage/",
      },
    }),
  ],
});
