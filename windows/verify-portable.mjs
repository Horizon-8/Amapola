// Release smoke check: imports and serves the extracted package, never a real user database.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
for (const file of ['Amapola.exe', 'runtime/node.exe', 'runtime/NODE-LICENSE.txt', 'LEEME.html', 'INSTALLATION-FR.md', 'GOOGLE-CALENDAR.md', 'RELEASE-NOTES.md']) {
  assert.ok((await stat(path.join(root, file))).size > 0, `Missing release file: ${file}`);
}
assert.deepEqual((await readdir(path.join(root, 'runtime'))).sort(), ['NODE-LICENSE.txt', 'node.exe']);
const forbidden = /(^|\/)(?:\.git|\.local|datos|copias|node_modules)(\/|$)|(?:\.sqlite(?:-.*)?|\.db(?:-.*)?|\.amapola|\.log)$|(?:^|\/)(?:\.env(?:\..*)?|google-connection\.json.*|client_secret.*\.json|credentials.*\.json)$/i;
async function inspect(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    assert.ok(!forbidden.test(relative), `Private/generated content in release: ${relative}`);
    if (entry.isDirectory()) await inspect(path.join(dir, entry.name), relative + '/');
  }
}
await inspect(root);
const { startApp, appVersion } = await import(pathToFileURL(path.join(root, 'app/server.mjs')));
assert.equal(appVersion, manifest.version);
const temp = await mkdtemp(path.join(os.tmpdir(), 'amapola-release-check-'));
let app;
try {
  app = await startApp({ dataDir: temp, port: 0, open: false, googleFetch: async () => { throw new Error('Release check must not contact Google'); } });
  assert.equal(app.reused, false);
  for (const table of ['students', 'schedules', 'sessions', 'busy_blocks']) assert.equal(app.store.all(table).length, 0);
  const index = await fetch(app.url);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /lang="es"/);
  const cookie = index.headers.get('set-cookie').split(';')[0];
  const boot = await fetch(`${app.url}/api/bootstrap`, { headers: { Cookie: cookie } });
  assert.equal(boot.status, 200);
  const data = await boot.json();
  assert.equal(data.students.length, 0);
  assert.equal(data.schedules.length, 0);
  const health = await fetch(`${app.url}/api/health`);
  assert.equal((await health.json()).version, manifest.version);
  async function checkAssets(dir, prefix = '/') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) await checkAssets(path.join(dir, entry.name), prefix + entry.name + '/');
      else {
        const asset = await fetch(app.url + (entry.name === 'index.html' ? '/' : prefix + entry.name));
        assert.equal(asset.status, 200, `Unserved asset: ${prefix + entry.name}`);
        assert.ok((await asset.arrayBuffer()).byteLength > 0);
      }
    }
  }
  await checkAssets(path.join(root, 'app/public'));
  console.log(`Portable Amapola ${manifest.version}: complete package, empty database, HTTP and all UI assets OK.`);
} finally {
  await app?.close();
  await rm(temp, { recursive: true, force: true });
}
