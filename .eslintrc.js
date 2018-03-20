module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  extends: 'plugin:prettier/recommended',
  env: {
    node: true
  },
  rules: {
    'default-case': 'error',
    'guard-for-in': 'error',
    'no-confusing-arrow': 'error',
    'no-console': 'error',
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    eqeqeq: 'error'
  }
};
