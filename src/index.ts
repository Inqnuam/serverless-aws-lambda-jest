import { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
const jest = require("jest");

import { writeFile } from "fs/promises";

interface IJestPluginOptions {
  configFile: string;
}

const jestPlugin = (options: IJestPluginOptions): SlsAwsLambdaPlugin => {
  return {
    name: "jest-plugin",
    offline: {
      onReady: async function (port) {
        process.env.LOCAL_PORT = String(port);

        if (!options?.configFile) {
          throw new Error("jest config file path is required");
        }

        const confFile = require(`${process.cwd()}/${options.configFile}`);

        const jestArgs = ["--watch", "true", "--config", options.configFile, "--rootDir", ".", "--roots", "node_modules/serverless-aws-lambda-jest/"];

        if (confFile.roots) {
          const customRoots: string[] = confFile.rootDir ? confFile.roots.map((x: string) => x.replace("<rootDir>", confFile.rootDir)) : confFile.roots;

          customRoots.forEach((x) => {
            jestArgs.push("--roots", x);
          });
        } else if (confFile.rootDir) {
          jestArgs.push("--roots", confFile.rootDir);
        }

        try {
          await jest.run(jestArgs);
        } catch (error) {
          console.log(error);
          this.stop();
        }
      },
    },
    buildCallback: async function (result, isRebuild) {
      if (isRebuild) {
        writeFile("node_modules/serverless-aws-lambda-jest/watch.js", Math.random().toString());
      }
    },
  };
};

export default jestPlugin;

export { jestPlugin };
