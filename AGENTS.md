# AGENTS.md

- `dist/` is gitignored and must be rebuilt after source changes: `npm run prepare` (runs husky + rollup)
- Self-lint: `npm run check` (uses this config to lint itself)
- Tests: `npm test` (mocha, `test/**/*.js`)
- Pre-commit hook runs `npm run check && npm test`
- Custom ESLint rules live in `plugins/` and are wired into the config via `index.js`
- Each plugin has a corresponding test file in `test/rules/` with the same name
- Tests use ESLint's `Linter` API directly; many test the print buffer output via `getPrintBuffer()`
- `plugins/narrowest-scope.js` has extensive analysis docs in `A1.md` through `A7.md`
- Rollup bundles `index.js` and `formatter.js` into `dist/` as both ESM (`.js`) and CJS (`.cjs`); `globals` is external
- Package is ESM (`"type": "module"`) but ships dual format via the `exports` field
