// Commit Harbor downstream change: persist the commit-message pane height.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function readCommitHarborHeight(transport) {
    const value = transport.getState?.()?.commitHarborMessageHeight;
    return Number.isFinite(value) && value >= 60 ? value : 132;
}
function saveCommitHarborHeight(transport, totalHeight, overhead) {
    const height = Number.isFinite(totalHeight) && Number.isFinite(overhead)
        ? Math.max(60, totalHeight - overhead) : readCommitHarborHeight(transport);
    const previous = transport.getState?.();
    transport.setState?.({ ...(previous && typeof previous === 'object' ? previous : {}), commitHarborMessageHeight: height });
    return height;
}
function apply(source) {
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) throw new Error('Upstream patch target changed: ' + before);
        source = source.replace(before, after);
    }
    replaceOnce('import{n as e}from', 'import{nt as __commitHarborUseTransport}from"./ui-BbbfItdn.js";import{n as e}from');
    replaceOnce('function yt(){let{post:e,onMessage:t}=ve()',
        'function yt(){let __commitHarborTransport=__commitHarborUseTransport();let{post:e,onMessage:t}=ve()');
    replaceOnce('[Ee,De]=(0,k.useState)(132)',
        '[Ee,De]=(0,k.useState)(()=>readCommitHarborHeight(__commitHarborTransport))');
    replaceOnce('onSecondPxChange:e=>De(Math.max(60,e-Lt-It-zt))',
        'onSecondPxChange:e=>De(saveCommitHarborHeight(__commitHarborTransport,e,Lt+It+zt))');
    return readCommitHarborHeight.toString() + '\n' + saveCommitHarborHeight.toString() + '\n' + source;
}
module.exports = { readCommitHarborHeight, saveCommitHarborHeight, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
