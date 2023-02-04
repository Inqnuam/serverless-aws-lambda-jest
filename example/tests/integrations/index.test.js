const { expect, test } = require("@jest/globals");
const axios = require("axios");

const { LOCAL_PORT } = process.env;

test("test myAwsomeLambda response", async () => {
  const res = await axios.get(`http://localhost:${LOCAL_PORT}/lambda?a=1&b=1`);
  expect(res.status).toBe(200);

  expect(res.data).toBe(2);
});
