import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'out-tsc/', 'node_modules/', 'coverage/', '.angular/', 'e2e/'],
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['hk', 'app'], style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['hk', 'app'], style: 'camelCase' },
      ],
      '@angular-eslint/prefer-standalone': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
