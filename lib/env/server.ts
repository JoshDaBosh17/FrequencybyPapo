export const IS_SERVER_TEST_MODE =
  process.env.TEST_MODE === "true" || process.env.NEXT_PUBLIC_TEST_MODE === "true";
