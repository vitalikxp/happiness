// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Import-boundary groups (see docs/ARCHITECTURE.md §2). */
const layer = (name) => ({
  group: [`**/${name}`, `**/${name}/**`],
  message: `Layer boundary: ${name}/ is not allowed here.`,
});
const uiFramework = {
  group: ['preact', 'preact/**', '@preact/**', 'react', 'react/**', 'react-dom', 'react-dom/**'],
  message: 'UI framework imports belong to src/ui/ only.',
};
const nodeBuiltins = {
  group: ['node:*', 'fs', 'path', 'os', 'child_process', 'worker_threads'],
  message: 'Node APIs belong to src/sim/ (CLI tools) only.',
};
const restrictImports = (...patterns) => ['error', { patterns }];

/** Engine and bots must be deterministic: randomness only via the seeded RNG (AGENTS.md rule 2). */
const determinism = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded RNG from game state.' },
  ],
  'no-restricted-globals': [
    'error',
    ...[
      'Date',
      'performance',
      'setTimeout',
      'setInterval',
      'window',
      'document',
      'localStorage',
      'fetch',
    ].map((name) => ({ name, message: 'Engine/bots must be pure: no time, timers, DOM or I/O.' })),
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-restricted-imports': restrictImports(layer('sim'), nodeBuiltins) },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      ...determinism,
      'no-restricted-imports': restrictImports(
        layer('ui'),
        layer('ai'),
        layer('sim'),
        uiFramework,
        nodeBuiltins,
      ),
    },
  },
  {
    files: ['src/ai/**/*.ts'],
    rules: {
      ...determinism,
      'no-restricted-imports': restrictImports(
        layer('ui'),
        layer('sim'),
        uiFramework,
        nodeBuiltins,
      ),
    },
  },
  {
    files: ['src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(layer('ui'), layer('ai'), layer('sim'), uiFramework),
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-imports': restrictImports(layer('ui'), uiFramework) },
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        layer('ui'),
        layer('engine'),
        layer('ai'),
        layer('sim'),
        layer('content'),
        uiFramework,
      ),
    },
  },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
