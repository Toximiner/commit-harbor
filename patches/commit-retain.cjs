// Commit Harbor downstream change: retain the Commit tool window's webview
// context while the view is hidden, so a typed commit message survives
// switching to another sidebar view (e.g. File Explorer) and back.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function apply(source) {
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) throw new Error('Upstream patch target changed: ' + before);
        source = source.replace(before, after);
    }
    replaceOnce('registerToolWindow("commit",this,{page:{entry:"commit",title:"Commit"},retainContext:!1}',
        'registerToolWindow("commit",this,{page:{entry:"commit",title:"Commit"},retainContext:!0}');
    return source;
}
module.exports = { apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
