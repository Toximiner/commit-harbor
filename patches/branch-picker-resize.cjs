// Commit Harbor downstream change: make the branch picker panel resizable from its bottom-right corner.
// Self-healing post-hoc DOM patch: no string anchors in the minified render code.
// A MutationObserver watches for the 'Git Branches in <repo>' title, finds the panel that also
// carries the branch search input, and attaches a corner grip (width+height, min 280x200).
// The size is persisted in the webview localStorage; double-click on the grip resets it.
// Must run after commit-height.cjs (same chunk).
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function commitHarborBranchPickerResize() {
    const KEY = 'commitHarborBranchPickerSize';
    const MIN_W = 280, MIN_H = 200, GAP = 8, HANDLE = 14;
    const state = { panel: null, grip: null, dragging: false, startX: 0, startY: 0, startW: 0, startH: 0 };
    const readSaved = () => {
        try {
            const value = JSON.parse(localStorage.getItem(KEY));
            if (value && Number.isFinite(value.w) && Number.isFinite(value.h)) return value;
        } catch { /* First run or corrupted value: fall back to the upstream size. */ }
        return null;
    };
    const writeSaved = size => {
        try { localStorage.setItem(KEY, JSON.stringify(size)); } catch { /* Storage may be unavailable. */ }
    };
    const findPanel = titleEl => {
        let el = titleEl, fallback = null;
        for (let level = 0; level < 16 && el && el.parentElement; level++) {
            el = el.parentElement;
            const input = el.querySelector('input[placeholder]');
            if (!input || !(input.placeholder || '').startsWith('Search for branches')) continue;
            if (!fallback) fallback = el;
            const cls = typeof el.className === 'string' ? el.className : '';
            if (cls.includes('shadow') || cls.includes('bg-popup')) return el;
        }
        return fallback;
    };
    const makeGrip = () => {
        const grip = document.createElement('div');
        grip.id = 'commitHarborBranchPickerGrip';
        grip.setAttribute('aria-hidden', 'true');
        grip.style.cssText = 'position:absolute;right:' + GAP + 'px;bottom:' + GAP + 'px;width:' + HANDLE + 'px;height:' + HANDLE + 'px;cursor:nwse-resize;z-index:50;opacity:.55;';
        grip.title = 'Drag to resize, double-click to reset';
        const triangle = document.createElement('div');
        triangle.style.cssText = 'position:absolute;right:2px;bottom:2px;width:0;height:0;border-right:7px solid currentColor;border-bottom:7px solid transparent;';
        grip.appendChild(triangle);
        return grip;
    };
    const attach = panel => {
        if (state.panel === panel && state.grip && state.grip.isConnected) return;
        if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';
        state.panel = panel;
        state.grip = state.grip ?? makeGrip();
        if (state.grip.isConnected) state.grip.remove();
        panel.appendChild(state.grip);
        const saved = readSaved();
        if (saved) { panel.style.width = saved.w + 'px'; panel.style.height = saved.h + 'px'; }
    };
    state.grip = makeGrip();
    state.grip.addEventListener('mousedown', event => {
        if (event.button !== 0 || !state.panel) return;
        state.dragging = true;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.startW = state.panel.offsetWidth;
        state.startH = state.panel.offsetHeight;
        document.body.style.userSelect = 'none';
        event.preventDefault();
        event.stopPropagation();
    });
    state.grip.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!state.panel) return;
        state.panel.style.width = '';
        state.panel.style.height = '';
        try { localStorage.removeItem(KEY); } catch { /* Storage may be unavailable. */ }
    });
    document.addEventListener('mousemove', event => {
        if (!state.dragging || !state.panel) return;
        const rect = state.panel.getBoundingClientRect();
        const maxW = Math.max(MIN_W, window.innerWidth - rect.left - GAP);
        const maxH = Math.max(MIN_H, window.innerHeight - rect.top - GAP);
        const width = Math.min(maxW, Math.max(MIN_W, state.startW + event.clientX - state.startX));
        const height = Math.min(maxH, Math.max(MIN_H, state.startH + event.clientY - state.startY));
        state.panel.style.width = width + 'px';
        state.panel.style.height = height + 'px';
    }, { passive: true });
    document.addEventListener('mouseup', () => {
        if (!state.dragging) return;
        state.dragging = false;
        document.body.style.userSelect = '';
        if (state.panel) writeSaved({ w: state.panel.offsetWidth, h: state.panel.offsetHeight });
    });
    const scan = () => {
        if (!document.body) return;
        if (state.panel && !state.grip.isConnected) attach(state.panel);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
            const first = node.firstChild;
            if (!first || first.nodeType !== 3) continue;
            if (!first.data.trimStart().startsWith('Git Branches in')) continue;
            const panel = findPanel(node);
            if (panel) attach(panel);
        }
    };
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            try { scan(); } catch (error) { console.warn('[Commit Harbor] branch picker resize scan failed', error); }
        });
    };
    const onMutations = records => {
        if (state.panel && !state.grip.isConnected) schedule();
        for (const record of records) {
            for (const added of record.addedNodes) {
                const text = added.nodeType === 3 ? added.data : added.textContent || '';
                if (text.trimStart().startsWith('Git Branches in')) { schedule(); return; }
            }
        }
    };
    const start = () => {
        if (!document.body) return;
        new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
        schedule();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
}
function apply(source) {
    if (source.includes('commitHarborBranchPickerResize')) return source;
    if (!source.includes('commitHarborMessageHeight')) throw new Error('Expected the commit-height-patched commit chunk; run the patches in scripts/build.py order');
    return commitHarborBranchPickerResize.toString() + '\ncommitHarborBranchPickerResize();\n' + source;
}
module.exports = { commitHarborBranchPickerResize, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
