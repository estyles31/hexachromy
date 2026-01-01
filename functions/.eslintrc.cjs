module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ["../.eslintrc.cjs"],  
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./functions/tsconfig.json", "./functions/tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    // Functions-specific rules here
    "@typescript-eslint/no-misused-promises": "off",
  },
};
