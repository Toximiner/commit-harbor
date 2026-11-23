# Changelog

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
