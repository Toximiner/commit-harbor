// Commit Harbor downstream change: remember the expanded folders of the branch picker tree.
// The generic tree popup (ui chunk, component Ou) keeps its expanded groups in a Set that is
// re-initialized from the host's `expanded` prop on every open, so user toggles are lost when
// the popup closes. This patch seeds the Set from the webview localStorage for the branch
// popups (titles starting with 'Git Branches') and persists every non-search toggle.
// String anchors in the minified ui chunk; throws loudly if the upstream text changes.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function commitHarborBranchTreeSaved(title) {
    try {
        if (typeof title !== 'string' || !title.startsWith('Git Branches')) return null;
        const value = JSON.parse(localStorage.getItem('commitHarborBranchTree:' + title));
        return Array.isArray(value) ? value.filter(x => typeof x === 'string') : null;
    } catch { /* First run or corrupted value: fall back to the upstream defaults. */ }
}
function commitHarborBranchTreePersist(title, expanded) {
    try {
        if (typeof title !== 'string' || !title.startsWith('Git Branches')) return;
        if (!expanded || typeof expanded.has !== 'function') return;
        localStorage.setItem('commitHarborBranchTree:' + title, JSON.stringify([...expanded]));
    } catch { /* Storage may be unavailable. */ }
}
function apply(source) {
    if (source.includes('commitHarborBranchTreeSaved')) return source;
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) throw new Error('Upstream branch tree memory patch target changed: ' + before.slice(0, 80));
        source = source.replace(before, after);
    }
    replaceOnce(
        '[c,l]=(0,i.useState)(()=>{let t=e.expanded??[],n=e.items.flatMap(e=>{let t=e.group.split(` / `);return t.slice(1).map((e,n)=>t.slice(0,n+2).join(` / `))});return new Set([...t,...n.filter(e=>t.some(t=>e.startsWith(`${t} / `)))])})',
        '[c,l]=(0,i.useState)(()=>{let t=e.expanded??[],n=e.items.flatMap(e=>{let t=e.group.split(` / `);return t.slice(1).map((e,n)=>t.slice(0,n+2).join(` / `))});let s=commitHarborBranchTreeSaved(e.title);if(s)return new Set(s);return new Set([...t,...n.filter(e=>t.some(t=>e.startsWith(`${t} / `)))])})');
    replaceOnce(
        'D=e=>(E?d:l)(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})',
        'D=e=>(E?d:l)(t=>{let n=new Set(t);if(n.has(e))n.delete(e);else n.add(e);if(!E)commitHarborBranchTreePersist(e.title,n);return n})');
    return commitHarborBranchTreeSaved.toString() + '\n' + commitHarborBranchTreePersist.toString() + '\n' + source;
}
module.exports = { commitHarborBranchTreeSaved, commitHarborBranchTreePersist, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
