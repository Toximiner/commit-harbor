#!/usr/bin/env node
// Merge the vendored deploy module manifest (deploy/manifest.json) into the root package.json.
// Deterministic and idempotent: re-running produces the same file. Every deploy.* entry is
// replaced from the manifest; host (commitharbor.*) entries are never touched. Run after
// updating the vendored module in deploy/ (and its manifest.json), then re-run the build.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const hostPath = path.join(ROOT, 'package.json');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'manifest.json'), 'utf8'));
const host = JSON.parse(fs.readFileSync(hostPath, 'utf8'));

// Any host entry whose id starts with "deploy" belongs to the deploy module and is replaced.
// The host declares no ids in that prefix, so the filter only ever touches module entries.
const isDeploy = (id) => typeof id === 'string' && id.startsWith('deploy');
const mergeList = (list, keep, add) => [...(Array.isArray(list) ? list.filter(keep) : []), ...(add || [])];

const c = host.contributes;
c.commands = mergeList(c.commands, (x) => !isDeploy(x.command), manifest.commands);
c.submenus = mergeList(c.submenus, (x) => !isDeploy(x.id), manifest.submenus);
c.keybindings = mergeList(c.keybindings, (x) => !isDeploy(x.command), manifest.keybindings);
for (const area of ['activitybar', 'panel']) {
  c.viewsContainers[area] = mergeList(c.viewsContainers[area], (x) => !isDeploy(x.id), manifest.viewsContainers[area]);
}
c.views = c.views || {};
for (const [container, views] of Object.entries(manifest.views)) {
  c.views[container] = mergeList(c.views[container], (x) => !isDeploy(x.id), views);
}
c.viewsWelcome = mergeList(c.viewsWelcome, (x) => !isDeploy(x.view), manifest.viewsWelcome);
c.menus = c.menus || {};
for (const [section, entries] of Object.entries(manifest.menus)) {
  c.menus[section] = mergeList(c.menus[section], (x) => !isDeploy(x.command) && !isDeploy(x.submenu), entries);
}
c.configuration = mergeList(c.configuration, (x) => x.id !== 'remoteDeployment', [manifest.configuration]);
c.taskDefinitions = mergeList(c.taskDefinitions, (x) => x.type !== 'deployment', manifest.taskDefinitions);
c.jsonValidation = mergeList(c.jsonValidation, (x) => x.fileMatch !== '.vscode/deployment.json', manifest.jsonValidation);
c.resourceLabelFormatters = mergeList(c.resourceLabelFormatters, (x) => x.scheme !== 'deploy-remote', manifest.resourceLabelFormatters);

host.activationEvents = mergeList(host.activationEvents, (e) => !manifest.activationEvents.includes(e), manifest.activationEvents);
host.keywords = mergeList(host.keywords, (k) => !manifest.keywords.includes(k), manifest.keywords);
host.extensionKind = mergeList(host.extensionKind, (k) => !manifest.extensionKind.includes(k), manifest.extensionKind);

const version = (s) => s.replace(/^\^/, '').split('.').map(Number);
const [ha, hb] = version(host.engines.vscode);
const [ma, mb] = version(manifest.engines);
if (ha < ma || (ha === ma && hb < mb)) host.engines.vscode = manifest.engines;

const untrusted = (host.capabilities = host.capabilities || {}).untrustedWorkspaces || (host.capabilities.untrustedWorkspaces = {});
untrusted.restrictedConfigurations = mergeList(
  untrusted.restrictedConfigurations,
  (k) => !manifest.restrictedConfigurations.includes(k),
  manifest.restrictedConfigurations
);

// The merged host must declare every command the module registers.
const declared = new Set(c.commands.map((x) => x.command));
for (const x of manifest.commands) {
  if (!declared.has(x.command)) throw new Error('merge missed command ' + x.command);
}

fs.writeFileSync(hostPath, JSON.stringify(host, null, 2) + '\n');
console.log(
  'Merged deploy manifest into package.json: ' + manifest.commands.length + ' commands, ' +
  manifest.keybindings.length + ' keybindings, ' + Object.keys(manifest.menus).length + ' menu sections, ' +
  Object.keys(manifest.views).length + ' view containers.'
);
