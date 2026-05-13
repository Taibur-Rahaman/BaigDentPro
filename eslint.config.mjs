import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

const practiceDtoImportMessage =
  'Practice transport DTO modules are blocked outside src/viewModels, src/lib/core, and src/api.ts — use view models, ReturnType<typeof api...>, or mapPracticeDtoToVm.';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'server/dist/**',
      '**/node_modules/**',
      'vite.config.mts',
      '*.config.js',
      '*.config.mjs',
      'src/**/*.extract.tsx',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/types/practicePatients', message: practiceDtoImportMessage },
            { name: '@/types/practiceAppointments', message: practiceDtoImportMessage },
            { name: '@/types/practicePrescriptions', message: practiceDtoImportMessage },
            { name: '@/types/practiceBilling', message: practiceDtoImportMessage },
            { name: '@/types/practicePatientWorkspace', message: practiceDtoImportMessage },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/types/practicePatients', message: practiceDtoImportMessage },
            { name: '@/types/practiceAppointments', message: practiceDtoImportMessage },
            { name: '@/types/practicePrescriptions', message: practiceDtoImportMessage },
            { name: '@/types/practiceBilling', message: practiceDtoImportMessage },
            { name: '@/types/practicePatientWorkspace', message: practiceDtoImportMessage },
            {
              name: '@/api',
              message:
                'Components must use hooks + thin api facade from pages/hooks — do not call @/api from shared components.',
            },
          ],
          patterns: [
            {
              group: ['./api', '../api', '../../api'],
              message:
                'Components must use hooks rather than importing the legacy api singleton from relative paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/viewModels/**/*.{ts,tsx}', 'src/lib/core/**/*.{ts,tsx}', 'src/api.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['server/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/api.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
);
