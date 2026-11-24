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
 const calls={close:[],show:[],updates:0};
 let groups=[];
 const vscode={
  workspace:{getConfiguration:()=>({get:()=>true}),openTextDocument:async uri=>({uri})},
  extensions:{getExtension:()=>({isActive:true,exports:{getAPI:()=>gitApi}})},
  window:{tabGroups:{get all(){return groups},close:async(tabs,force)=>{calls.close.push([tabs,force]);return true},onDidChangeTabs(){return{dispose(){}}}},showTextDocument:async uri=>{calls.show.push(uri.toString());return{}}},
  Uri:FakeUri
 };
 const context={workspaceState:{get:(key,fallback)=>key==='commitHarbor.branchEditors.v1'?snapshot:fallback,update:async()=>{calls.updates++}},subscriptions:[]};
 const fileTab=(fsPath,dirty=false)=>({isDirty:dirty,input:dirty?{modified:new FakeUri(fsPath),original:new FakeUri(fsPath)}:{uri:new FakeUri(fsPath)}});
 installBranchWorkspaceRestore(context,vscode);
 return {repo,setGroups:groups2=>{groups=groups2},calls,fileTab};
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
test('switching to a branch with no remembered files closes repo tabs',async()=>{
 const env=makeEnv({initialBranch:'a',snapshot:{'file:///w/harbor':{b:[]}}});
 env.setGroups([{tabs:[env.fileTab('/w/harbor/x.py')]}]);
 env.repo.state.HEAD.name='b';
 env.repo._change();
 await wait(450);
 assert.deepEqual(env.calls.close[0][0].map(tab=>tab.input.uri.fsPath),['/w/harbor/x.py']);
 assert.deepEqual(env.calls.show,[]);
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
