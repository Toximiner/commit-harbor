#!/usr/bin/env node
const fs = require('node:fs');

const file = process.argv[2];
if (!file) throw new Error('Usage: hunk-gutter.cjs <extension.js>');

let source = fs.readFileSync(file, 'utf8');
const oldSubscriptions = 'ye.workspace.onDidSaveTextDocument(()=>this.scheduleRefresh()),r.onDidChange';
const newSubscriptions = 'ye.workspace.onDidSaveTextDocument(()=>this.scheduleRefresh()),ye.workspace.onDidChangeConfiguration(o=>{o.affectsConfiguration("commitharbor.editor.showHunkInclusionGutter")&&this.scheduleRefresh()}),r.onDidChange';
const oldRefresh = 'async refresh(){for(let e of ye.window.visibleTextEditors){let r=this.locate(e.document.uri);';
const newRefresh = 'async refresh(){for(let e of ye.window.visibleTextEditors){if(!ye.workspace.getConfiguration("commitharbor").get("editor.showHunkInclusionGutter",!1)){e.setDecorations(this.included,[]),e.setDecorations(this.excludedDecoration,[]);continue}let r=this.locate(e.document.uri);';

for (const [oldText, newText, label] of [
  [oldSubscriptions, newSubscriptions, 'configuration change listener'],
  [oldRefresh, newRefresh, 'conditional gutter rendering'],
]) {
  const occurrences = source.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error('Expected exactly one ' + label + ' target, found ' + occurrences);
  }
  source = source.replace(oldText, newText);
}

fs.writeFileSync(file, source);
