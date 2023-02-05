import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { writeFile, access, mkdir } from "fs/promises";
import path from "path";
const jest = require("jest");
const pluginDir = `${process.cwd()}/node_modules/serverless-aws-lambda-jest/`;
import { eventParser, calculateCoverage, findEndpoint } from "./utils";

interface IJestPluginOptions {
  configFile: string;
  oneshot?: boolean;
  coverage?: {
    outDir?: string;
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
          endpoints: {
            alb: [],
            apg: [],
          },
        };

        l.endpoints.forEach((e) => {
          let c: any = {
            paths: e.paths,
            methods: {},
          };
          e.methods.forEach((m) => {
            c.methods[m] = false;
          });
          lambdaConverage.endpoints[e.kind].push(c);
        });

        coverage[l.name] = lambdaConverage;

        // @ts-ignore
        l.onInvoke((event: any) => {
          const parsedEvent = eventParser(event);
          if (parsedEvent) {
            //  { path: '/lambda', method: 'GET', kind: 'apg' }
            const foundEndpoint = coverage[l.name].endpoints[parsedEvent.kind].find((x: any) => findEndpoint(x.paths, parsedEvent.path));

            if (parsedEvent.method in foundEndpoint.methods) {
              foundEndpoint.methods[parsedEvent.method] = true;
            } else if ("ANY" in foundEndpoint.methods) {
              foundEndpoint.methods.ANY = true;
            }
          }
        });
      });
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

          const coverageResult = calculateCoverage(coverage);

          if (options.coverage?.outDir) {
            const outdir = path.resolve(options.coverage.outDir);
            try {
              await access(outdir);
            } catch (error) {
              await mkdir(outdir, { recursive: true });
            }

            await writeFile(`${outdir}/jest-it-coverage.json`, JSON.stringify(coverageResult), { encoding: "utf-8" });
          }

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
