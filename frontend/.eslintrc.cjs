module.exports = {
  extends: ["../.eslintrc.cjs", "plugin:react-hooks/recommended"],
  env: {
    browser: true,
  },

  rules: {
    "react-hooks/exhaustive-deps": "off",
  },
};
