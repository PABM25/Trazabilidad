import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const reglas = {
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
}

export default defineConfig([
  globalIgnores(['dist', 'legacy-lavanderia', '**/node_modules']),

  // App web (React)
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [js.configs.recommended, reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: reglas,
  },

  // Puente del lector RFID (Node.js, CommonJS)
  {
    files: ['server/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: reglas,
  },

  // Pruebas de la base de datos y archivos de configuración (Node.js, módulos)
  {
    files: ['supabase/tests/**/*.mjs', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: reglas,
  },
])
