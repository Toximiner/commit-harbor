// Commit Harbor downstream change: single-instance VS Code API sharing shim.
//
// VS Code's webview acquireVsCodeApi() may be called exactly once per webview; a second call
// throws 'An instance of the VS Code API has already been acquired'. Git Jet acquires it first
// in its transport (mount chunk), so any later call from downstream patches threw and failed
// silently. This shim wraps the global with a one-instance cache BEFORE the first call (the
// commit chunk's top level runs before mount), letting every caller in the webview share the
// same instance.
//
// Required by the commit-pane 'Upload to Default Server' menu item (commit-deploy-menu.cjs).
// The former standalone 'Deploy' button was removed at the user's request — the context menu
// covers the same workflow. Selection memory in commit-checks.cjs is a standalone feature.
// Must run after commit-height.cjs (same chunk) to preserve the patch order invariant.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function commitHarborShareVsCodeApi() {
    try {
        if (window.__chShareVsCodeApi) return;
        window.__chShareVsCodeApi = true;
        const original = window.acquireVsCodeApi;
        if (typeof original !== 'function') return;
        let shared = null;
        window.acquireVsCodeApi = function () {
            if (!shared) shared = original();
            return shared;
        };
    } catch (error) {
        console.warn('[Commit Harbor] cannot share acquireVsCodeApi', error);
    }
}
function apply(source) {
    if (source.includes('commitHarborShareVsCodeApi')) return source;
    if (!source.includes('commitHarborMessageHeight')) throw new Error('Expected the commit-height-patched commit chunk; run the patches in scripts/build.py order');
    return commitHarborShareVsCodeApi.toString() + '\ncommitHarborShareVsCodeApi();\n' + source;
}
module.exports = { commitHarborShareVsCodeApi, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
