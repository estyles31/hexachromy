/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,

  parser: "@typescript-eslint/parser",

  parserOptions: {
    project: ["./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },

  plugins: ["@typescript-eslint"],

  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],

  rules: {
    // Turn off noise. You can tighten later.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "react-hooks/exhaustive-deps": "off",
  },

  ignorePatterns: ["node_modules/", "dist/", "lib/", "build/", ".eslintrc.cjs"],
};
