import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Store, todayIn, defaults, addDays } from '../app/domain.mjs';

test('busy reminders work without students, can be moved, resized, filtered and deleted',t=>{
  const db=new Store(':memory:');t.after(()=>db.close());
  const first=db.saveBusyBlock({date:'2026-10-21',time:'09:15',duration:45});
  assert.equal(first.title,'Ocupada');assert.equal(db.all('students').length,0);
  assert.equal(db.busyBlocks('2026-10-21','2026-10-21')[0].kind,'busy');
  db.saveBusyBlock({...first,date:'2026-10-22',time:'10:30',duration:90,notes:'Cita personal'},first.id);
  assert.equal(db.busyBlocks('2026-10-21','2026-10-21').length,0);
  const [moved]=db.busyBlocks('2026-10-22','2026-10-22');assert.equal(moved.duration,90);assert.equal(moved.time,'10:30');
  db.deleteBusyBlock(first.id);assert.equal(db.busyBlocks('2026-10-22','2026-10-22').length,0);
});
test('busy blocks enforce quarter hours and cannot span midnight',t=>{
  const db=new Store(':memory:');t.after(()=>db.close());const data={date:'2026-10-21',time:'09:15',duration:45};
  assert.throws(()=>db.saveBusyBlock({...data,time:'09:17'}),/15 minutos/);
  assert.throws(()=>db.saveBusyBlock({...data,duration:16}),/15 minutos/);
  assert.throws(()=>db.saveBusyBlock({...data,time:'23:45',duration:30}),/mismo día/);
  assert.throws(()=>db.saveBusyBlock({...data,date:'2026-02-30'}));
  assert.equal(db.all('busy_blocks').length,0);
});
test('busy blocks never become lessons, payments or estimated income and survive a backup restore',t=>{
  const db=new Store(':memory:');t.after(()=>db.close());const date=addDays(todayIn(defaults.timezone),1);
  const block=db.saveBusyBlock({date,time:'09:00',duration:120,title:'Descanso',notes:'Personal'});
  assert.equal(db.occurrences(date,date).length,0);assert.equal(db.classLedger({period:'all'}).total,0);assert.equal(db.report(date).current.total,0);
  const archive=db.exportData();assert.equal(archive.version,4);assert.equal(archive.busy_blocks.length,1);
  db.deleteBusyBlock(block.id);db.importData(archive);assert.equal(db.get('busy_blocks',block.id).notes,'Personal');
  assert.throws(()=>db.savePayment({paymentStatus:'paid',paymentMethod:'cash'},block.id),/no encontrado/);
  const invalid=structuredClone(archive);invalid.busy_blocks[0].duration=17;assert.throws(()=>db.importData(invalid));
  assert.equal(db.all('busy_blocks').length,1);
  const legacy={...archive,version:2};delete legacy.busy_blocks;db.importData(legacy);assert.equal(db.all('busy_blocks').length,0);
});
test('v2 databases migrate with their previous backup format and preserve students',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'amapola-v2-busy-')),file=path.join(dir,'amapola.sqlite');let db;
  try {
    db=new Store(file);const student=db.saveStudent({firstName:'Existente',color:'#bc587a'});
    db.db.exec('DROP TABLE busy_blocks; PRAGMA user_version=2;');db.close();db=new Store(file);
    assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,4);
    assert.equal(db.get('students',student.id).firstName,'Existente');assert.equal(db.all('busy_blocks').length,0);
    const files=readdirSync(path.join(dir,'copias'));assert.equal(files.length,1);
    const old=JSON.parse(gunzipSync(readFileSync(path.join(dir,'copias',files[0]))));assert.equal(old.version,2);assert.equal(old.busy_blocks,undefined);
    db.importData(old);assert.equal(db.get('students',student.id).firstName,'Existente');
  } finally { db?.close();rmSync(dir,{recursive:true,force:true}); }
});
