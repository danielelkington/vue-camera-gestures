module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-recommended",
    "prettier",
    "prettier/vue",
  ],
  rules: {
    'semi': ['error', 'never']
  },
  env: {
    browser: true,
    node: true
  }
}