const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
test('merging the deploy manifest converges in one pass and keeps every deploy contribution',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'commit-harbor-manifest-'));
 try{
  fs.copyFileSync(path.join(root,'package.json'),path.join(dir,'package.json'));
  for(const run of ['run0','run1'])execFileSync('node',[path.join(root,'scripts','merge-deploy-manifest.cjs')],{cwd:dir,stdio:'pipe'}),fs.copyFileSync(path.join(dir,'package.json'),path.join(dir,run+'.json'));
  assert.equal(fs.readFileSync(path.join(dir,'run0.json'),'utf8'),fs.readFileSync(path.join(dir,'run1.json'),'utf8'));
  const merged=JSON.parse(fs.readFileSync(path.join(dir,'run0.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'deploy','manifest.json'),'utf8'));
  for(const command of manifest.commands)assert.ok(merged.contributes.commands.some(c=>c.command===command.command),command.command);
  assert.ok(merged.contributes.viewsContainers.activitybar.some(v=>v.id==='deployment'));
  assert.ok(merged.contributes.viewsContainers.panel.some(v=>v.id==='deploymentPanel'));
  assert.ok(merged.contributes.configuration.some(s=>s.id==='remoteDeployment'));
  assert.equal(merged.contributes.taskDefinitions[0].type,'deployment');
  assert.equal(merged.engines.vscode,manifest.engines);
  for(const event of manifest.activationEvents)assert.ok(merged.activationEvents.includes(event));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
