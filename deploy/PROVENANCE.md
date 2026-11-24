# deploy — vendored module

The Remote Deployment capability vendored from:

- Upstream: https://github.com/akmalyf/remote-deployment
- Version: 1.1.1 (commit `c4339e4296354d4667486fe89f4c10e4250a759c`)
- Vended: 2026-11-24
- License: MIT — Copyright (c) 2026 Akmal. See [LICENSE](LICENSE).

## Policy

This tree is independent Commit Harbor code: it is maintained here and is
**not** auto-synced with the upstream repository. The upstream project may
still be consulted for bug fixes, but every change lands in this tree
through a normal commit.

Compatibility is preserved on purpose: command ids `deploy.*`, the
`remoteDeployment.*` settings namespace, and the `.vscode/deployment.json`
configuration format are unchanged, so existing user keybindings,
`tasks.json` entries (`"type": "deployment"`) and server configurations keep
working after the standalone Remote Deployment extension is removed.

## Build and integration

- Build: `npm run build --prefix deploy` (requires `npm install --prefix deploy`)
  → `dist/deploy.js` (host bundle) + `dist/media/sync.js`, `dist/media/settings.js`
  (webview bundles) + `dist/media/codicon.css`/`codicon.ttf`.
- Typecheck: `npm run typecheck --prefix deploy`
- Smoke test: `npm test --prefix deploy` (vscode stubbed, no network).
- Activation: `patches/deploy-activate.cjs` hooks `dist/deploy.js`'s
  `activate(context)` into the compiled core's activate, following the
  `patches/branch-workspace.cjs` precedent.
- Manifest: `contributes` sections merged into the root `package.json`
  (views, commands, menus, keybindings, settings, task definitions,
  JSON schema), with paths adjusted to the `deploy/` tree.
