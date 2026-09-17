const { FlatCompat } = require('@eslint/eslintrc')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

const compat = new FlatCompat()

module.exports = [
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Use const objects instead of enums.' },
      ],
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/datos/migraciones/**',
      'coverage/**',
      'playwright-report/**',
    ],
  },
]
