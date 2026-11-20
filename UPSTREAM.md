# Upstream provenance

- Product: Git Jet
- Publisher: `santiagobarcenas`
- Version: `0.27.4`
- Marketplace: https://marketplace.visualstudio.com/items?itemName=santiagobarcenas.git-jet
- Advertised repository: https://github.com/Jsbarcenas/git-jet (HTTP 404 when checked on 2026-11-21)
- License: Apache-2.0, with bundled third-party notices and font/dictionary licenses.
- Original artifact: `vendor/git-jet-0.27.4.vsix`, downloaded from the public Marketplace Gallery API.
- SHA-256: `48208d8b1f80d4555683f7e412e39d01f17b2d6cb14015f5001023e00abc56e9`

The vendored artifact is unchanged. `scripts/build.py` verifies its checksum on every build. Git Jet's original source tree and build dependencies are **not** present in the VSIX. This is a downstream distribution with reproducible packaging from a pinned precompiled artifact, not a complete source fork or a source rebuild of Git Jet.

## Modified material

- `package.json`: new extension/publisher identity, description, repository links, command/configuration/view namespaces, icon and downstream build scripts. `commitHarborBuild` records the modification notice.
- Runtime JavaScript/CSS/SVG: isolated identifiers and branding; modified files include a prominent downstream notice.
- Commit webview bundle: the height-persistence patch is generated from the readable functions in `patches/commit-height.cjs`.
- Activity bar SVG and extension PNG: new Commit Harbor artwork.
- Localization metadata and documentation: downstream description, limitations, attribution and instructions.

The original LICENSE and third-party notices are retained. The original NOTICE is retained verbatim, followed by a downstream modifications section. Bundled third-party fonts and dictionaries retain their license files. New modifications are licensed under Apache-2.0.

Original third-party code and package versions are pinned to this snapshot. Changes to that code require separate investigation; updating build tooling does not update dependencies embedded in the upstream bundles.
