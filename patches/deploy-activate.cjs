// Commit Harbor downstream change: activate the user-owned deploy module (vendored Remote Deployment).
// The bundle dist/deploy.js is produced by `npm run build --prefix deploy` inside scripts/build.py.
// Must run AFTER branch-workspace.cjs: it anchors on the text that patch produces.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function installCommitHarborDeploy(context) {
    const fs = require('node:fs');
    const path = require('node:path');
    const bundle = path.join(__dirname, 'deploy.js');
    if (!fs.existsSync(bundle)) {
        console.error('[Commit Harbor] deploy.js is missing; run scripts/build.py first.');
        return;
    }
    let deploy;
    try {
        deploy = require(bundle);
    } catch (error) {
        console.error('[Commit Harbor] Deploy module failed to load:', error);
        return;
    }
    try {
        deploy.activate(context);
    } catch (error) {
        console.error('[Commit Harbor] Deploy activation failed:', error);
        return;
    }
    context.subscriptions.push({ dispose: () => deploy.deactivate() });
}
function apply(source) {
    const anchor = 'async function Y7(t,e){installBranchWorkspaceRestore(t,Ge);let r=performance.now()';
    if (source.split(anchor).length !== 2) throw new Error('Upstream activation patch target changed');
    source = source.replace(anchor, 'async function Y7(t,e){installBranchWorkspaceRestore(t,Ge);installCommitHarborDeploy(t);let r=performance.now()');
    return installCommitHarborDeploy.toString() + '\n' + source;
}
module.exports = { installCommitHarborDeploy, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
