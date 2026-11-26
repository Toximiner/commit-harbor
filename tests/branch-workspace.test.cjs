const test=require('node:test'),assert=require('node:assert/strict');
const {installBranchWorkspaceRestore}=require('../patches/branch-workspace.cjs');
class FakeUri{
 constructor(fsPath){this.fsPath=fsPath}
 static parse(value){return new FakeUri(value.replace(/^file:\/\//,''))}
 toString(){return `file://${this.fsPath}`}
 get scheme(){return `file`}
}
function makeEnv({snapshot={},initialBranch=undefined}={}){
 const repo={rootUri:{fsPath:`/w/harbor`,toString:()=>'file:///w/harbor'},state:{HEAD:{name:initialBranch},onDidChange(fn){repo._change=fn;return{dispose(){}}}}};
 const gitApi={repositories:[repo],onDidOpenRepository(){return{dispose(){}}}};
 const calls={close:[],show:[],options:[],updates:0};
 const saved={};
 let groups=[];
 const vscode={
  ViewColumn:{One:1,Two:2,Three:3},
  workspace:{getConfiguration:()=>({get:()=>true}),openTextDocument:async uri=>({uri})},
  extensions:{getExtension:()=>({isActive:true,exports:{getAPI:()=>gitApi}})},
  window:{tabGroups:{get all(){return groups},close:async(tabs,force)=>{calls.close.push([tabs,force]);return true},onDidChangeTabs(){return{dispose(){}}}},showTextDocument:async(uri,options)=>{calls.show.push(uri.toString());calls.options.push(options);return{}}},
  Uri:FakeUri
 };
 const context={workspaceState:{get:(key,fallback)=>key==='commitHarbor.branchEditors.v1'?snapshot:fallback,update:async(key,value)=>{saved[key]=value;calls.updates++}},subscriptions:[]};
 const fileTab=(fsPath,dirty=false)=>({isDirty:dirty,input:dirty?{modified:new FakeUri(fsPath),original:new FakeUri(fsPath)}:{uri:new FakeUri(fsPath)}});
 installBranchWorkspaceRestore(context,vscode);
 return {repo,setGroups:groups2=>{groups=groups2},calls,saved,fileTab};
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('git initial load is not a branch switch',async()=>{
 const env=makeEnv({snapshot:{'file:///w/harbor':{main:['file:///w/harbor/a.py']}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/a.py')]},{tabs:[env.fileTab('/w/harbor/b.py')]}]);
 env.repo.state.HEAD.name='main';
 env.repo._change();
 await wait(450);
 assert.equal(env.calls.close.length,0,`expected no tab close, got ${JSON.stringify(env.calls.close)}`);
 assert.equal(env.calls.show.length,0,`expected no file open, got ${JSON.stringify(env.calls.show)}`);
 assert.ok(env.calls.updates>0,'snapshot should be refreshed on initial load');
});
test('a real switch keeps remembered files in their group and closes only unremembered clean tabs',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:['file:///w/harbor/x.py','file:///w/harbor/z.py']}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]},{tabs:[env.fileTab('/w/harbor/y.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.equal(env.calls.close.length,1,'y.py tab should be the only one closed');
 assert.deepEqual(env.calls.close[0][0].map(tab=>tab.input.uri.fsPath),['/w/harbor/y.py']);
 assert.equal(env.calls.close[0][1],true,'clean tabs are force-closed');
 assert.deepEqual(env.calls.show,['file:///w/harbor/z.py'],'only the missing remembered file is opened');
});
test('switching to a branch saved with no remembered files closes repo tabs',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:[]}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.deepEqual(env.calls.close[0][0].map(tab=>tab.input.uri.fsPath),['/w/harbor/x.py']);
 assert.deepEqual(env.calls.show,[]);
});
test('switching to a branch with no saved snapshot keeps the current tabs',async()=>{
  const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{a:['file:///w/harbor/x.py']}}});
  env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]},{tabs:[env.fileTab('/w/harbor/y.py')]}]);
  env.repo.state.HEAD.name='b';
  env.repo._change();
  await wait(450);
  assert.equal(env.calls.close.length,0,'no tab may be closed when the target branch was never saved');
  assert.deepEqual(env.calls.show,[]);
  assert.deepEqual(env.saved['commitHarbor.branchEditors.v1']['file:///w/harbor'].b,
    [['file:///w/harbor/x.py'],['file:///w/harbor/y.py']],
    'the kept layout is saved as the new branch snapshot');
});
test('dirty tabs are never closed on a branch switch',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:[]}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py',true)]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.equal(env.calls.close.length,0);
 assert.deepEqual(env.calls.show,[]);
});
test('a v2 snapshot restores files into their remembered split columns',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:[['file:///w/harbor/a.py'],['file:///w/harbor/b.py']]}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.deepEqual(env.calls.close[0][0].map(tab=>tab.input.uri.fsPath),['/w/harbor/x.py']);
 assert.deepEqual(env.calls.show,['file:///w/harbor/a.py','file:///w/harbor/b.py']);
 assert.equal(env.calls.options[0].viewColumn,1,'first snapshot group restores into the left column');
 assert.equal(env.calls.options[1].viewColumn,2,'second snapshot group restores into the right column');
});
test('a remembered file that stayed open keeps its group and the other half is restored',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:[['file:///w/harbor/a.py'],['file:///w/harbor/b.py']]}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/a.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.equal(env.calls.close.length,0,'a.py is remembered and must not be closed');
 assert.deepEqual(env.calls.show,['file:///w/harbor/b.py']);
 assert.equal(env.calls.options[0].viewColumn,2,'the missing half opens into its remembered column');
});
test('legacy v1 snapshots restore into the active group without a view column',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:['file:///w/harbor/z.py']}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.deepEqual(env.calls.show,['file:///w/harbor/z.py']);
 assert.equal(env.calls.options[0].viewColumn,undefined,'flat snapshots keep the old active-group behavior');
});
test('save records one file list per editor group, keeping empty column positions',async()=>{
 const env=makeEnv({initialBranch:'main'});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/a.py')]},{tabs:[]},{tabs:[env.fileTab('/w/harbor/b.py')]}]);
 env.repo.state.HEAD.name='main';
 env.repo._change();
 await wait(450);
 const saved=env.saved['commitHarbor.branchEditors.v1']['file:///w/harbor'].main;
 assert.deepEqual(saved,[['file:///w/harbor/a.py'],[],['file:///w/harbor/b.py']]);
});
