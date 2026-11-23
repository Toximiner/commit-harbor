// Commit Harbor downstream change: persist checked and previously seen files.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function apply(source) {
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) throw new Error('Upstream commit selection patch target changed: ' + before);
        source = source.replace(before, after);
    }
    replaceOnce('setRepositories(n){let r={...t().ui};',
        'restoreChecks(n){if(!n)return;let r={...t().ui};for(let[root,saved]of Object.entries(n)){let current=r[root]??J();r[root]={...current,checked:new Set(saved.checked??[]),seen:new Set(saved.seen??[]),checkedUnversioned:new Set(saved.checkedUnversioned??[])}}e({ui:r})},setRepositories(n){let r={...t().ui};');
    replaceOnce('case`init`:t.setPreferences(e.preferences),t.setRepositories(e.repositories);break;case`repositories`:t.setRepositories(e.repositories);break;',
        'case`init`:t.setPreferences(e.preferences),t.restoreChecks(__commitHarborTransport.getState?.()?.commitHarborCheckedFiles),t.setRepositories(e.repositories);break;case`repositories`:t.restoreChecks(__commitHarborTransport.getState?.()?.commitHarborCheckedFiles),t.setRepositories(e.repositories);break;');
    replaceOnce('(0,k.useEffect)(()=>{let n=t(e=>{let t=i.getState();switch(e.type)',
        '(0,k.useEffect)(()=>i.subscribe((state,previous)=>{if(!state.ready||state.ui===previous.ui)return;let saved={};for(let[root,value]of Object.entries(state.ui))saved[root]={checked:[...value.checked],seen:[...value.seen],checkedUnversioned:[...value.checkedUnversioned]};let previousState=__commitHarborTransport.getState?.()??{};__commitHarborTransport.setState?.({...previousState,commitHarborCheckedFiles:saved})}),[i]),(0,k.useEffect)(()=>{let n=t(e=>{let t=i.getState();switch(e.type)');
    return source;
}
module.exports = { apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
