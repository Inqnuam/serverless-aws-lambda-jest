import calculator from "../lib/calculator";

export default async (event: any) => {
  const { a, b } = event.queryStringParameters;

  if (!a || !b) {
    return {
      statusCode: 400,
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(calculator(a, b)),
  };
};
