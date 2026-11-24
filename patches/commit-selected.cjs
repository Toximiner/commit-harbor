// Commit selected files through an isolated index.
//
// `git commit --only <paths>` holds the real index lock while hooks run. Hooks such as
// pre-commit need to write that index, so the selected-file workflow deadlocks/fails.
// An alternate index preserves the selected-file semantics while allowing hooks to run
// without contending for the user's real index. After success, synchronize only the
// committed paths in the real index so unrelated staged changes remain staged.
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
        'async function t$(t,e,r){let i=new Pp,n=new QS,o=new e$;try{await t.git.exec(e,{cwd:t.root,detectors:[i,n,o]})}',
        'async function t$(t,e,r,a){let i=new Pp,n=new QS,o=new e$;try{await t.git.exec(e,{cwd:t.root,...a?{env:a}:{},detectors:[i,n,o]})}'
    );
    replaceOnce(
        'e.unversioned.length>0&&await t.git.exec(["add","--",...e.unversioned],{cwd:t.root});',
        ''
    );
    replaceOnce(
        ',t.info?.state==="MERGING"&&n.size>0?await t.git.exec(["add","-A","--",...n],{cwd:t.root}):n.size>0&&a.push("--only","--",...n),await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")',
        ';if(t.info?.state==="MERGING"&&n.size>0){await t.git.exec(["add","-A","--",...n],{cwd:t.root});await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")}else if(n.size>0){let c=await Rp.promises.mkdtemp(Uc.join((0,_O.tmpdir)(),"commitharbor-index-")),u=Uc.join(c,"index"),d={GIT_INDEX_FILE:u};try{await t.git.exec(["read-tree","HEAD"],{cwd:t.root,env:d});await t.git.exec(["add","-A","--",...n],{cwd:t.root,env:d});await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.",d);await t.git.exec(["reset","-q","HEAD","--",...n],{cwd:t.root})}finally{await Rp.promises.rm(c,{recursive:!0,force:!0})}}else await t$(t,a,"Nada que commitear: los archivos seleccionados no tienen cambios.")'
    );
    source = source.replace(
        'await t.git.exec(["read-tree","HEAD"],{cwd:t.root,env:d});',
        'await t.git.exec(t.info?.hasHead?["read-tree","HEAD"]:["read-tree","--empty"],{cwd:t.root,env:d});'
    );
    source = source.replace(
        'await t.git.exec(["reset","-q","HEAD","--",...n],{cwd:t.root})',
        't.info?.hasHead&&await t.git.exec(["reset","-q","HEAD","--",...n],{cwd:t.root})'
    );
    return source;
}

module.exports = { apply };
if (require.main === module) {
    const file = process.argv[2];
    fs.writeFileSync(file, apply(fs.readFileSync(file, 'utf8')));
}
