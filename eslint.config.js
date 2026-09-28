const nextCoreWebVitals = require('eslint-config-next/core-web-vitals')

module.exports = [
  ...nextCoreWebVitals,
  {
    settings: {
      react: { version: '19.2' },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
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
    files: ['src/datos/diagnostico-*.ts', 'src/datos/semilla.ts', 'tests/**/*.ts', 'scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/seo/imagen-og.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/datos/migraciones/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'capturas/**',
      'graphify-out/**',
      '.claude/**',
      'next-env.d.ts',
    ],
  },
]
