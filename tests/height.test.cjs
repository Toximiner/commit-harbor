const test=require('node:test'),assert=require('node:assert/strict');
const {readCommitHarborHeight:read,saveCommitHarborHeight:save}=require('../patches/commit-height.cjs');
function view(store){return {getState:()=>JSON.parse(JSON.stringify(store.value)),setState:value=>{store.value=JSON.parse(JSON.stringify(value));}};}
test('restores a user resize after the webview is destroyed and recreated',()=>{
 const store={value:{selection:['sample.txt'],message:'Unrelated draft'}};
 assert.equal(read(view(store)),132);assert.equal(save(view(store),600,80),520);
 assert.equal(read(view(store)),520);assert.deepEqual(store.value.selection,['sample.txt']);assert.equal(store.value.message,'Unrelated draft');
});
test('keeps independent state for different views',()=>{const a={value:{}},b={value:{}};save(view(a),500,80);assert.equal(read(view(a)),420);assert.equal(read(view(b)),132);});
test('enforces the minimum and safely handles invalid stored values',()=>{
 const store={value:{}};assert.equal(save(view(store),30,80),60);assert.equal(read(view(store)),60);
 for(const value of [-1,0,59,'500',null,{},NaN,Infinity])assert.equal(read({getState:()=>({commitHarborMessageHeight:value})}),132);
 assert.equal(read({}),132);
});
test('invalid resize event retains the last valid height',()=>{const store={value:{}};save(view(store),500,80);assert.equal(save(view(store),NaN,80),420);assert.equal(read(view(store)),420);});
