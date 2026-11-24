#!/usr/bin/env python3
"""Repackage the pinned upstream distribution; do not claim to rebuild its sources."""
from pathlib import Path
import hashlib, json, shutil, subprocess, zipfile
ROOT = Path(__file__).resolve().parent.parent
PIN = json.loads((ROOT / "vendor/upstream.json").read_text())
ARCHIVE = ROOT / "vendor/git-jet-0.27.4.vsix"
NOTICE = "/*! Commit Harbor downstream modifications: identity, branding and persistent pane height. Original Git Jet 0.27.4: Santiago Barcenas and contributors. Apache-2.0; see NOTICE and UPSTREAM.md. */\n"
assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == PIN["sha256"], "Upstream archive checksum mismatch"
def rename(text):
    return (text.replace("santiagobarcenas.git-jet", "Toximiner.commit-harbor")
        .replace("https://github.com/Jsbarcenas/git-jet", "https://github.com/Toximiner/commit-harbor")
        .replace("gitjet", "commitharbor").replace("git-jet", "commit-harbor")
        .replace("GitJet", "CommitHarbor").replace("gitJet", "commitHarbor")
        .replace("Git Jet", "Commit Harbor"))
for name in ["dist", "media"]:
    shutil.rmtree(ROOT / name, ignore_errors=True)
with zipfile.ZipFile(ARCHIVE) as archive:
    for info in archive.infolist():
        name = info.filename
        if info.is_dir() or not name.startswith("extension/"): continue
        relative = Path(name.removeprefix("extension/"))
        assert ".." not in relative.parts and not relative.is_absolute(), "Unsafe archive member"
        if relative.parts[0] not in ["dist", "media"]: continue
        destination = ROOT / str(relative).replace("gitjet", "commitharbor")
        destination.parent.mkdir(parents=True, exist_ok=True)
        data = archive.read(info)
        if destination.suffix in [".js", ".css", ".svg"]:
            before = data.decode(); after = rename(before)
            if before != after:
                after = ("<!-- Modified by Commit Harbor; see NOTICE and UPSTREAM.md. -->\n" if destination.suffix == ".svg" else NOTICE) + after
            data = after.encode()
        destination.write_bytes(data)
    for name in ["package.nls.json", "package.nls.es.json"]:
        value = json.loads(archive.read("extension/" + name))
        value["description"] = "Independent Git workbench based on Git Jet 0.27.4, with persistent commit pane height and branch-aware editor state."
        value["commitHarbor.modifications"] = "Modified downstream distribution; see NOTICE and UPSTREAM.md."
        (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
commit = ROOT / "dist/webview/chunks/commit-Bw38ouX0.js"
subprocess.run(["node", str(ROOT / "patches/commit-height.cjs"), str(commit)], check=True)
subprocess.run(["node", str(ROOT / "patches/commit-checks.cjs"), str(commit)], check=True)
subprocess.run(["node", str(ROOT / "patches/branch-picker-resize.cjs"), str(commit)], check=True)
subprocess.run(["node", str(ROOT / "patches/commit-deploy.cjs"), str(commit)], check=True)
text = commit.read_text()
if not text.startswith(NOTICE): commit.write_text(NOTICE + text)
extension = ROOT / "dist/extension.js"
subprocess.run(["node", str(ROOT / "patches/branch-workspace.cjs"), str(extension)], check=True)
subprocess.run(["node", str(ROOT / "patches/hunk-gutter.cjs"), str(extension)], check=True)
subprocess.run(["node", str(ROOT / "patches/deploy-activate.cjs"), str(extension)], check=True)
subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--prefix", str(ROOT / "deploy")], cwd=ROOT, check=True)
subprocess.run(["npm", "run", "build", "--prefix", str(ROOT / "deploy")], cwd=ROOT, check=True)
text = extension.read_text()
if not text.startswith(NOTICE): extension.write_text(NOTICE + text)
activity = ROOT / "media/icons/commitharbor.svg"
activity.write_bytes((ROOT / "assets/activity.svg").read_bytes())
print("Built Commit Harbor from verified Git Jet " + PIN["version"] + " distribution.")
