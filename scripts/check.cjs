const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const pkg=require('../package.json');
assert.equal(pkg.name,'commit-harbor');assert.equal(pkg.publisher,'Toximiner');
const manifest=JSON.stringify(pkg.contributes);assert.ok(!manifest.includes('gitjet.'));
const commands=pkg.contributes.commands.map(c=>c.command);assert.equal(new Set(commands).size,commands.length);
let count=0;function walk(root){for(const item of fs.readdirSync(root,{withFileTypes:true})){const file=path.join(root,item.name);if(item.isDirectory())walk(file);else if(file.endsWith('.js')){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);count++;}}}
walk(path.join(__dirname,'../dist'));
for(const item of ['LICENSE.txt','NOTICE','THIRD_PARTY_NOTICES.md','UPSTREAM.md','assets/icon.png'])assert.ok(fs.existsSync(path.join(__dirname,'..',item)));
console.log('Validated identity, isolated commands, notices and syntax of '+count+' JavaScript bundles.');
