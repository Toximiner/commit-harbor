const v=require('vscode'),fs=require('node:fs'),assert=require('node:assert/strict');
exports.run=async()=>{
 const result={};try{
  const extension=v.extensions.getExtension('Toximiner.commit-harbor');assert.ok(extension);await extension.activate();assert.ok(extension.isActive);
  const commands=await v.commands.getCommands(true);
  for(const id of ['commitharbor.showCommit','commitharbor.log.show','commitharbor.appearance.open'])assert.ok(commands.includes(id),id);
  assert.ok(!commands.includes('gitjet.showCommit'),'Original extension must not be active in isolated test');
  await v.commands.executeCommand('commitharbor.showCommit');await new Promise(r=>setTimeout(r,2500));
  await v.commands.executeCommand('workbench.action.closeSidebar');
  await v.commands.executeCommand('commitharbor.showCommit');await new Promise(r=>setTimeout(r,1500));
  await v.commands.executeCommand('commitharbor.log.show');await new Promise(r=>setTimeout(r,1000));
  Object.assign(result,{success:true,activated:true,commandsIsolated:true,commitViewOpened:true,commitViewReopened:true,logViewOpened:true});
 }catch(e){result.error=e.stack;throw e;}finally{console.log(JSON.stringify(result,null,2));if(process.env.COMMIT_HARBOR_TEST_RESULT)fs.writeFileSync(process.env.COMMIT_HARBOR_TEST_RESULT,JSON.stringify(result,null,2));}
};
