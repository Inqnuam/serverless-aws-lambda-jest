export const eventParser = (event: any) => {
  let parsedEvent: any = {
    path: event.path ?? event.requestContext?.http?.path,
    method: event.httpMethod ?? event.requestContext?.http?.method,
    kind: event?.requestContext?.elb ? "alb" : event.requestContext?.accountId ? "apg" : null,
  };
  if (parsedEvent.kind) {
    return parsedEvent;
  }
};

export const findEndpoint = (paths: string[], reqPath: string) => {
  const found = paths.includes(reqPath);

  if (found) {
    return true;
  } else {
    const found = paths.find((p) => {
      const AlbAnyPathMatch = p.replace(/\*/g, ".*").replace(/\//g, "\\/");
      const ApgPathPartMatch = p.replace(/\{[\w.:-]+\+?\}/g, ".*").replace(/\//g, "\\/");

      const AlbPattern = new RegExp(`^${AlbAnyPathMatch}$`, "g");
      const ApgPattern = new RegExp(`^${ApgPathPartMatch}$`, "g");

      return AlbPattern.test(reqPath) || ApgPattern.test(reqPath);
    });
    return found;
  }
};

export const calculateCoverage = (coverage: any) => {
  let total = 0;
  let success = 0;
  let result: any = {};
  for (const [lambdaName, v] of Object.entries(coverage)) {
    result[lambdaName] = {};
    const { alb, apg } = (v as unknown as any).endpoints;

    if (alb) {
      let albTotal = 0;
      let albSuccess = 0;
      alb.forEach((a) => {
        const values = Object.values(a.methods);
        albTotal += values.length;
        albSuccess += values.filter((x) => x === true).length;
      });
      total += albTotal;
      success += albSuccess;

      result[lambdaName].alb = {
        total: albTotal,
        success: albSuccess,
      };
    }

    if (apg) {
      let apgTotal = 0;
      let apgSuccess = 0;

      apg.forEach((a) => {
        const values = Object.values(a.methods);

        apgTotal += values.length;
        apgSuccess += values.filter((x) => x === true).length;
      });

      total += apgTotal;
      success += apgSuccess;

      result[lambdaName].apg = {
        total: apgTotal,
        success: apgSuccess,
      };
    }
  }

  return {
    total,
    success,
    coverage: Math.round((success / total) * 100),
    result,
  };
};
