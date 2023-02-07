import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { writeFile } from "fs/promises";
import { accessSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
const jest = require("jest");
const pluginDir = `${process.cwd()}/node_modules/serverless-aws-lambda-jest/`;
import { calculateCoverage, handleInvoke } from "./utils";
import { generateBadge } from "./badge";

interface IJestPluginOptions {
  configFile: string;
  oneshot?: boolean;
  coverage?: {
    outDir: string;
    json?: boolean;
    badge?: boolean;
  };
}

const coverage: any = {};
const jestPlugin = (options: IJestPluginOptions): SlsAwsLambdaPlugin => {
  return {
    name: "jest-plugin",
    onInit: function () {
      this.lambdas.forEach((l) => {
        const lambdaConverage = {
          success: false,
          coverage: 0,
          alb: [],
          apg: [],
          s3: [],
          sns: [],
          sqs: [],
          ddb: [],
        };

        l.endpoints.forEach((e) => {
          let c: any = {
            paths: e.paths,
            methods: {},
          };
          e.methods.forEach((m) => {
            c.methods[m] = false;
          });
          lambdaConverage[e.kind].push(c);
        });

        l.sns.forEach((sns) => {
          lambdaConverage.sns.push({
            success: false,
            event: sns,
          });
        });
        l.ddb.forEach((ddb) => {
          lambdaConverage.ddb.push({
            success: false,
            event: ddb,
          });
        });

        coverage[l.name] = lambdaConverage;

        // @ts-ignore
        l.onInvoke((event: any, info: any) => {
          if (!event || !info) {
            return;
          }
          handleInvoke(coverage[l.name], event, info);
        });
      });
    },
    onExit: function (code) {
      if (options.coverage) {
        if (options.coverage.outDir) {
          const coverageResult = calculateCoverage(coverage);

          const outdir = path.resolve(options.coverage.outDir);

          try {
            accessSync(outdir);
          } catch (error) {
            mkdirSync(outdir, { recursive: true });
          }

          if (options.coverage.json) {
            writeFileSync(`${outdir}/jest-it-coverage.json`, JSON.stringify(coverageResult), { encoding: "utf-8" });
          }
          if (options.coverage.badge) {
            writeFileSync(`${outdir}/jest-it-coverage.svg`, generateBadge(coverageResult.coverage), { encoding: "utf-8" });
          }
        } else {
          console.log("coverage 'outDir' is required");
        }
      }
    },
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
