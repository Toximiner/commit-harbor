// Commit Harbor downstream change: a 'Deploy' button above the commit message field.
// Uploads the files currently checked in the commit file lists to the project's default
// deployment server. The checked selection is already persisted live in the webview state
// by commit-checks.cjs under commitHarborCheckedFiles; the button posts
// {type:'command', command:'commitharbor.deployUpload', args:[groups]} and the extension
// host runs the registered bridge command in the vendored deploy module.
// Self-healing post-hoc DOM patch: a MutationObserver re-attaches the button when React
// re-renders the commit form. No string anchors in the minified render code.
// Must run after commit-height.cjs (same chunk).
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function commitHarborCommitDeploy() {
    const MARKER = 'commitHarborCommitDeployBtn';
    const state = { label: null, flashTimer: 0 };
    const readChecked = () => {
        try {
            const saved = (window.acquireVsCodeApi && window.acquireVsCodeApi().getState()) || {};
            const checked = saved.commitHarborCheckedFiles;
            const groups = [];
            if (checked && typeof checked === 'object') {
                for (const [root, value] of Object.entries(checked)) {
                    if (root === 'collapsed' || !value || typeof value !== 'object') continue;
                    const paths = [...(value.checked || []), ...(value.checkedUnversioned || [])].filter(p => typeof p === 'string' && p);
                    if (paths.length) groups.push({ root, paths });
                }
            }
            return groups;
        } catch (error) {
            console.warn('[Commit Harbor] cannot read checked files', error);
            return [];
        }
    };
    const flash = (text, ms) => {
        if (!state.label) return;
        if (state.flashTimer) clearTimeout(state.flashTimer);
        state.label.textContent = text;
        state.flashTimer = setTimeout(() => { state.label.textContent = 'Deploy'; state.flashTimer = 0; }, ms);
    };
    const makeButton = () => {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = MARKER;
        button.tabIndex = -1;
        button.title = 'Upload the checked files to the default deployment server';
        button.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:2px 8px;font-size:11px;line-height:18px;border:1px solid transparent;border-radius:4px;background:transparent;color:inherit;cursor:pointer;';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '13');
        svg.setAttribute('height', '13');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        for (const d of ['M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', 'M12 12v9', 'm16 16-4-4-4 4']) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            svg.appendChild(path);
        }
        button.appendChild(svg);
        const label = document.createElement('span');
        label.textContent = 'Deploy';
        button.appendChild(label);
        state.label = label;
        button.addEventListener('click', event => {
            event.preventDefault();
            const groups = readChecked();
            if (!groups.length) { flash('No files selected', 2000); return; }
            try {
                window.acquireVsCodeApi().postMessage({ type: 'command', command: 'commitharbor.deployUpload', args: [groups] });
            } catch (error) {
                console.warn('[Commit Harbor] cannot post the deploy command', error);
                return;
            }
            flash('Uploading…', 4000);
        });
        button.addEventListener('mouseenter', () => { button.style.background = 'var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.2))'; });
        button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
        return button;
    };
    const attach = () => {
        const textarea = document.querySelector('textarea');
        if (!textarea || document.getElementById(MARKER)) return;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:flex-end;padding:0 8px 4px 0;';
        row.appendChild(makeButton());
        textarea.parentElement.insertBefore(row, textarea);
    };
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            try { attach(); } catch (error) { console.warn('[Commit Harbor] commit deploy attach failed', error); }
        });
    };
    const onMutations = () => {
        if (!document.getElementById(MARKER)) schedule();
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
    if (source.includes('commitHarborCommitDeploy')) return source;
    if (!source.includes('commitHarborMessageHeight')) throw new Error('Expected the commit-height-patched commit chunk; run the patches in scripts/build.py order');
    return commitHarborCommitDeploy.toString() + '\ncommitHarborCommitDeploy();\n' + source;
}
module.exports = { commitHarborCommitDeploy, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
