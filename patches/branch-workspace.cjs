// Commit Harbor downstream change: remember open editor tabs per Git branch.
// Snapshots store one file list per editor group, in group order, so restored files
// return to the split column they were saved in (empty groups are kept to preserve
// column positions). Snapshots written by earlier versions are a flat URI list: they
// restore into the active group, exactly as before.
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
    const tabUri = tab => tab.input?.uri ?? tab.input?.modified ?? tab.input?.original;
    const filesInRepo = (repo, openTabs) => {
        const path = require('node:path');
        const root = repo.rootUri.fsPath;
        const prefix = root.endsWith(path.sep) ? root : root + path.sep;
        return openTabs.map(tab => {
            const uri = tabUri(tab);
            if (!uri || uri.scheme !== 'file') return undefined;
            const file = uri.fsPath;
            return file === root || file.startsWith(prefix) ? uri.toString() : undefined;
        }).filter(Boolean);
    };
    const asGroups = snapshot => {
        if (Array.isArray(snapshot) && snapshot.some(group => Array.isArray(group))) return { groups: snapshot, columns: true };
        const flat = Array.isArray(snapshot) ? snapshot : [];
        return { groups: [[...new Set(flat)]], columns: false };
    };
    let gitApi;
    const save = () => {
        if (!config() || !gitApi) return;
        for (const repo of gitApi.repositories) {
            const root = repo.rootUri.toString();
            if (switchingRoots.has(root)) continue;
            const branch = repo.state.HEAD?.name;
            if (!branch) continue;
            previousBranches.set(root, branch);
            snapshots[root] ??= {};
            snapshots[root][branch] = vscode.window.tabGroups.all.map(group => filesInRepo(repo, group.tabs.filter(tab => !tab.isDirty)));
        }
        void context.workspaceState.update(stateKey, snapshots);
    };
    const pending = new Map();
    const restore = async (repo, branch) => {
        if (!config() || !branch) return;
        const root = repo.rootUri.toString();
        const layout = asGroups(snapshots[root]?.[branch]);
        const files = new Set(layout.groups.flat());
        const path = require('node:path');
        const repoPath = repo.rootUri.fsPath;
        const repoPrefix = repoPath.endsWith(path.sep) ? repoPath : repoPath + path.sep;
        const inRepo = file => file === repoPath || file.startsWith(repoPrefix);
        const current = tabs().map(tab => {
            const uri = tabUri(tab);
            return { tab, uri, inRepo: !!(uri && uri.scheme === 'file' && inRepo(uri.fsPath)) };
        });
        // Close only the clean tabs the selected branch does not remember; files it does
        // remember keep their current editor group instead of being closed and reopened
        // in the active group.
        const staleTabs = current.filter(e => e.inRepo && !e.tab.isDirty && !files.has(e.uri.toString())).map(e => e.tab);
        if (staleTabs.length) await vscode.window.tabGroups.close(staleTabs, true).catch(() => false);
        const openUris = new Set(current.filter(e => e.uri && e.uri.scheme === 'file').map(e => e.uri.toString()));
        const columns = [vscode.ViewColumn.One, vscode.ViewColumn.Two, vscode.ViewColumn.Three];
        for (let index = 0; index < layout.groups.length; index++) {
            const options = { preview: false, preserveFocus: true };
            if (layout.columns && index < columns.length) options.viewColumn = columns[index];
            for (const value of layout.groups[index]) {
                if (openUris.has(value)) continue;
                try {
                    const uri = vscode.Uri.parse(value);
                    await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(uri, options);
                } catch { /* This path may not exist on the selected branch. */ }
            }
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
            // The first observation of a resolved HEAD is git's initial load at window
            // startup, not a branch switch: record it (and refresh the snapshot) without
            // touching the restored editor layout.
            if (previous === undefined) { save(); return; }
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
