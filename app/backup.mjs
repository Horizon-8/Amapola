import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdir, writeFile, readFile, readdir, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, validateArchive } from './domain.mjs';

export function decodeArchive(bytes) {
  try { return validateArchive(JSON.parse(gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8'))); }
  catch (e) { if (e instanceof AppError) throw e; throw new AppError('No se puede leer esta copia. Selecciona un archivo .amapola válido.'); }
}
export class Backups {
  constructor(store, dataDir, fetchImpl = fetch) { this.store = store; this.dir = path.join(dataDir, 'copias'); this.fetch = fetchImpl; this.busy = false; this.timer = null; this.lastError = ''; }
  async snapshot(prefix = 'manual') {
    await mkdir(this.dir, { recursive: true });
    const payload = this.store.exportData();
    const bytes = gzipSync(Buffer.from(JSON.stringify(payload)));
    const filename = `amapola-${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 6)}.amapola`;
    await writeFile(path.join(this.dir, filename), bytes, { flag: 'wx', mode: 0o600 });
    this.lastError = '';
    return { filename, bytes, createdAt: payload.createdAt };
  }
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.automatic().catch(() => { this.lastError = 'No se pudo crear la copia automática. Comprueba el espacio disponible y exporta una copia manual.'; }), 1200);
    this.timer.unref();
  }
  async automatic() {
    const copy = await this.snapshot('auto');
    const files = (await readdir(this.dir)).filter(n => /^amapola-auto-[a-z0-9-]+\.amapola$/i.test(n)).sort().reverse();
    // Retain 30 recent copies and one per day for the previous 30 days.
    const keep = new Set(files.slice(0, 30)); const days = new Set();
    for (const name of files) {
      const day = name.slice('amapola-auto-'.length, 'amapola-auto-'.length + 10);
      if (!days.has(day) && days.size < 30) { keep.add(name); days.add(day); }
    }
    for (const file of files) if (!keep.has(file)) await unlink(path.join(this.dir, file));
    return copy;
  }
  async list() {
    await mkdir(this.dir, { recursive: true });
    const names = (await readdir(this.dir)).filter(n => /^amapola-[a-z0-9-]+\.amapola$/i.test(n)).sort().reverse();
    return Promise.all(names.slice(0, 100).map(async filename => { const f = await stat(path.join(this.dir, filename)); return { filename, size: f.size, modifiedAt: f.mtime.toISOString() }; }));
  }
  async read(filename) {
    if (!/^amapola-[a-z0-9-]+\.amapola$/i.test(filename)) throw new AppError('Nombre de copia no válido.');
    try { return await readFile(path.join(this.dir, filename)); } catch { throw new AppError('Copia no encontrada.', 404); }
  }
  async send(token = '') {
    if (this.busy) throw new AppError('Ya hay una copia en curso.', 409);
    this.busy = true;
    try {
      const config = this.store.settings();
      if (config.backupMode === 'api' && !token.trim()) throw new AppError('Introduce un token API de Infomaniak. Se usará una sola vez.');
      if (config.backupMode === 'folder') {
        if (!path.isAbsolute(config.backupFolder)) throw new AppError('Indica la ruta completa de una carpeta sincronizada.');
        try { if (!(await stat(config.backupFolder)).isDirectory()) throw new Error(); }
        catch { throw new AppError('La carpeta sincronizada no existe o no es accesible.'); }
      }
      const copy = await this.snapshot();
      if (config.backupMode === 'folder') {
        await writeFile(path.join(config.backupFolder, copy.filename), copy.bytes, { flag: 'wx', mode: 0o600 });
        return { filename: copy.filename, size: copy.bytes.length, message: 'Copia creada en la carpeta. Verifica su sincronización en kDrive.', remoteConfirmed: false };
      }
      if (config.backupMode === 'api') {
        await this.upload(config, token.trim(), copy);
        return { filename: copy.filename, size: copy.bytes.length, message: 'kDrive ha confirmado el nombre y el tamaño del archivo recibido.', remoteConfirmed: true };
      }
      return { filename: copy.filename, size: copy.bytes.length, message: 'Copia local creada. Puedes descargarla.', remoteConfirmed: false };
    } finally { this.busy = false; }
  }
  async request(url, token, options = {}) {
    let res;
    try { res = await this.fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(120000) }); }
    catch { throw new AppError('No se puede conectar con kDrive. La copia local se conserva.', 502); }
    return res;
  }
  async json(res) {
    if (!res.ok) {
      await res.body?.cancel();
      throw new AppError(res.status === 401 ? 'Infomaniak rechazó el token API.' : res.status === 403 ? 'El token no tiene permiso de escritura en este kDrive.' : `kDrive rechazó la operación (HTTP ${res.status}). La copia local se conserva.`, 502);
    }
    const result = await res.json().catch(() => null);
    if (!result || result.result !== 'success') throw new AppError('Respuesta de kDrive no válida. Comprueba la copia en su sitio web.', 502);
    return result.data;
  }
  async upload(config, token, copy) {
    if (!/^\d{1,15}$/.test(config.driveId)) throw new AppError('Identificador de kDrive no válido.');
    const base = `https://api.infomaniak.com/3/drive/${config.driveId}/files`;
    const spaces = await this.json(await this.request(`${base}/1/files?with=capabilities`, token));
    const personal = Array.isArray(spaces) && spaces.find(s => s.visibility === 'is_private_space' && s.capabilities?.can_create_directory && s.capabilities?.can_upload);
    if (!personal || !Number.isSafeInteger(personal.id) || personal.id < 1) throw new AppError('No se encontró un espacio privado kDrive con permiso de escritura.', 502);
    let parent = personal.id;
    const parts = config.driveFolder.split('/');
    if (parts.some(p => !p || p === '.' || p === '..' || /[\\\x00-\x1f]/.test(p))) throw new AppError('Carpeta kDrive no válida.');
    for (const name of parts) {
      const lookup = () => this.request(`${base}/${parent}/name?name=${encodeURIComponent(name)}`, token);
      let res = await lookup();
      if (res.status === 404) {
        await res.body?.cancel();
        res = await this.request(`${base}/${parent}/directory`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        if (res.status === 409) { await res.body?.cancel(); res = await lookup(); }
      }
      const folder = await this.json(res);
      if (!Number.isSafeInteger(folder?.id) || folder.id < 1 || folder.type !== 'dir') throw new AppError('Carpeta kDrive no válida.', 502);
      parent = folder.id;
    }
    const query = new URLSearchParams({ directory_id: String(parent), file_name: copy.filename, total_size: String(copy.bytes.length), conflict: 'error' });
    const file = await this.json(await this.request(`https://api.infomaniak.com/3/drive/${config.driveId}/upload?${query}`, token,
      { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: copy.bytes }));
    if (!Number.isSafeInteger(file?.id) || file.id < 1 || file.name !== copy.filename || file.size !== copy.bytes.length)
      throw new AppError('kDrive no confirmó el nombre y el tamaño. Verifica el archivo antes de reintentar.', 502);
  }
}
