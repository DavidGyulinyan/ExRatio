// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['components/ui/icon-symbol.tsx', 'components/ui/icon-symbol.ios.tsx'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
