# Changelog

## 0.1.8

- New 512x512 marketplace icon: a git branch grown into a sailboat mast.
- README: the introduction now describes the full downstream feature set (pane height, selection and branch memory, built-in remote deployment) instead of only the pane-height fix.
- Fix: restoring the per-branch editor state no longer collapses editor groups at window startup (git's initial load is no longer treated as a branch switch), and a real switch now keeps already open remembered files in their groups, closing only files the target branch does not remember.

## 0.1.7

- Built-in remote deployment over SFTP, FTP, FTPS and WebDAV (vendored Remote Deployment 1.1.1).
- Configure servers in `.vscode/deployment.json`; upload, download, compare, sync and open remote files from the new Remote Host view.
- "Upload to Default Server" context-menu item in the Commit pane changes list and the file explorer.
- Preserve `deploy.*` commands, `remoteDeployment.*` settings and the `.vscode/deployment.json` format for compatibility with the standalone Remote Deployment extension.
- Remember expanded folders in the branch picker across window reloads.

## 0.1.6

- Keep hunk include/exclude checkmarks out of the editor gutter by default. Enable them with **Commit Harbor › Editor: Show Hunk Inclusion Gutter** (`commitharbor.editor.showHunkInclusionGutter`); hunk inclusion controls remain in the Commit view either way.

## 0.1.5

- Remember expanded and collapsed groups in the Commit view tree across window reloads.

## 0.1.4

- Leave newly detected modified files unchecked in the Commit view.
- Keep restored file selections while Git refreshes the change list.

## 0.1.3

- Remember open editor files separately for each Git branch and restore them when switching branches.
- Preserve checked, unchecked and previously seen files in the Commit view across webview reloads.
- Document branch-aware workspace restoration and its setting.

## 0.1.1

- Add real Commit view and history screenshots using a fictional demo repository.
- Document the resizable commit message pane and history interface.

## 0.1.0

- Initial independent distribution based on the official Git Jet 0.27.4 VSIX.
- Persist commit message pane height across webview recreation.
- Preserve unrelated state and enforce the existing minimum input height.
- Isolate extension, commands, views and settings under Commit Harbor identifiers.
- Add a new icon, upstream provenance, reproducible packaging and regression tests.
