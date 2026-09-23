import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      '.vscode-test/**',
      'src/generated/**',
      'site/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      curly: 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // User expressions are evaluated as JavaScript and may produce anything, so the
      // `any`/`unknown` boundaries around evaluation are deliberate and documented.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Ambient declarations describing the globals available in a scratch file. They are
    // shipped verbatim into a directory with no `node_modules`, so the triple-slash
    // reference is the only form that resolves there.
    files: ['src/usertypes/**/*.ts', 'src/usertypes/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    // The esbuild driver runs under plain `node`, before anything is compiled.
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
)
