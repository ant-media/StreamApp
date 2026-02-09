// ESLint flat config
// Requires ESLint v9+
import js from '@eslint/js';
import ts from 'typescript-eslint';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPromise from 'eslint-plugin-promise';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  eslintConfigPrettier,
  {
    name: 'webrtc-sdk/ts',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      import: eslintPluginImport,
      promise: eslintPluginPromise,
      prettier: eslintPluginPrettier,
      'unused-imports': eslintPluginUnusedImports,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'import/no-unresolved': 'off',
      'promise/no-nesting': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always'
        }
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ]
    },
    
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    ignores: ['dist', 'node_modules', 'examples', 'test']
  }
]; 