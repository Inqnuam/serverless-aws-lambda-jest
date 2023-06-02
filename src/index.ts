import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { accessSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { calculateCoverage, handleInvoke } from "./utils";
import { generateBadge } from "./badge";
import { TestRequestListener } from "./requestListener";
import type { supportedService } from "./requestListener";
// @ts-ignore
import { actualDirName, jest, readInitialOptions } from "resolvedPaths";

const cwd = process.cwd();
const setupFile = `${actualDirName.slice(0, -5)}/resources/setup.js`;
const coverage: any = {};

interface IJestPluginOptions {
  configFile: string;
  oneshot?: boolean | { delay: number };
  coverage?: {
    outDir: string;
    json?: boolean;
    badge?: boolean;
  };
}

const jestPlugin = (options: IJestPluginOptions): SlsAwsLambdaPlugin => {
  const eventListener = new TestRequestListener();
  let outdir = `${cwd}/.aws_lambda/`;
  const getOutDir = {
    name: "jest-get-outdir",
    setup: async (build) => {
      if (build.initialOptions.outdir) {
        outdir = path.resolve(build.initialOptions.outdir);
      }
    },
  };
  return {
    name: "jest-plugin",
    onInit: function () {
      if (Array.isArray(this.config.esbuild.plugins)) {
        this.config.esbuild.plugins.push(getOutDir);
      } else {
        this.config.esbuild.plugins = [getOutDir];
      }
      this.lambdas.forEach((l) => {
        const lambdaConverage = {
          done: false,
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
            done: false,
            event: sns,
          });
        });
        l.sqs.forEach((sqs) => {
          lambdaConverage.sqs.push({
            done: false,
            event: sqs,
          });
        });
        l.ddb.forEach((ddb) => {
          lambdaConverage.ddb.push({
            done: false,
            event: ddb,
          });
        });
        l.s3.forEach((s3) => {
          lambdaConverage.s3.push({
            done: false,
            event: s3,
          });
        });

        coverage[l.name] = lambdaConverage;

        l.onInvoke((event, info) => {
          if (!event || !info) {
            return;
          }
          handleInvoke(coverage[l.name], event, info);
        });

        l.onInvokeSuccess((input, output, info) => {
          if (input && typeof input == "object" && info) {
            const kind: supportedService = info.kind;
            if (eventListener.support.has(kind)) {
              eventListener.handleInvokeResponse(kind, l.name, input, output, true);
            }
          }
        });

        l.onInvokeError((input, error, info) => {
          if (input && typeof input == "object" && info) {
            const kind: supportedService = info.kind;
            if (eventListener.support.has(kind)) {
              eventListener.handleInvokeResponse(kind, l.name, input, error, false);
            }
          }
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
            writeFileSync(`${outdir}/jest-it-coverage.json`, JSON.stringify(coverageResult, null, 2), { encoding: "utf-8" });
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
      request: [
        {
          filter: "/__jest_plugin/",
          callback: async function (req, res) {
            const { searchParams } = new URL(req.url, "http://localhost:3000");

            const kind = searchParams.get("kind") as supportedService;
            const id = searchParams.get("id");
            const lambdaName = searchParams.get("lambdaName");

            const listener = (success: boolean, output: any, foundLambdaName: string) => {
              if (!success) {
                res.statusCode = 400;
              }

              if (!lambdaName || lambdaName == foundLambdaName) {
                eventListener.removeListener(id, listener);
                res.end(output ? JSON.stringify(output) : undefined);
              }
            };
            eventListener.on(id, listener);

            const foundEvent = eventListener.getPendingRequest(kind, id, lambdaName);
            if (foundEvent) {
              eventListener.removeListener(id, listener);
              const output = foundEvent.error ?? foundEvent.output;
              if (foundEvent.error) {
                res.statusCode = 400;
              }
              res.end(output ? JSON.stringify(output) : undefined);
            } else {
              eventListener.registerRequest(kind, id, lambdaName);
            }
          },
        },
      ],
      onReady: async function (port) {
        process.env.LOCAL_PORT = String(port);

        if (!options?.configFile) {
          throw new Error("jest config file path is required");
        }

        const confFilePath = path.resolve(options.configFile);
        const { config } = await readInitialOptions(confFilePath);

        const setupFiles = config.setupFiles ?? [];
        setupFiles.push(setupFile);
        config.setupFiles = setupFiles;
        if (options.oneshot) {
          config.watch = false;
          config.watchAll = false;
        }

        if (!config.rootDir) {
          throw new Error("jest config must include 'rootDir'");
        }

        const initialRootDir = config.rootDir;
        config.rootDir = ".";
        const roots = [initialRootDir];
        if (config.roots) {
          roots.push(...config.roots.map((x) => path.join(initialRootDir, x)));
        }
        roots.push(outdir);
        config.roots = roots;

        const startTestRunner = async () => {
          try {
            const result = await jest.runCLI(config, [config.rootDir]);

            if (options.oneshot) {
              let timeout = 0;

              if (typeof options.oneshot == "object" && options.oneshot.delay) {
                timeout = options.oneshot.delay * 1000;
              }

              setTimeout(() => {
                this.stop();
                process.exit(result.results.success ? 0 : 1);
              }, timeout);
            }
          } catch (error) {
            console.error(error);
            this.stop();
            process.exit(1);
          }
        };

        const ddbPlugin = this.options.plugins?.find((x: SlsAwsLambdaPlugin) => x.name == "ddblocal-stream") as SlsAwsLambdaPlugin;

        if (ddbPlugin) {
          console.log("Waiting for DynamoDB Local Streams plugin to initialize...");
          ddbPlugin.pluginData.onReady(startTestRunner);
        } else {
          await startTestRunner();
        }
      },
    },
  };
};

declare global {
  /**
   * @param {string} messageId MessageId returned by AWS SDK SQS Client's `SendMessageCommand` or from `SendMessageBatchCommand`'s Success MessageId.
   * @param {string} lambdaName consumer name if SQS will be consumed by multiple Lambdas.
   */
  const sqsResponse: (messageId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {string} messageId MessageId returned by AWS SDK SNS Client's `PublishCommand` or from `PublishBatchCommand`'s Success MessageId.
   * @param {string} lambdaName consumer name if SNS will be consumed by multiple Lambdas.
   */
  const snsResponse: (messageId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {string} requestId requestId returned by AWS SDK S3 Client's send() response `$metadata`.
   * @param {string} lambdaName consumer name if S3 event will be consumed by multiple Lambdas.
   */
  const s3Response: (requestId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {any} identifier DynamoDB Item identifier.
   * Example: {id:{N: 12}}.
   * @param {string} lambdaName consumer name if Stream will be consumed by multiple Lambdas.
   */
  const dynamoResponse: (identifier: { [key: string]: any }, lambdaName?: string) => Promise<any>;
  /**
   * serverless-aws-lambda local server port
   */
  const LOCAL_PORT: number;
}

export default jestPlugin;
export { jestPlugin };
