// Commit Harbor downstream change: remember open editor tabs per Git branch.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');
function installBranchWorkspaceRestore(context, vscode) {
    const config = () => vscode.workspace.getConfiguration('commitharbor.branches').get('restoreWorkspace', true);
    const extension = vscode.extensions.getExtension('vscode.git');
    if (!extension) return;
    const stateKey = 'commitHarbor.branchEditors.v1';
    const snapshots = context.workspaceState.get(stateKey, {});
    const previousBranches = new Map();
    const switchingRoots = new Set();
    const disposables = [];
    const tabs = () => vscode.window.tabGroups.all.flatMap(group => group.tabs);
    const filesInRepo = (repo, openTabs) => {
        const path = require('node:path');
        const root = repo.rootUri.fsPath;
        const prefix = root.endsWith(path.sep) ? root : root + path.sep;
        return openTabs.map(tab => {
            const input = tab.input;
            const uri = input?.uri ?? input?.modified ?? input?.original;
            if (!uri || uri.scheme !== 'file') return undefined;
            const file = uri.fsPath;
            return file === root || file.startsWith(prefix) ? uri.toString() : undefined;
        }).filter(Boolean);
    };
    let gitApi;
    const save = () => {
        if (!config() || !gitApi) return;
        const openTabs = tabs();
        for (const repo of gitApi.repositories) {
            const root = repo.rootUri.toString();
            if (switchingRoots.has(root)) continue;
            const branch = repo.state.HEAD?.name;
            if (!branch) continue;
            previousBranches.set(root, branch);
            snapshots[root] ??= {};
            const cleanTabs = openTabs.filter(tab => !tab.isDirty);
            snapshots[root][branch] = filesInRepo(repo, cleanTabs);
        }
        void context.workspaceState.update(stateKey, snapshots);
    };
    const pending = new Map();
    const restore = async (repo, branch) => {
        if (!config() || !branch) return;
        const root = repo.rootUri.toString();
        const files = snapshots[root]?.[branch] ?? [];
        const staleTabs = tabs().filter(tab => {
            if (tab.isDirty) return false;
            const uri = tab.input?.uri ?? tab.input?.modified ?? tab.input?.original;
            if (!uri || uri.scheme !== 'file') return false;
            const path = require('node:path');
            const repoPath = repo.rootUri.fsPath;
            return uri.fsPath === repoPath || uri.fsPath.startsWith(repoPath.endsWith(path.sep) ? repoPath : repoPath + path.sep);
        });
        if (staleTabs.length) await vscode.window.tabGroups.close(staleTabs, true).catch(() => false);
        for (const value of files) {
            try {
                const uri = vscode.Uri.parse(value);
                await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(uri, { preview: false, preserveFocus: true });
            } catch { /* This path may not exist on the selected branch. */ }
        }
    };
    const trackRepo = repo => {
        const root = repo.rootUri.toString();
        previousBranches.set(root, repo.state.HEAD?.name);
        if (!repo.state.onDidChange) return;
        disposables.push(repo.state.onDidChange(() => {
            const next = repo.state.HEAD?.name;
            const previous = previousBranches.get(root);
            if (next === previous) { save(); return; }
            previousBranches.set(root, next);
            if (!next) return;
            switchingRoots.add(root);
            const oldTimer = pending.get(root);
            if (oldTimer) clearTimeout(oldTimer);
            pending.set(root, setTimeout(async () => {
                pending.delete(root);
                try { await restore(repo, next); }
                finally { switchingRoots.delete(root); save(); }
            }, 300));
        }));
    };
    const start = async () => {
        try {
            const extensionApi = extension.isActive ? extension.exports : await extension.activate();
            gitApi = extensionApi.getAPI(1);
            for (const repo of gitApi.repositories) trackRepo(repo);
            disposables.push(gitApi.onDidOpenRepository(trackRepo));
            save();
        } catch { /* Git may not be available in this window. */ }
    };
    disposables.push(vscode.window.tabGroups.onDidChangeTabs(save));
    void start();
    context.subscriptions.push({ dispose: () => {
        for (const timer of pending.values()) clearTimeout(timer);
        for (const disposable of disposables) disposable.dispose();
    } });
}
function apply(source) {
    const anchor = 'async function Y7(t,e){let r=performance.now()';
    if (source.split(anchor).length !== 2) throw new Error('Upstream activation patch target changed');
    source = source.replace(anchor, 'async function Y7(t,e){installBranchWorkspaceRestore(t,Ge);let r=performance.now()');
    return installBranchWorkspaceRestore.toString() + '\n' + source;
}
module.exports = { installBranchWorkspaceRestore, apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
