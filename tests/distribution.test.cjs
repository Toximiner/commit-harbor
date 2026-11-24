const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('entrypoints, contribution commands and webview imports exist',()=>{
 const p=require('../package.json');assert.ok(fs.existsSync(path.join(root,p.main)));
 assert.ok(p.contributes.commands.some(c=>c.command.startsWith('commitharbor.')));
 const chunks=path.join(root,'dist/webview/chunks');for(const name of fs.readdirSync(chunks).filter(n=>n.endsWith('.js'))){const text=fs.readFileSync(path.join(chunks,name),'utf8');for(const m of text.matchAll(/from["'](\.\/[\w.-]+\.js)["']/g))assert.ok(fs.existsSync(path.resolve(chunks,m[1])),m[1]);}
});
test('build includes Commit view state patches and cannot silently patch another upstream version',()=>{
 const {apply}=require('../patches/commit-height.cjs');assert.throws(()=>apply('unrelated version'),/patch target changed/);
 const text=fs.readFileSync(path.join(root,'dist/webview/chunks/commit-Bw38ouX0.js'),'utf8');assert.ok(text.includes('commitHarborMessageHeight'));assert.ok(text.includes('saveCommitHarborHeight(__commitHarborTransport,e,Lt+It+zt)'));assert.ok(text.includes('commitHarborCheckedFiles'));assert.ok(text.includes('restoreChecks(n)'));assert.ok(text.includes('commitHarborBranchPickerResize'));assert.ok(text.includes('commitHarborShareVsCodeApi'));assert.ok(text.includes('commitHarborDeployMenuItems'));assert.ok(!text.includes('commitHarborCommitDeployBtn'));
  const {apply:applyResize}=require('../patches/branch-picker-resize.cjs');assert.throws(()=>applyResize('unrelated version'),/commit-height-patched/);
  const {apply:applyDeploy}=require('../patches/commit-deploy.cjs');assert.throws(()=>applyDeploy('unrelated version'),/commit-height-patched/);
  const {apply:applyDeployMenu}=require('../patches/commit-deploy-menu.cjs');assert.throws(()=>applyDeployMenu('unrelated version'),/patch target changed/);
  const {apply:applyTree}=require('../patches/branch-tree-memory.cjs');assert.throws(()=>applyTree('unrelated version'),/patch target changed/);
  const {apply:applyRetain}=require('../patches/commit-retain.cjs');assert.throws(()=>applyRetain('unrelated version'),/patch target changed/);
  const ui=fs.readFileSync(path.join(root,'dist/webview/chunks/ui-BbbfItdn.js'),'utf8');assert.ok(ui.includes('commitHarborBranchTreeSaved'));assert.ok(ui.includes('commitHarborBranchTreePersist'));
 const extension=fs.readFileSync(path.join(root,'dist/extension.js'),'utf8');assert.ok(extension.includes('installBranchWorkspaceRestore'));assert.ok(extension.includes('commitHarbor.branchEditors.v1'));assert.ok(extension.includes('registerToolWindow("commit",this,{page:{entry:"commit",title:"Commit"},retainContext:!0}'));
});
test('upstream copyright and third-party notices remain available',()=>{
 const notice=fs.readFileSync(path.join(root,'NOTICE'),'utf8');assert.ok(notice.includes('Santiago Bárcenas'));assert.ok(notice.includes('JetBrains'));assert.ok(notice.includes('Commit Harbor downstream'));
 assert.ok(fs.readFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),'utf8').includes('@codemirror'));
});
test('running the build twice produces the same runtime bundles',()=>{
 const file=path.join(root,'dist/webview/chunks/commit-Bw38ouX0.js'),before=fs.readFileSync(file);
 const extension=path.join(root,'dist/extension.js'),extensionBefore=fs.readFileSync(extension);
 cp.execFileSync('python3',[path.join(root,'scripts/build.py')]);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readFileSync(extension),extensionBefore);
});
