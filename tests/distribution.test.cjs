const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('entrypoints, contribution commands and webview imports exist',()=>{
 const p=require('../package.json');assert.ok(fs.existsSync(path.join(root,p.main)));
 assert.ok(p.contributes.commands.some(c=>c.command.startsWith('commitharbor.')));
 const chunks=path.join(root,'dist/webview/chunks');for(const name of fs.readdirSync(chunks).filter(n=>n.endsWith('.js'))){const text=fs.readFileSync(path.join(chunks,name),'utf8');for(const m of text.matchAll(/from["'](\.\/[\w.-]+\.js)["']/g))assert.ok(fs.existsSync(path.resolve(chunks,m[1])),m[1]);}
});
test('build includes the height patch and cannot silently patch another upstream version',()=>{
 const {apply}=require('../patches/commit-height.cjs');assert.throws(()=>apply('unrelated version'),/patch target changed/);
 const text=fs.readFileSync(path.join(root,'dist/webview/chunks/commit-Bw38ouX0.js'),'utf8');assert.ok(text.includes('commitHarborMessageHeight'));assert.ok(text.includes('saveCommitHarborHeight(__commitHarborTransport,e,Lt+It+zt)'));
});
test('upstream copyright and third-party notices remain available',()=>{
 const notice=fs.readFileSync(path.join(root,'NOTICE'),'utf8');assert.ok(notice.includes('Santiago Bárcenas'));assert.ok(notice.includes('JetBrains'));assert.ok(notice.includes('Commit Harbor downstream'));
 assert.ok(fs.readFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),'utf8').includes('@codemirror'));
});
test('running the build twice produces the same runtime bundles',()=>{
 const file=path.join(root,'dist/webview/chunks/commit-Bw38ouX0.js'),before=fs.readFileSync(file);
 cp.execFileSync('python3',[path.join(root,'scripts/build.py')]);assert.deepEqual(fs.readFileSync(file),before);
});
