// @ts-check
/**
 * ESLint flat config (ESLint v9+).
 *
 * - Lints TypeScript with typescript-eslint.
 * - Enforces JSDoc on (almost) all functions/classes via eslint-plugin-jsdoc.
 *
 * Notes:
 * - ESLint's built-in `require-jsdoc`/`valid-jsdoc` rules were removed in ESLint v9.
 *   We use `eslint-plugin-jsdoc` instead.
 */

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { jsdoc } from 'eslint-plugin-jsdoc';

export default defineConfig(
  // Ignore generated output
  { ignores: ['dist/**'] },

  // Base + TypeScript recommended rules
  eslint.configs.recommended,
  tseslint.configs.recommended,

  // JSDoc baseline rules (TypeScript-flavoured)
  jsdoc({
    config: 'flat/recommended-typescript'
  }),

  // Project-specific rules
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript ergonomics
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // JSDoc policy: every function/class/method should be documented.
      'jsdoc/require-jsdoc': [
        'error',
        {
          // Keep this strict for top-level APIs, but don't require JSDoc for
          // inline callbacks (ArrowFunctionExpression), or it becomes unworkable.
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true
          }
        }
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',

      // Keep tags/types sane
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/no-undefined-types': 'error'
    }
  }
);
