export const findReqMethod = (event: any) => {
  return event.httpMethod ?? event.requestContext?.http?.method;
};

export const handleInvoke = (lambda: any, event: any, info: any) => {
  if (info.kind == "alb" || info.kind == "apg") {
    const foundEndpoint = lambda[info.kind].find((x) => x.paths == info.paths);
    const method = findReqMethod(event);

    if (method) {
      if (method in foundEndpoint.methods) {
        foundEndpoint.methods[method] = true;
      } else if ("ANY" in foundEndpoint.methods) {
        foundEndpoint.methods.ANY = true;
      }
    }
  } else if (info.kind == "sns") {
    const foundSns = lambda.sns.find((x) => x.event == info.event);

    if (foundSns) {
      foundSns.success = true;
    }
  } else if (info.kind == "ddb") {
    const { TableName, filterPattern } = info.event;
    // TODO: add filterPattern coverage
    const foundDdb = lambda.ddb.find((x: any) => x.event.TableName == TableName);

    if (foundDdb) {
      foundDdb.success = true;
    }
  }
};

export const calculateCoverage = (coverage: any) => {
  let total = 0;
  let success = 0;
  let result: any = {};
  for (const [lambdaName, v] of Object.entries(coverage)) {
    result[lambdaName] = {};

    const { alb, apg, sns, ddb } = v as unknown as any;

    if (alb.length) {
      let albTotal = 0;
      let albSuccess = 0;
      alb.forEach((a) => {
        const values = Object.values(a.methods);
        albTotal += values.length;
        albSuccess += values.filter((x) => x === true).length;
      });
      total += albTotal;
      success += albSuccess;
      if (albTotal) {
        result[lambdaName].alb = {
          total: albTotal,
          success: albSuccess,
          endpoints: alb,
        };
      }
    }

    if (apg.length) {
      let apgTotal = 0;
      let apgSuccess = 0;

      apg.forEach((a) => {
        const values = Object.values(a.methods);

        apgTotal += values.length;
        apgSuccess += values.filter((x) => x === true).length;
      });

      total += apgTotal;
      success += apgSuccess;

      if (apgTotal) {
        result[lambdaName].apg = {
          total: apgTotal,
          success: apgSuccess,
          endpoints: apg,
        };
      }
    }

    if (sns.length) {
      result[lambdaName].sns = {
        total: sns.length,
        success: sns.filter((x) => x.success).length,
        events: sns,
      };
      total += result[lambdaName].sns.total;
      success += result[lambdaName].sns.success;
    }

    if (ddb.length) {
      result[lambdaName].ddb = {
        total: ddb.length,
        success: ddb.filter((x) => x.success).length,
        events: ddb,
      };
      total += result[lambdaName].ddb.total;
      success += result[lambdaName].ddb.success;
    }
  }

  return {
    total,
    success,
    coverage: Math.round((success / total) * 100),
    result,
  };
};
