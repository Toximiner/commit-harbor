// Commit Harbor downstream change: 'Upload to Default Server' in the commit-pane context menu.
// The changes list (commit pane) has its own context menu: qt(rowId) builds the item array and
// Jt opens the shared popup. qt is the single builder for file, group, unversioned and ignored
// rows, so wrapping its result adds the deploy item everywhere a file selection exists, with the
// same [{root, paths}] shape the commitharbor.deployUpload bridge command expects (the webview
// state keeps the checked files, but the menu targets the right-clicked/selected files, mirroring
// the file-tree 'Deployment' menu). String anchors in the minified commit chunk; throws loudly
// if the upstream text changes.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function commitHarborDeployMenuItems(selection, items) {
    try {
        const groups = [];
        for (const entry of selection || []) {
            if (!entry || typeof entry !== 'object') continue;
            const root = entry.repo && typeof entry.repo.root === 'string' ? entry.repo.root : null;
            if (!root) continue;
            const paths = (entry.paths || []).filter(p => typeof p === 'string' && p);
            if (paths.length) groups.push({ root, paths });
        }
        if (!groups.length) return items;
        return [
            ...(items || []),
            ...(items && items.length ? [{ kind: 'separator' }] : []),
            {
                label: 'Upload to Default Server',
                icon: 'push',
                onSelect: () => {
                    try {
                        window.acquireVsCodeApi().postMessage({ type: 'command', command: 'commitharbor.deployUpload', args: [groups] });
                    } catch (error) {
                        console.warn('[Commit Harbor] cannot post the deploy command', error);
                    }
                }
            }
        ];
    } catch { return items; }
}
function apply(source) {
    if (source.includes('commitHarborDeployMenuItems')) return source;
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) throw new Error('Upstream commit deploy menu patch target changed: ' + before.slice(0, 80));
        source = source.replace(before, after);
    }
    replaceOnce(
        'if(e===t.id)return lt({selection:n.length>0?n:[{repo:i,paths:[]}],group:t,staging:g,repositories:l,host:a});',
        'if(e===t.id)return commitHarborDeployMenuItems(n.length>0?n:[{repo:i,paths:[]}],lt({selection:n.length>0?n:[{repo:i,paths:[]}],group:t,staging:g,repositories:l,host:a}));'
    );
    replaceOnce(
        'let o={selection:r};return g?ct({...o,group:t,host:a}):t.id===`unversioned`||t.id===`ignored`?st({...o,group:t,host:a}):ot({...o,changeByPath:V,conflicts:H,host:a})',
        'let o={selection:r};return commitHarborDeployMenuItems(r,g?ct({...o,group:t,host:a}):t.id===`unversioned`||t.id===`ignored`?st({...o,group:t,host:a}):ot({...o,changeByPath:V,conflicts:H,host:a}))'
    );
    return commitHarborDeployMenuItems.toString() + '\n' + source;
}
module.exports = { commitHarborDeployMenuItems, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
