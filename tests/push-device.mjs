import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const code = await fs.readFile('src/lib/push/device-status.ts', 'utf8');
const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { reminderDeviceState } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));

const base = { pushSupported: true, permission: 'granted', signedIn: true, deviceSubscribed: false, accountSubscribed: false };
assert.equal(reminderDeviceState({ ...base, deviceSubscribed: true, accountSubscribed: true }), 'ready');
assert.equal(reminderDeviceState({ ...base, accountSubscribed: true }), 'account-only');
assert.equal(reminderDeviceState(base), 'off');
assert.equal(reminderDeviceState({ ...base, signedIn: false, accountSubscribed: true }), 'signed-out');
assert.equal(reminderDeviceState({ ...base, permission: 'denied', deviceSubscribed: true }), 'blocked');
assert.equal(reminderDeviceState({ ...base, pushSupported: false, permission: 'unsupported' }), 'unsupported');
assert.equal(reminderDeviceState({ ...base, permission: 'default' }), 'off');

console.log('Push device status checks passed.');
