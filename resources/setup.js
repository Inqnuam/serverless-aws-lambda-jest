const http = require("http");

const SERVER_URL = `http://localhost:${process.env.LOCAL_PORT}/__jest_plugin`;

async function __jest_req(query) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}?${query}`, (res) => {
      let data;

      res.on("data", (chunk) => {
        data = typeof data == "undefined" ? chunk : Buffer.concat([data, chunk]);
      });

      res.on("end", () => {
        const returnResponse = res.statusCode == 200 ? resolve : reject;
        let content;

        try {
          if (data) {
            content = data.toString();
            content = JSON.parse(content);
          }
        } catch (error) {}
        returnResponse(content);
      });
    });
  });
}

global.sqsResponse = async (id, lambdaName) => {
  let query = `kind=sqs&id=${id}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }
  return __jest_req(query);
};

global.snsResponse = async (id, lambdaName) => {
  let query = `kind=sns&id=${id}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }

  return __jest_req(query);
};

global.dynamoResponse = async (identifier, lambdaName) => {
  let sortedKeys = {};
  Object.keys(identifier)
    .sort()
    .forEach((x) => {
      const value = identifier[x];
      const attribType = Object.keys(value)[0];

      if (typeof value[attribType] != "string") {
        value[attribType] = String(value[attribType]);
      }
      sortedKeys[x] = value;
    });

  let query = `kind=ddb&id=${JSON.stringify(sortedKeys)}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }

  return __jest_req(query);
};
