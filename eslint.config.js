import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Off by decision, not by neglect. This rule exists to keep hot-module reload
      // swapping components in place instead of full-reloading, which only pays off
      // in a dev server — and this project has no dev-server workflow (changes are
      // reviewed on the Vercel deploy). Satisfying it would mean splitting the
      // AuthContext/ThemeContext providers away from their own hooks, and moving
      // SheetTab/CharmLibraryTab's shared helpers into extra modules, purely to buy
      // a benefit nobody here consumes. Revisit if local dev ever becomes normal.
      'react-refresh/only-export-components': 'off',
    },
  },
])
