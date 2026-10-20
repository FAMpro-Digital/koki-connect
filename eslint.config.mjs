// Contrôle de qualité (détection d'erreurs réelles, pas de style). Les scripts classiques de l'accueil partagent
// des variables globales entre fichiers : « no-undef » est donc désactivé (les tests de contrat couvrent ces liens).
import js from '@eslint/js';
import globals from 'globals';

const regles = {
  'no-undef': 'off',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
  'no-redeclare': 'off',
  'no-prototype-builtins': 'off',
  'no-useless-escape': 'off',
  'no-cond-assign': ['error', 'except-parens'],
  'no-constant-condition': ['error', { checkLoops: false }],
};

export default [
  { ignores: ['assets/leaflet/leaflet.js', 'assets/business/vendor/**', 'dist/**', 'node_modules/**', 'tests/e2e/rapports/**'] },
  js.configs.recommended,
  { files: ['assets/**/*.js', 'sw.js'], languageOptions: { sourceType: 'script', ecmaVersion: 2023, globals: { ...globals.browser, ...globals.serviceworker } }, rules: regles },
  { files: ['assets/**/*.mjs', 'assets/business/business-state.js'], languageOptions: { sourceType: 'module', ecmaVersion: 2023, globals: globals.browser }, rules: regles },
  { files: ['scripts/**/*.mjs', 'eslint.config.mjs', 'tests/e2e/**/*.mjs'], languageOptions: { sourceType: 'module', ecmaVersion: 2023, globals: globals.node }, rules: regles },
  { files: ['tests/fixtures/**/*.js'], languageOptions: { sourceType: 'script', ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } }, rules: regles },
  { files: ['tests/**/*.cjs'], languageOptions: { sourceType: 'commonjs', ecmaVersion: 2023, globals: globals.node }, rules: regles },
];
