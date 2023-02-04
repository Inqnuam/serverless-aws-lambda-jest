import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { writeFile } from "fs/promises";
import path from "path";
const jest = require("jest");
const pluginDir = `${process.cwd()}/node_modules/serverless-aws-lambda-jest/`;

interface IJestPluginOptions {
  configFile: string;
  oneshot?: boolean;
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

        const confFile = require(path.resolve(options.configFile));
        const roots = [".", pluginDir];
        if (confFile.roots) {
          roots.push(...confFile.roots);
        }
        try {
          const result = await jest.runCLI(
            {
              ...confFile,
              watch: false,
              watchAll: !options.oneshot,
              roots,
            },
            ["."]
          );
          if (options.oneshot) {
            this.stop();
            process.exit(result.results.success ? 0 : 1);
          }
        } catch (error) {
          console.log(error);
          this.stop();
          process.exit(1);
        }
      },
    },
    buildCallback: async function (result, isRebuild) {
      if (isRebuild) {
        writeFile(`${pluginDir}/watch.js`, Math.random().toString());
      }
    },
  };
};

export default jestPlugin;
export { jestPlugin };
