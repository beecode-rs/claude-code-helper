import eslintJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noLoops from 'eslint-plugin-no-loops'
import sortKeysFix from 'eslint-plugin-sort-keys-fix'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import eslintPluginImport from 'eslint-plugin-import'
import globals from 'globals'

const namingConvention = () => {
  return [
    { format: null, leadingUnderscore: 'forbid', modifiers: ['public'], selector: ['default'] },
    { format: ['camelCase'], leadingUnderscore: 'require', modifiers: ['protected'], selector: ['default'] },
    { format: ['camelCase'], modifiers: ['private'], prefix: ['__'], selector: ['default'] },
    { format: ['camelCase'], leadingUnderscore: 'forbid', modifiers: ['public'], selector: ['accessor'] },
    { format: ['camelCase'], leadingUnderscore: 'require', modifiers: ['protected'], selector: ['accessor'] },
    { format: ['camelCase'], modifiers: ['private'], prefix: ['__'], selector: ['accessor'] },
    { format: ['PascalCase'], selector: ['enum'] },
    { format: ['UPPER_CASE'], selector: ['enumMember'] },
    {
      format: ['PascalCase'],
      leadingUnderscore: 'forbid',
      modifiers: ['public', 'static'],
      selector: ['classMethod', 'accessor'],
    },
    {
      format: ['PascalCase'],
      leadingUnderscore: 'require',
      modifiers: ['protected', 'static'],
      selector: ['classMethod', 'accessor'],
    },
    { format: ['UPPER_CASE'], modifiers: ['public', 'static'], selector: ['classProperty'] },
    {
      format: ['camelCase'],
      leadingUnderscore: 'allowSingleOrDouble',
      selector: ['objectLiteralProperty', 'objectLiteralMethod'],
    },
  ]
}

const sharedRules = {
  '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],
  '@typescript-eslint/no-misused-spread': 'warn',
  '@typescript-eslint/consistent-type-definitions': 'off',
  '@typescript-eslint/dot-notation': 'off',
  '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
  '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
  '@typescript-eslint/naming-convention': ['error', ...namingConvention()],
  '@typescript-eslint/no-empty-interface': 'off',
  '@typescript-eslint/no-floating-promises': ['error'],
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-return': 'warn',
  '@typescript-eslint/no-unsafe-argument': 'warn',
  '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
  curly: 'error',
  'import/namespace': [
    'error',
    {
      allowComputed: true,
    },
  ],
  'import/newline-after-import': 'error',
  'import/no-unresolved': 'off',
  'import/order': [
    'error',
    {
      alphabetize: {
        caseInsensitive: false,
        order: 'asc',
      },
      groups: [['index', 'sibling', 'parent', 'internal', 'external', 'builtin', 'object']],
      'newlines-between': 'always',
    },
  ],
  'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
  'no-confusing-arrow': 'error',
  'no-console': 'error',
  'no-constant-condition': 'error',
  'no-duplicate-imports': 'error',
  'no-loops/no-loops': 'error',
  'no-mixed-spaces-and-tabs': 'error',
  'no-only-tests/no-only-tests': 'error',
  'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: false }],
  'padding-line-between-statements': [
    'error',
    { blankLine: 'always', next: 'return', prev: '*' },
    { blankLine: 'always', next: ['cjs-export', 'export'], prev: '*' },
  ],
  'prefer-arrow-callback': 'error',
  'prefer-template': 'error',
  'sort-imports': [
    'error',
    {
      ignoreDeclarationSort: true,
    },
  ],
  'sort-keys-fix/sort-keys-fix': ['error', 'asc', { caseSensitive: false, natural: true }],
}

export default defineConfig([
  globalIgnores([
    '.history',
    'coverage/*',
    'dist/*',
    'eslint.config.js',
    'out/*',
    'node_modules/*',
    'resource/*',
    'scripts/*',
    'src/**/__mocks__/*',
    'src/**/*.d.ts',
    'src/**/*.d.ts.map',
    'src/**/*.js',
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'storybook-static/*',
    'test/*',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.config.contract.ts',
  ]),
  { files: ['**/*.{js,mjs,cjs,ts,tsx}'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  { files: ['**/*.{js,mjs,cjs,ts,tsx}'], plugins: { eslintJs }, extends: ['eslintJs/recommended'] },
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'no-loops': noLoops,
      'no-only-tests': noOnlyTests,
      'no-relative-import-paths': noRelativeImportPaths,
      'sort-keys-fix': sortKeysFix,
      import: eslintPluginImport,
    },
    files: ['**/*.{ts,tsx}'],
    rules: sharedRules,
    settings: {
      'import/resolver': {
        node: {
          paths: ['./'],
        },
      },
    },
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-ternary': 'error',
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-ternary': 'warn',
    },
  },
])
