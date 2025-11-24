import { FlatCompat } from '@eslint/eslintrc';
import nextConfig from 'eslint-config-next';
import eslintConfigPrettier from 'eslint-config-prettier';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...nextConfig,
  eslintConfigPrettier,
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'build/**', 'out/**'],
  },
];

export default eslintConfig;
