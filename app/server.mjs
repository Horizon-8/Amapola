import http from 'node:http';
import { readFileSync, mkdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { Store, AppError, validateArchive, todayIn, timeIn } from './domain.mjs';
import { Backups } from './backup.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
export const appVersion = '0.4.1';
const buildHash = createHash('sha256');
for (const file of ['server.mjs', 'domain.mjs', 'backup.mjs', 'public/class-utils.mjs']) buildHash.update(readFileSync(path.join(root, file)));
export const buildId = buildHash.digest('hex');
export function openBrowser(url) {
  const child = process.platform === 'win32'
    ? spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, windowsHide: true, stdio: 'ignore' })
    : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.on('error', () => {}); child.unref();
}
export async function startApp({ dataDir, port = 3847, open = false, now, fetchImpl = fetch } = {}) {
  dataDir ??= process.env.AMAPOLA_DATA_DIR || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'), 'Amapola', 'datos');
  dataDir = path.resolve(dataDir); mkdirSync(dataDir, { recursive: true });
  const id = createHash('sha256').update(dataDir.toLowerCase()).digest('hex').slice(0, 20);
  const lockfile = path.join(dataDir, 'instance.json');
  if (existsSync(lockfile)) {
    let lock;
    try { lock = JSON.parse(readFileSync(lockfile, 'utf8')); } catch { throw new AppError('No se puede leer el estado de Amapola. Consulta el archivo instance.json en la carpeta de datos.', 503); }
    let health = null;
    const previousUrl = `http://127.0.0.1:${lock.port}`;
    if (Number.isInteger(lock.port) && lock.port > 0 && lock.port < 65536) {
      try {
        const res = await fetchImpl(`${previousUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) health = await res.json();
      } catch {}
    }
    if (health?.app === 'amapola' && health.instance === id) {
      if (health.version === appVersion && health.build === buildId) {
        if (open) openBrowser(previousUrl);
        return { reused: true, url: previousUrl, close: async () => {} };
      }
      // Old processes still serve the new HTML from disk but retain old routes
      // and database logic. Close via their authenticated API before upgrading.
      try {
        const index = await fetchImpl(previousUrl, { signal: AbortSignal.timeout(5000) });
        const cookie = index.headers.get('set-cookie')?.split(';')[0];
        await index.body?.cancel();
        if (!index.ok || !cookie) throw new Error();
        const boot = await fetchImpl(`${previousUrl}/api/bootstrap`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(5000) });
        if (!boot.ok) throw new Error();
        const { csrf } = await boot.json();
        if (typeof csrf !== 'string' || !csrf) throw new Error();
        const stopped = await fetchImpl(`${previousUrl}/api/shutdown`, { method: 'POST', headers: {
          Cookie: cookie, Origin: previousUrl, 'Content-Type': 'application/json', 'X-Amapola-Token': csrf,
        }, body: '{}', signal: AbortSignal.timeout(5000) });
        if (!stopped.ok) throw new Error();
        await stopped.body?.cancel();
        const deadline = Date.now() + 10000;
        while (existsSync(lockfile) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
        if (existsSync(lockfile)) throw new Error();
      } catch {
        throw new AppError('No se pudo cerrar la versión anterior de Amapola. Espera a que termine su operación y vuelve a abrir Amapola.exe.', 409);
      }
    } else {
      if (lock.pid) {
        try { process.kill(lock.pid, 0); throw new AppError('Amapola ya se está iniciando. Espera unos segundos y vuelve a abrirla.', 409); }
        catch (e) { if (e instanceof AppError) throw e; if (e.code !== 'ESRCH') throw new AppError('No se puede verificar la instancia anterior de Amapola.', 409); }
      }
      unlinkSync(lockfile);
    }
  }
  // Exclusive claim before opening SQLite prevents two launches against one data directory.
  try { writeFileSync(lockfile, JSON.stringify({ pid: process.pid, port: 0 }), { flag: 'wx', mode: 0o600 }); }
  catch { throw new AppError('Amapola ya se está iniciando. Inténtalo de nuevo.', 409); }
  let store;
  try { store = new Store(path.join(dataDir, 'amapola.sqlite')); }
  catch (e) { unlinkSync(lockfile); throw e; }
  const backups = new Backups(store, dataDir);
  const secret = randomBytes(32).toString('hex');
  const cookieName = 'amapola_local';
  let actualPort, origin, destructiveBusy = false;
  const send = (res, status, data, extra = {}) => {
    const body = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
    res.writeHead(status, { 'Content-Type': Buffer.isBuffer(data) ? 'application/octet-stream' : 'application/json; charset=utf-8', 'Content-Length': body.length, ...extra }); res.end(body);
  };
  async function body(req, binary = false) {
    const type = String(req.headers['content-type'] || '').split(';')[0];
    if (!binary && type !== 'application/json') throw new AppError('Formato de solicitud no válido.', 415);
    const limit = binary ? 16 * 1024 * 1024 : 128 * 1024; const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > limit) throw new AppError('El archivo o formulario es demasiado grande.', 413); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks);
    if (binary) return bytes;
    try { const data = JSON.parse(bytes.toString()); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
    catch { throw new AppError('Formulario no válido.'); }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (![`127.0.0.1:${actualPort}`, `localhost:${actualPort}`].includes(req.headers.host)) throw new AppError('Host no autorizado.', 403);
      const url = new URL(req.url, origin), route = url.pathname, method = req.method;
      if (route === '/api/health' && method === 'GET') return send(res, 200, { app: 'amapola', version: appVersion, build: buildId, instance: id });
      if (!route.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') throw new AppError('Método no permitido.', 405);
        const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
        files['/class-utils.mjs'] = ['class-utils.mjs', 'text/javascript; charset=utf-8'];
        files['/calendar-interactions.mjs'] = ['calendar-interactions.mjs', 'text/javascript; charset=utf-8'];
        const asset = files[route]; if (!asset) throw new AppError('Página no encontrada.', 404);
        if (route === '/') res.setHeader('Set-Cookie', `${cookieName}=${secret}; Path=/; HttpOnly; SameSite=Strict`);
        const bytes = readFileSync(path.join(publicDir, asset[0]));
        res.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': bytes.length }); return res.end(method === 'HEAD' ? undefined : bytes);
      }
      const cookies = String(req.headers.cookie || '').split(';').map(s => s.trim());
      if (!cookies.includes(`${cookieName}=${secret}`)) throw new AppError('Vuelve a abrir Amapola para conectar esta pestaña.', 401);
      if (!['GET', 'HEAD'].includes(method)) {
        const allowed = [`http://127.0.0.1:${actualPort}`, `http://localhost:${actualPort}`];
        if (!allowed.includes(req.headers.origin) || req.headers['x-amapola-token'] !== secret) throw new AppError('Solicitud no autorizada. Recarga la página.', 403);
        if (destructiveBusy) throw new AppError('Hay una restauración o eliminación en curso. Espera un momento.', 409);
      }
      if (route === '/api/bootstrap' && method === 'GET') {
        store.freezePast();
        return send(res, 200, { csrf: secret, settings: store.settings(), students: store.all('students'), schedules: store.all('schedules'), today: todayIn(store.settings().timezone), time: timeIn(store.settings().timezone), dataDir, backupError: backups.lastError });
      }
      if (route === '/api/occurrences' && method === 'GET') return send(res, 200, store.occurrences(url.searchParams.get('from'), url.searchParams.get('to'), url.searchParams.get('student') || ''));
      if (route === '/api/reports' && method === 'GET') return send(res, 200, store.report(url.searchParams.get('week') || todayIn(store.settings().timezone)));
      if (route === '/api/classes' && method === 'GET') return send(res, 200, store.classLedger(Object.fromEntries(url.searchParams)));
      if (route === '/api/conflicts' && method === 'POST') return send(res, 200, store.conflicts(await body(req)));
      if (route === '/api/busy-blocks' && method === 'GET') return send(res, 200, store.busyBlocks(url.searchParams.get('from'), url.searchParams.get('to')));
      if (route === '/api/busy-blocks' && method === 'POST') { const row=store.saveBusyBlock(await body(req)); backups.schedule(); return send(res,201,row); }
      const busyMatch = route.match(/^\/api\/busy-blocks\/([^/]+)$/);
      if (busyMatch && method === 'PUT') { const row=store.saveBusyBlock(await body(req),decodeURIComponent(busyMatch[1])); backups.schedule(); return send(res,200,row); }
      if (busyMatch && method === 'DELETE') {
        const value=await body(req); if(value.confirm!==true) throw new AppError('Confirma la eliminación.');
        destructiveBusy=true;
        try { await backups.snapshot('antes-de-eliminar'); store.deleteBusyBlock(decodeURIComponent(busyMatch[1])); backups.schedule(); return send(res,200,{ok:true}); }
        finally { destructiveBusy=false; }
      }
      const sessionAction = route.match(/^\/api\/sessions\/([^/]+)\/(payment|change)$/);
      if (sessionAction && method === 'PUT') {
        const value = await body(req), sessionId = decodeURIComponent(sessionAction[1]);
        const row = sessionAction[2] === 'payment' ? store.savePayment(value, sessionId) : store.changeSession(value, sessionId);
        backups.schedule(); return send(res, 200, row);
      }
      if (route === '/api/students' && method === 'POST') { const row = store.saveStudent(await body(req)); backups.schedule(); return send(res, 201, row); }
      const history = route.match(/^\/api\/students\/([^/]+)\/history$/);
      if (history && method === 'GET') return send(res, 200, store.history(decodeURIComponent(history[1])));
      const match = route.match(/^\/api\/(students|schedules|sessions)\/(.+)$/);
      if (match) {
        const [, table, rawId] = match, recordId = decodeURIComponent(rawId);
        if (method === 'PUT') {
          const v = await body(req); let row;
          if (table === 'students') row = store.saveStudent(v, recordId);
          if (table === 'schedules') row = store.saveSchedule(v, recordId);
          if (table === 'sessions') row = store.saveSession(v, recordId);
          backups.schedule(); return send(res, 200, row);
        }
        if (method === 'DELETE' && table !== 'sessions') {
          const v = await body(req); if (v.confirm !== true) throw new AppError('Confirma la eliminación.');
          destructiveBusy = true;
          try {
            await backups.snapshot('antes-de-eliminar');
            if (table === 'students') store.deleteStudent(recordId); else store.deleteSchedule(recordId);
            backups.schedule(); return send(res, 200, { ok: true });
          } finally { destructiveBusy = false; }
        }
      }
      if (route === '/api/schedules' && method === 'POST') { const row = store.saveSchedule(await body(req)); backups.schedule(); return send(res, 201, row); }
      if (route === '/api/settings' && method === 'PUT') { const row = store.saveSettings(await body(req)); backups.schedule(); return send(res, 200, row); }
      if (route === '/api/backups' && method === 'GET') return send(res, 200, { files: await backups.list(), error: backups.lastError });
      if (route === '/api/backups' && method === 'POST') { const v = await body(req); return send(res, 200, await backups.send(typeof v.token === 'string' ? v.token : '')); }
      if (route === '/api/backups/local' && method === 'POST') { await body(req); const copy = await backups.snapshot(); return send(res, 200, { filename: copy.filename }); }
      if (route.startsWith('/api/backups/file/') && method === 'GET') {
        const name = decodeURIComponent(route.slice('/api/backups/file/'.length));
        const bytes = await backups.read(name);
        return send(res, 200, bytes, { 'Content-Disposition': `attachment; filename="${name}"` });
      }
      if (route === '/api/restore/preview' && method === 'POST') {
        let raw; try { raw = JSON.parse(gunzipSync(await body(req, true), { maxOutputLength: 64 * 1024 * 1024 }).toString()); } catch { throw new AppError('No se puede leer esta copia .amapola.'); }
        const v = validateArchive(raw);
        return send(res, 200, { createdAt: raw.createdAt, students: v.students.length, schedules: v.schedules.length, sessions: v.sessions.length, busyBlocks: v.busy_blocks.length });
      }
      if (route === '/api/restore' && method === 'POST') {
        if (req.headers['x-amapola-confirm'] !== 'RESTAURAR') throw new AppError('Confirma la restauración.');
        let raw; try { raw = JSON.parse(gunzipSync(await body(req, true), { maxOutputLength: 64 * 1024 * 1024 }).toString()); } catch { throw new AppError('No se puede leer esta copia .amapola.'); }
        validateArchive(raw);
        destructiveBusy = true;
        try {
          const safety = await backups.snapshot('antes-de-restaurar');
          store.importData(raw); backups.schedule();
          return send(res, 200, { ok: true, safetyCopy: safety.filename });
        } finally { destructiveBusy = false; }
      }
      if (route === '/api/shutdown' && method === 'POST') { await body(req); send(res, 200, { ok: true }); setTimeout(() => close().then(() => { if (process.env.NODE_TEST_CONTEXT === undefined) process.exit(0); }), 150).unref(); return; }
      throw new AppError('Acción no encontrada.', 404);
    } catch (e) {
      if (!res.headersSent) send(res, e instanceof AppError ? e.status : 500, { error: e instanceof AppError ? e.message : 'No se pudo completar la operación. Consulta el registro local de Amapola.' });
      else res.end();
      if (!(e instanceof AppError)) console.error('amapola_error', e.code || e.name); // Never log submitted personal data or credentials.
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  } catch (e) {
    if (e.code === 'EADDRINUSE' && port !== 0) {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    } else { store.close(); unlinkSync(lockfile); throw e; }
  }
  actualPort = server.address().port; origin = `http://127.0.0.1:${actualPort}`;
  writeFileSync(lockfile, JSON.stringify({ pid: process.pid, port: actualPort }), { mode: 0o600 });
  let closing = false;
  async function close() {
    if (closing) return; closing = true; clearTimeout(backups.timer);
    await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
    try { await backups.automatic(); } catch {}
    store.close(); try { unlinkSync(lockfile); } catch {}
  }
  console.log(`Amapola disponible en ${origin}`);
  if (open) openBrowser(origin);
  return { url: origin, server, store, backups, close, dataDir, reused: false };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--background')) {
    const dir = process.env.AMAPOLA_DATA_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'Amapola', 'datos');
    mkdirSync(dir, { recursive: true });
    const log = path.join(dir, 'amapola.log');
    if (existsSync(log) && readFileSync(log).length > 1024 * 1024) writeFileSync(log, '');
    const record = (...items) => { try { writeFileSync(log, `${new Date().toISOString()} ${items.join(' ')}\n`, { flag: 'a', mode: 0o600 }); } catch {} };
    console.log = record; console.error = record;
  }
  startApp({ open: process.argv.includes('--open'), port: Number(process.env.AMAPOLA_PORT || 3847) }).then(app => {
    if (app.reused) return;
    const stop = () => app.close().then(() => process.exit(0));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  }).catch(e => { console.error(e instanceof AppError ? e.message : 'No se pudo iniciar Amapola.', e.code || ''); process.exitCode = 1; });
}
