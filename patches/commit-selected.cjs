// Commit selected files by temporarily rebuilding the repository index.
//
// `git commit --only <paths>` holds the real index lock while hooks run, so hooks such as
// pre-commit (which must write that index) collide and fail. An isolated index via
// GIT_INDEX_FILE avoids the lock, but git does not pass custom environment variables to
// hooks: a hook that shells out again (for example pre-commit running inside docker)
// sees the repository's real index and lints the wrong file set. Rebuilding the real
// index makes the selected set visible to every hook: `read-tree HEAD` drops stale
// entries, `add -A -- <selected>` stages exactly the selection, and a plain full-index
// commit then runs hooks against precisely those files. Git does not hold the index
// lock across the pre-commit hook, so hooks that rewrite the index (pre-commit's
// stash/restore) coexist with the commit.
//
// The original index is snapshotted to .index.commitharbor-* beside it before the
// rebuild and restored byte-for-byte after the commit; on success
// `git reset -q HEAD -- <selected>` then re-syncs the committed paths to the new
// commit, so unrelated staged changes keep their state. The worktree is never touched.
// Trade-off: staging performed in the UI while the hooks run is clobbered by the
// restore. Snapshot files left behind by a crashed run are removed at the start of the
// next selected commit.
// Copyright 2026 Toximiner contributors. Licensed under Apache-2.0.
const fs = require('node:fs');

function apply(source) {
    function replaceOnce(before, after) {
        if (source.split(before).length !== 2) {
            throw new Error('Upstream selected-file commit patch target changed: ' + before);
        }
        source = source.replace(before, after);
    }

    replaceOnce(
        'e.unversioned.length>0&&await t.git.exec(["add","--",...e.unversioned],{cwd:t.root});',
        ''
    );
    replaceOnce(
        'let a=["commit","-F",o,"--cleanup=strip"];',
        'let a=["commit","-F",o,"--cleanup=whitespace"];'
    );
    replaceOnce(
        ',t.info?.state==="MERGING"&&n.size>0?await t.git.exec(["add","-A","--",...n],{cwd:t.root}):n.size>0&&a.push("--only","--",...n),await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")',
        ';if(t.info?.state==="MERGING"&&n.size>0){await t.git.exec(["add","-A","--",...n],{cwd:t.root});await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")}else if(n.size>0){let g=(await t.git.exec(["rev-parse","--git-dir"],{cwd:t.root,silent:!0})).stdout.trim(),v=Uc.join(Uc.resolve(t.root,g),"index"),m=Uc.dirname(v),S=Uc.join(m,".index.commitharbor-"+Date.now()+"-"+Math.floor(Math.random()*1e9)),h=await Rp.promises.access(v).then(()=>!0,()=>!1);for(let p of await Rp.promises.readdir(m))p.startsWith(".index.commitharbor-")&&await Rp.promises.rm(Uc.join(m,p),{force:!0}).catch(()=>{});let y=!1;try{h&&await Rp.promises.copyFile(v,S),await t.git.exec(t.info?.currentRevision!==void 0?["read-tree","HEAD"]:["read-tree","--empty"],{cwd:t.root}),await t.git.exec(["add","-A","--",...n],{cwd:t.root}),await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios."),y=!0}finally{h&&(await Rp.promises.copyFile(S,v).catch(()=>{}),y&&t.info?.currentRevision!==void 0&&await t.git.exec(["reset","-q","HEAD","--",...n],{cwd:t.root,allowNonZeroExit:!0,silent:!0}).catch(()=>{})),await Rp.promises.rm(S,{force:!0}).catch(()=>{})}}else await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")'
    );
    return source;
}

module.exports = { apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
