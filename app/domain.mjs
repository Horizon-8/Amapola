import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { paymentState, hasEnded } from './public/class-utils.mjs';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const defaults = {
  name: '', business: 'Mis clases', email: '', phone: '', notes: '',
  currency: 'COP', timezone: 'America/Bogota', weekStart: 'monday',
  backupMode: 'download', backupFolder: '', driveId: '', driveFolder: 'Amapola/Copias',
};
export const todayIn = (zone, now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
export const timeIn = (zone, now = new Date()) => new Intl.DateTimeFormat('en-GB', {
  timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(now);
export const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekday = date => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
export const monday = date => addDays(date, -weekday(date));
const text = (v, name, max = 200, required = false) => {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new AppError(`${name}: valor no válido.`);
  return v.trim();
};
const choice = (v, values, label) => { if (!values.includes(v)) throw new AppError(`${label}: opción no válida.`); return v; };
const integer = (v, min, max, label) => { if (!Number.isSafeInteger(v) || v < min || v > max) throw new AppError(`${label}: valor no válido.`); return v; };
const bool = v => { if (typeof v !== 'boolean') throw new AppError('Estado no válido.'); return v ? 1 : 0; };
export function dateValue(v, label = 'Fecha') {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '2000-01-01' || v > '2100-12-31' || Number.isNaN(Date.parse(v)) || new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) !== v) throw new AppError(`${label}: fecha no válida (2000–2100).`);
  return v;
}
function clock(v) { if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new AppError('Hora no válida.'); return v; }
export const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
export const endTime = (t, duration) => { const m = minutes(t) + duration; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function studentInput(v) {
  const stage = choice(v.stage ?? 'student', ['student', 'prospect'], 'Seguimiento');
  const email = text(v.email ?? '', 'Correo', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Correo electrónico no válido.');
  const color = text(v.color, 'Color', 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new AppError('Color no válido.');
  return { firstName: text(v.firstName, 'Nombre', 100, true), lastName: text(v.lastName ?? '', 'Apellidos', 150),
    channel: choice(v.channel ?? 'whatsapp', ['whatsapp', 'messenger', 'instagram', 'email', 'phone', 'other'], 'Canal'),
    phone: text(v.phone ?? '', 'Teléfono', 60), email, messenger: text(v.messenger ?? '', 'Messenger', 200),
    notes: text(v.notes ?? '', 'Notas', 6000), color, stage, active: stage === 'prospect' ? 0 : bool(v.active ?? true) };
}
export function classInput(v, { strictTime = true } = {}) {
  const time = clock(v.time);
  const duration = integer(v.duration, 5, 720, 'Duración');
  if (strictTime && (minutes(time) % 15 || duration % 15)) throw new AppError('La hora y la duración deben avanzar en intervalos de 15 minutos.');
  if (minutes(time) + duration > 1440) throw new AppError('La clase debe terminar el mismo día.');
  return { studentId: text(v.studentId, 'Alumno', 50, true), title: text(v.title ?? 'Clase particular', 'Título', 150, true),
    time, duration, price: integer(v.price, 0, 100000000000, 'Tarifa'),
    modality: choice(v.modality ?? 'online', ['online', 'home', 'travel'], 'Modalidad'), notes: text(v.notes ?? '', 'Notas', 4000) };
}
export function scheduleInput(v, options) {
  const c = classInput(v, options), startDate = dateValue(v.startDate, 'Inicio');
  const endDate = v.endDate ? dateValue(v.endDate, 'Fin') : '';
  if (endDate && endDate < startDate) throw new AppError('El fin debe ser posterior al inicio.');
  return { ...c, startDate, endDate, weekday: integer(v.weekday, 0, 6, 'Día'),
    recurrence: choice(v.recurrence ?? 'weekly', ['weekly', 'once'], 'Repetición'), active: bool(v.active ?? true) };
}
export function settingsInput(v) {
  const result = {};
  for (const k of ['name', 'business', 'email', 'phone', 'notes', 'backupFolder', 'driveId', 'driveFolder']) result[k] = text(v[k] ?? defaults[k], k, k === 'notes' ? 6000 : 1000);
  result.currency = choice(v.currency, ['COP', 'EUR', 'CAD', 'USD', 'MXN', 'GBP'], 'Moneda');
  result.timezone = text(v.timezone, 'Zona horaria', 100, true);
  try { new Intl.DateTimeFormat('es', { timeZone: result.timezone }); } catch { throw new AppError('Zona horaria no válida.'); }
  result.weekStart = 'monday';
  result.backupMode = choice(v.backupMode, ['download', 'folder', 'api'], 'Destino de copias');
  if (result.backupMode === 'api') {
    if (!/^\d{1,15}$/.test(result.driveId)) throw new AppError('Identificador de kDrive no válido.');
    if (!result.driveFolder || result.driveFolder.split('/').some(p => !p || p === '.' || p === '..' || /[\\\x00-\x1f]/.test(p))) throw new AppError('Indica una carpeta kDrive sin barra inicial o final.');
  }
  return result;
}
export const paymentMethods = ['', 'cash', 'transfer', 'card', 'nequi', 'daviplata', 'paypal', 'other'];
export function paymentInput(v) {
  const paymentStatus = choice(v.paymentStatus ?? 'unpaid', ['unpaid', 'paid'], 'Estado de pago');
  const paymentMethod = choice(v.paymentMethod ?? '', paymentMethods, 'Método de pago');
  if (paymentStatus === 'paid' && !paymentMethod) throw new AppError('Selecciona el método de pago de la clase pagada.');
  return { paymentStatus, paymentMethod };
}
export function busyInput(v) {
  const date = dateValue(v.date), time = clock(v.time), duration = integer(v.duration, 15, 720, 'Duración');
  if (minutes(time) % 15 || duration % 15) throw new AppError('La hora y la duración deben avanzar en intervalos de 15 minutos.');
  if (minutes(time) + duration > 1440) throw new AppError('El bloqueo debe terminar el mismo día.');
  return { title: text(v.title ?? 'Ocupada', 'Título', 150, true), date, time, duration, notes: text(v.notes ?? '', 'Notas', 4000) };
}

const schema = `
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students (
 id TEXT PRIMARY KEY, firstName TEXT NOT NULL, lastName TEXT NOT NULL, channel TEXT NOT NULL,
 phone TEXT NOT NULL, email TEXT NOT NULL, messenger TEXT NOT NULL, notes TEXT NOT NULL,
 color TEXT NOT NULL, active INTEGER NOT NULL CHECK(active IN (0,1)), createdAt TEXT NOT NULL,
 stage TEXT NOT NULL DEFAULT 'student' CHECK(stage IN ('student','prospect')));
CREATE TABLE IF NOT EXISTS schedules (
 id TEXT PRIMARY KEY, studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 title TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL CHECK(duration>0),
 price INTEGER NOT NULL CHECK(price>=0), modality TEXT NOT NULL, notes TEXT NOT NULL,
 startDate TEXT NOT NULL, endDate TEXT NOT NULL, weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 recurrence TEXT NOT NULL, active INTEGER NOT NULL CHECK(active IN (0,1)));
CREATE TABLE IF NOT EXISTS sessions (
 id TEXT PRIMARY KEY, scheduleId TEXT REFERENCES schedules(id) ON DELETE SET NULL,
 originalDate TEXT NOT NULL, studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL,
 price INTEGER NOT NULL CHECK(price>=0), modality TEXT NOT NULL, notes TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('planned','completed','cancelled')),
 paymentStatus TEXT NOT NULL DEFAULT 'unpaid' CHECK(paymentStatus IN ('unpaid','paid')),
 paymentMethod TEXT NOT NULL DEFAULT '',
 isOverride INTEGER NOT NULL DEFAULT 0 CHECK(isOverride IN (0,1)),
 UNIQUE(scheduleId, originalDate));
CREATE INDEX IF NOT EXISTS sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS schedules_student ON schedules(studentId);
CREATE TABLE IF NOT EXISTS busy_blocks (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
 duration INTEGER NOT NULL CHECK(duration>0), notes TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS busy_blocks_date ON busy_blocks(date);
`;
const tableCols = {
  students: ['id', 'firstName', 'lastName', 'channel', 'phone', 'email', 'messenger', 'notes', 'color', 'active', 'createdAt', 'stage'],
  schedules: ['id', 'studentId', 'title', 'time', 'duration', 'price', 'modality', 'notes', 'startDate', 'endDate', 'weekday', 'recurrence', 'active'],
  sessions: ['id', 'scheduleId', 'originalDate', 'studentId', 'title', 'date', 'time', 'duration', 'price', 'modality', 'notes', 'status', 'paymentStatus', 'paymentMethod', 'isOverride'],
  busy_blocks: ['id', 'title', 'date', 'time', 'duration', 'notes'],
};
export class Store {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    const version = this.db.prepare('PRAGMA user_version').get().user_version;
    if (version > 4) { this.db.close(); throw new AppError('Esta base requiere una versión más reciente de Amapola.', 503); }
    try {
      if ([1, 2, 3].includes(version) && file !== ':memory:') {
        const dir = path.join(path.dirname(file), 'copias'); mkdirSync(dir, { recursive: true });
        const payload = { app: 'amapola', version, createdAt: new Date().toISOString(), settings: this.settings(), students: this.all('students'), schedules: this.all('schedules'), sessions: this.all('sessions') };
        if (version >= 3) payload.busy_blocks = this.all('busy_blocks');
        writeFileSync(path.join(dir, `amapola-antes-de-actualizar-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 6)}.amapola`), gzipSync(Buffer.from(JSON.stringify(payload))), { flag: 'wx', mode: 0o600 });
      }
      this.transaction(() => {
        this.db.exec(schema);
        const columns = new Set(this.db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name));
        if (!columns.has('paymentStatus')) this.db.exec("ALTER TABLE sessions ADD COLUMN paymentStatus TEXT NOT NULL DEFAULT 'unpaid' CHECK(paymentStatus IN ('unpaid','paid'));");
        if (!columns.has('paymentMethod')) this.db.exec("ALTER TABLE sessions ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT '';");
        if (!columns.has('isOverride')) this.db.exec('ALTER TABLE sessions ADD COLUMN isOverride INTEGER NOT NULL DEFAULT 1 CHECK(isOverride IN (0,1));');
        const studentColumns = new Set(this.db.prepare('PRAGMA table_info(students)').all().map(c => c.name));
        if (!studentColumns.has('stage')) this.db.exec("ALTER TABLE students ADD COLUMN stage TEXT NOT NULL DEFAULT 'student' CHECK(stage IN ('student','prospect'));");
        this.db.exec('PRAGMA user_version=4;');
      });
    } catch (error) { this.db.close(); throw error; }
    this.db.prepare('INSERT OR IGNORE INTO settings(id,json) VALUES(1,?)').run(JSON.stringify(defaults));
  }
  settings() { return { ...defaults, ...JSON.parse(this.db.prepare('SELECT json FROM settings WHERE id=1').get().json) }; }
  saveSettings(v) { const result = settingsInput(v); this.db.prepare('UPDATE settings SET json=? WHERE id=1').run(JSON.stringify(result)); return result; }
  all(table) { if (!tableCols[table]) throw new Error('table'); return this.db.prepare(`SELECT * FROM ${table}`).all(); }
  get(table, id) { if (!tableCols[table]) throw new Error('table'); const row = this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id); if (!row) throw new AppError('Registro no encontrado.', 404); return row; }
  insert(table, data) { const cols = tableCols[table]; this.db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map(k => data[k])); return data; }
  update(table, id, data) { const cols = Object.keys(data); if (cols.some(c => !tableCols[table].includes(c) || c === 'id')) throw new Error('column'); this.db.prepare(`UPDATE ${table} SET ${cols.map(k => `${k}=?`).join(',')} WHERE id=?`).run(...cols.map(k => data[k]), id); return this.get(table, id); }
  transaction(fn) { if (this.previewing) return fn(); this.db.exec('BEGIN IMMEDIATE'); try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  saveStudent(v, id) {
    const data = studentInput(v);
    return this.transaction(() => {
      if (id) { this.get('students', id); this.freezePast(); return this.update('students', id, data); }
      return this.insert('students', { ...data, id: randomUUID(), createdAt: new Date().toISOString() });
    });
  }
  scheduleDates(s, from, to) {
    if (!s.active) return [];
    let start = from > s.startDate ? from : s.startDate;
    let end = s.endDate && s.endDate < to ? s.endDate : to;
    if (s.recurrence === 'once') return s.startDate >= from && s.startDate <= end ? [s.startDate] : [];
    if (start > end) return [];
    start = addDays(start, (s.weekday - weekday(start) + 7) % 7);
    const dates = [];
    for (let d = start; d <= end; d = addDays(d, 7)) dates.push(d);
    return dates;
  }
  projected(s, date) { return { id: `${s.id}@${date}`, scheduleId: s.id, originalDate: date, studentId: s.studentId, title: s.title,
    date, time: s.time, duration: s.duration, price: s.price, modality: s.modality, notes: s.notes, status: 'planned', paymentStatus: 'unpaid', paymentMethod: '', isOverride: 0, virtual: true }; }
  decorate(row, now = new Date()) {
    const config = this.settings(), today = todayIn(config.timezone, now), time = timeIn(config.timezone, now);
    return { ...row, isPast: hasEnded(row, today, time), paymentState: paymentState(row, today, time) };
  }
  freezePast(now = new Date()) {
    const config = this.settings(), date = todayIn(config.timezone, now), time = timeIn(config.timezone, now);
    const existing = new Set(this.all('sessions').filter(s => s.scheduleId).map(s => `${s.scheduleId}@${s.originalDate}`));
    const students = new Map(this.all('students').map(s => [s.id, s]));
    for (const s of this.all('schedules')) {
      if (!students.get(s.studentId)?.active) continue;
      for (const d of this.scheduleDates(s, s.startDate, date)) {
        if (d === date && s.time > time) continue;
        const key = `${s.id}@${d}`;
        if (!existing.has(key)) this.insert('sessions', { ...this.projected(s, d), id: randomUUID() });
      }
    }
  }
  occurrences(from, to, studentId = '') {
    dateValue(from); dateValue(to);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 370) throw new AppError('Selecciona un intervalo de hasta un año.');
    this.freezePast();
    const stored = this.all('sessions');
    const keys = new Set(stored.filter(s => s.scheduleId).map(s => `${s.scheduleId}@${s.originalDate}`));
    const students = new Map(this.all('students').map(s => [s.id, s]));
    const config = this.settings(), today = todayIn(config.timezone);
    const rows = stored.filter(s => s.date >= from && s.date <= to && (!studentId || s.studentId === studentId));
    for (const s of this.all('schedules')) {
      if (!students.get(s.studentId)?.active || (studentId && s.studentId !== studentId)) continue;
      for (const d of this.scheduleDates(s, from > today ? from : today, to)) if (!keys.has(`${s.id}@${d}`)) rows.push(this.projected(s, d));
    }
    return rows.map(s => ({ ...this.decorate(s), studentName: `${students.get(s.studentId)?.firstName ?? ''} ${students.get(s.studentId)?.lastName ?? ''}`.trim(), color: students.get(s.studentId)?.color ?? '#c65778' }))
      .sort((a, b) => `${a.date}${a.time}${a.id}`.localeCompare(`${b.date}${b.time}${b.id}`));
  }
  saveSchedule(v, id) {
    const data = scheduleInput(v);
    this.get('students', data.studentId);
    return this.transaction(() => {
      this.freezePast();
      if (id) {
        const old = this.get('schedules', id);
        if (old.studentId !== data.studentId) throw new AppError('No se puede cambiar el alumno de una planificación existente.');
        const today = todayIn(this.settings().timezone);
        if (data.startDate < today) data.startDate = today;
        if (data.endDate && data.endDate < data.startDate) throw new AppError('La nueva planificación debe terminar después de su fecha de inicio.');
        // Keep the old timetable up to the effective date, including upcoming
        // sessions. Otherwise an edit starting next month erases this month.
        const saved = new Set(this.all('sessions').filter(s => s.scheduleId === id).map(s => s.originalDate));
        for (const date of this.scheduleDates(old, today, addDays(data.startDate, -1))) {
          if (!saved.has(date)) this.insert('sessions', { ...this.projected(old, date), id: randomUUID() });
        }
        // Stored sessions are snapshots. Editing a rule only regenerates unmodified future sessions.
        return this.update('schedules', id, data);
      }
      return this.insert('schedules', { ...data, id: randomUUID() });
    });
  }
  resolveSession(id) {
    let old;
    if (id.includes('@')) {
      const [sid, original] = id.split('@'); dateValue(original);
      const s = this.get('schedules', sid);
      const saved = this.db.prepare('SELECT * FROM sessions WHERE scheduleId=? AND originalDate=?').get(sid, original);
      if (saved) old = saved;
      else {
        if (!this.get('students', s.studentId).active || !this.scheduleDates(s, original, original).length) throw new AppError('Esta sesión ya no forma parte de la planificación. Actualiza la página.', 409);
        old = { ...this.projected(s, original), id: randomUUID() };
      }
    } else old = this.get('sessions', id);
    return old;
  }
  persistSession(old, data) {
    if (this.db.prepare('SELECT id FROM sessions WHERE id=?').get(old.id)) return this.update('sessions', old.id, data);
    return this.insert('sessions', { ...old, ...data });
  }
  saveSession(v, id) {
    const old = this.resolveSession(id);
    const data = { ...classInput(v), date: dateValue(v.date), status: choice(v.status, ['planned', 'completed', 'cancelled'], 'Estado'),
      ...paymentInput({ ...old, ...v }) };
    data.isOverride = ['title', 'date', 'time', 'duration', 'price', 'modality', 'notes'].some(key => data[key] !== old[key]) ? 1 : old.isOverride;
    this.get('students', data.studentId);
    if (old.studentId !== data.studentId) throw new AppError('No se puede cambiar el alumno de esta sesión.');
    return this.persistSession(old, data);
  }
  savePayment(v, id) {
    const old = this.resolveSession(id);
    return this.persistSession(old, paymentInput(v));
  }
  changeSession(v, id) {
    const scope = choice(v.scope, ['session', 'following'], 'Alcance del cambio');
    if (scope === 'session') return this.saveSession(v, id);
    return this.transaction(() => {
      this.freezePast();
      const old = this.resolveSession(id), data = classInput(v), date = dateValue(v.date);
      if (old.studentId !== data.studentId) throw new AppError('No se puede cambiar el alumno de esta sesión.');
      if (!old.scheduleId) throw new AppError('Esta sesión no tiene una planificación recurrente.');
      const rule = this.get('schedules', old.scheduleId);
      const today = todayIn(this.settings().timezone), time = timeIn(this.settings().timezone);
      if (rule.recurrence !== 'weekly' || !rule.active || old.originalDate < today || old.date < today || (old.date === today && old.time < time) || date < today || (date === today && data.time < time)) throw new AppError('Para clases ya iniciadas o sin repetición, cambia solo esta sesión.');
      const shift = Math.round((Date.parse(date) - Date.parse(old.originalDate)) / 86400000);
      const cutoff = addDays(old.originalDate, -1);
      const next = { ...scheduleInput({ ...rule, ...data, startDate: date, endDate: rule.endDate ? addDays(rule.endDate, shift) : '', weekday: weekday(date), active: true }), id: randomUUID() };
      this.update('schedules', rule.id, cutoff < rule.startDate ? { active: 0 } : { endDate: cutoff });
      this.insert('schedules', next);
      // Re-key future exceptions to suppress the matching generated occurrence.
      // Payment-only snapshots follow the rule while individual exceptions stay put.
      for (const row of this.all('sessions').filter(r => r.scheduleId === rule.id && r.originalDate >= old.originalDate && r.id !== old.id)) {
        const originalDate = addDays(row.originalDate, shift);
        const changes = { scheduleId: next.id, originalDate };
        if (!row.isOverride && row.status === 'planned') Object.assign(changes, data, { date: originalDate });
        this.update('sessions', row.id, changes);
      }
      const selected = this.persistSession(old, { ...data, date, scheduleId: next.id, originalDate: date,
        status: choice(v.status ?? old.status, ['planned', 'completed', 'cancelled'], 'Estado'), ...paymentInput({ ...old, ...v }), isOverride: 0 });
      return { ...selected, newScheduleId: next.id };
    });
  }
  deleteSchedule(id) {
    return this.transaction(() => {
      this.get('schedules', id); this.freezePast();
      const config = this.settings(), today = todayIn(config.timezone), time = timeIn(config.timezone);
      this.db.prepare("DELETE FROM sessions WHERE scheduleId=? AND (date>? OR (date=? AND time>?)) AND status!='completed'").run(id, today, today, time);
      this.db.prepare('DELETE FROM schedules WHERE id=?').run(id);
    });
  }
  deleteStudent(id) {
    this.get('students', id);
    this.db.prepare('DELETE FROM students WHERE id=?').run(id);
  }
  saveBusyBlock(v, id) {
    const data = busyInput(v);
    if (id) { this.get('busy_blocks', id); return this.update('busy_blocks', id, data); }
    return this.insert('busy_blocks', { ...data, id: randomUUID() });
  }
  conflicts({ kind, id, value }) {
    choice(kind, ['schedule', 'session', 'busy'], 'Actividad');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('Actividad no válida.');
    if (kind === 'session' && !id) throw new AppError('Selecciona una sesión.');
    if (id !== undefined && id !== null) text(id, 'Identificador', 100, true);
    // Apply the real edit inside a savepoint so warnings exactly reflect rule
    // splits, cancellations, payment snapshots and retained exceptions. All
    // writes, including past-session materialization, are rolled back.
    this.db.exec('SAVEPOINT conflict_preview');
    this.previewing = true;
    try {
      this.freezePast();
      const changed = kind === 'busy' ? this.saveBusyBlock(value, id)
        : kind === 'schedule' ? this.saveSchedule(value, id)
        : this.changeSession({ ...value, scope: value.scope ?? 'session' }, id);
      const students = new Map(this.all('students').map(s => [s.id, s]));
      const stored = this.all('sessions');
      const keys = new Set(stored.filter(s => s.scheduleId).map(s => `${s.scheduleId}@${s.originalDate}`));
      const today = todayIn(this.settings().timezone);
      const ruleId = kind === 'schedule' ? changed.id : changed.newScheduleId;
      const rule = ruleId ? this.get('schedules', ruleId) : null;
      let targets = [];
      if (kind === 'busy') targets = [{ ...changed, kind: 'busy' }];
      else if (!rule) targets = [changed];
      else {
        const from = rule.startDate;
        if (students.get(rule.studentId)?.active) targets = this.scheduleDates(rule, from, '2100-12-31')
          .filter(d => !keys.has(`${rule.id}@${d}`)).map(d => this.projected(rule, d));
        if (kind === 'session') targets.push(...stored.filter(s => s.scheduleId === rule.id && (s.id === changed.id || (!s.isOverride && s.status === 'planned'))));
      }
      targets = targets.filter(s => s.status !== 'cancelled');
      if (!targets.length) return { conflicts: [], total: 0, recurring: !!rule };
      const from = targets.reduce((d,s) => s.date < d ? s.date : d, targets[0].date);
      const to = targets.reduce((d,s) => s.date > d ? s.date : d, from);
      const events = stored.filter(s => s.date >= from && s.date <= to && s.status !== 'cancelled');
      for (const s of this.all('schedules')) {
        if (!students.get(s.studentId)?.active) continue;
        for (const d of this.scheduleDates(s, from > today ? from : today, to)) {
          if (!keys.has(`${s.id}@${d}`)) events.push(this.projected(s, d));
        }
      }
      events.push(...this.all('busy_blocks').filter(s => s.date >= from && s.date <= to).map(s => ({ ...s, kind: 'busy' })));
      const byDate = new Map();
      for (const e of events) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date).push(e); }
      const found = [];
      for (const target of targets) for (const e of byDate.get(target.date) || []) {
        if (e.id === target.id && e.kind === target.kind) continue;
        if (minutes(target.time) >= minutes(e.time) + e.duration || minutes(e.time) >= minutes(target.time) + target.duration) continue;
        found.push({ id: e.id, kind: e.kind ?? 'class', date: e.date, time: e.time, duration: e.duration, title: e.title,
          studentName: e.studentId ? `${students.get(e.studentId)?.firstName ?? ''} ${students.get(e.studentId)?.lastName ?? ''}`.trim() : '' });
      }
      found.sort((a,b) => `${a.date}${a.time}${a.id}`.localeCompare(`${b.date}${b.time}${b.id}`));
      const unique = [...new Map(found.map(e => [`${e.kind}:${e.id}`, e])).values()];
      return { conflicts: unique.slice(0, 20), total: unique.length, recurring: !!rule };
    } finally {
      this.db.exec('ROLLBACK TO conflict_preview; RELEASE conflict_preview');
      this.previewing = false;
    }
  }
  busyBlocks(from, to) {
    dateValue(from); dateValue(to);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 370) throw new AppError('Selecciona un intervalo de hasta un año.');
    return this.db.prepare('SELECT * FROM busy_blocks WHERE date>=? AND date<=? ORDER BY date,time,id').all(from,to).map(row=>({...row,kind:'busy'}));
  }
  deleteBusyBlock(id) {
    this.get('busy_blocks', id);
    this.db.prepare('DELETE FROM busy_blocks WHERE id=?').run(id);
  }
  history(studentId) {
    this.get('students', studentId); this.freezePast();
    const config = this.settings(), today = todayIn(config.timezone), time = timeIn(config.timezone);
    return this.db.prepare('SELECT * FROM sessions WHERE studentId=? ORDER BY date DESC,time DESC').all(studentId).filter(r => hasEnded(r, today, time)).map(r => this.decorate(r));
  }
  classLedger(options = {}) {
    const period = choice(options.period ?? 'past', ['past', 'future', 'all'], 'Periodo');
    const payment = choice(options.payment ?? 'all', ['all', 'paid', 'unpaid', 'overdue', 'pending'], 'Pago');
    const status = choice(options.status ?? '', ['', 'planned', 'completed', 'cancelled'], 'Estado');
    const method = choice(options.method ?? '', paymentMethods, 'Método de pago');
    const today = todayIn(this.settings().timezone), from = options.from ? dateValue(options.from) : '', to = options.to ? dateValue(options.to) : '';
    if (from && to && from > to) throw new AppError('La fecha final debe ser posterior al inicio.');
    const horizon = period === 'past' ? today : (to && to > today ? to : addDays(today, 365));
    if (horizon > addDays(today, 370)) throw new AppError('Las clases futuras se pueden consultar hasta un año por adelantado.');
    const current = this.occurrences(today, horizon);
    const students = new Map(this.all('students').map(s => [s.id, s]));
    const previous = this.all('sessions').filter(r => r.date < today).map(r => ({ ...this.decorate(r), studentName: `${students.get(r.studentId)?.firstName ?? ''} ${students.get(r.studentId)?.lastName ?? ''}`.trim(), color: students.get(r.studentId)?.color }));
    let rows = [...previous, ...current].filter(r => (period === 'all' || (period === 'past' ? r.isPast : !r.isPast)) && (!from || r.date >= from) && (!to || r.date <= to)
      && (!options.student || r.studentId === options.student) && (!method || r.paymentMethod === method) && (!status || r.status === status)
      && (payment === 'all' || (payment === 'unpaid' ? r.paymentStatus !== 'paid' && r.paymentState !== 'nocharge' : r.paymentState === payment)));
    rows.sort((a,b) => (period === 'past' ? -1 : 1) * `${a.date}${a.time}${a.id}`.localeCompare(`${b.date}${b.time}${b.id}`));
    const total = rows.length, pages = Math.max(1, Math.ceil(total / 50));
    const page = Math.min(integer(Number(options.page ?? 1), 1, 1000000, 'Página'), pages);
    const totals = { paid: 0, overdue: 0, pending: 0 };
    for (const row of rows) if (Object.hasOwn(totals, row.paymentState)) totals[row.paymentState] += row.price;
    return { rows: rows.slice((page - 1) * 50, page * 50), total, page, pages, totals, futureUntil: horizon };
  }
  report(from) {
    const week = monday(dateValue(from));
    const build = start => {
      const rows = this.occurrences(start, addDays(start, 6));
      const included = rows.filter(s => s.status !== 'cancelled');
      return { start, end: addDays(start, 6), total: included.reduce((n, s) => n + s.price, 0), count: included.length,
        hours: included.reduce((n, s) => n + s.duration, 0) / 60,
        cancelled: rows.filter(s => s.status === 'cancelled').length,
        completed: included.filter(s => s.status === 'completed').reduce((n, s) => n + s.price, 0),
        students: Object.values(included.reduce((acc, s) => {
          acc[s.studentId] ??= { id: s.studentId, name: s.studentName, color: s.color, count: 0, total: 0, minutes: 0 };
          acc[s.studentId].count++; acc[s.studentId].total += s.price; acc[s.studentId].minutes += s.duration; return acc;
        }, {})) };
    };
    return { current: build(week), next: build(addDays(week, 7)) };
  }
  exportData() {
    this.freezePast();
    return this.transaction(() => ({ app: 'amapola', version: 4, createdAt: new Date().toISOString(), settings: this.settings(),
      students: this.all('students'), schedules: this.all('schedules'), sessions: this.all('sessions'), busy_blocks: this.all('busy_blocks') }));
  }
  importData(raw) {
    const data = validateArchive(raw);
    this.transaction(() => {
      this.db.exec('DELETE FROM busy_blocks; DELETE FROM sessions; DELETE FROM schedules; DELETE FROM students;');
      for (const table of ['students', 'schedules', 'sessions', 'busy_blocks']) for (const row of data[table]) this.insert(table, row);
      this.saveSettings(data.settings);
    });
  }
  close() { this.db.close(); }
}
export function validateArchive(raw) {
  if (!raw || raw.app !== 'amapola' || ![1, 2, 3, 4].includes(raw.version)) throw new AppError('Archivo Amapola no compatible.');
  const data = { settings: settingsInput(raw.settings), students: [], schedules: [], sessions: [], busy_blocks: [] };
  if (raw.version < 3) raw = { ...raw, busy_blocks: [] };
  const ids = {}, max = { students: 100000, schedules: 200000, sessions: 500000, busy_blocks: 100000 };
  for (const table of Object.keys(max)) {
    if (!Array.isArray(raw[table]) || raw[table].length > max[table]) throw new AppError('Contenido de la copia no válido.');
    ids[table] = new Set();
    for (const row of raw[table]) {
      const id = text(row.id, 'Identificador', 50, true);
      if (!/^[a-zA-Z0-9-]+$/.test(id) || ids[table].has(id)) throw new AppError('Identificadores no válidos en la copia.');
      ids[table].add(id);
      let entry;
      if (table === 'students') entry = { ...studentInput({ ...row, active: !!row.active }), id, createdAt: text(row.createdAt, 'Creación', 100, true) };
      if (table === 'busy_blocks') entry = { ...busyInput(row), id };
      if (table === 'schedules') entry = { ...scheduleInput({ ...row, active: !!row.active }, { strictTime: false }), id };
      if (table === 'sessions') entry = { ...classInput(row, { strictTime: false }), ...paymentInput(raw.version === 1 ? {} : row), isOverride: raw.version === 1 ? 1 : integer(row.isOverride, 0, 1, 'Excepción'), id, date: dateValue(row.date), originalDate: dateValue(row.originalDate),
        scheduleId: row.scheduleId === null ? null : text(row.scheduleId, 'Planificación', 50, true),
        status: choice(row.status, ['planned', 'completed', 'cancelled'], 'Estado') };
      data[table].push(entry);
    }
  }
  const keys = new Set();
  for (const row of [...data.schedules, ...data.sessions]) if (!ids.students.has(row.studentId)) throw new AppError('Alumno ausente en la copia.');
  for (const row of data.sessions) if (row.scheduleId) {
    if (!ids.schedules.has(row.scheduleId)) throw new AppError('Planificación ausente en la copia.');
    const key = `${row.scheduleId}@${row.originalDate}`;
    if (keys.has(key)) throw new AppError('Sesión duplicada en la copia.'); keys.add(key);
  }
  return data;
}
