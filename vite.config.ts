import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ignorePatterns: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'dist/**',
      'package-lock.json',
    ],
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    sortTailwindcss: {
      stylesheet: './app/globals.css',
      functions: ['clsx', 'cn'],
    },
  },
  lint: {
    ignorePatterns: ['.next/**', 'out/**', 'node_modules/**', 'dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    '*.{js,jsx,ts,tsx,mjs,cjs,json,md,mdx,css,yml,yaml}': 'vp check --fix',
  },
});
