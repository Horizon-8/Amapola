import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {gunzipSync} from 'node:zlib';
import {Store,defaults,todayIn,addDays,weekday} from '../app/domain.mjs';

function fixture(t) {
  const db=new Store(':memory:');t.after(()=>db.close());
  const student=db.saveStudent({firstName:'Ana',color:'#bc587a'}),today=todayIn(defaults.timezone),date=addDays(today,3);
  const rule=db.saveSchedule({studentId:student.id,title:'Español',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:50000});
  return {db,student,today,date,rule,row:db.projected(rule,date)};
}
test('individual status changes preserve all payment and class data and reject stale requests',t=>{
  const {db,row,date}=fixture(t);
  db.savePayment({paymentStatus:'paid',paymentMethod:'nequi'},row.id);
  let expected='planned';
  for(const status of ['confirmed','cancelled','planned','confirmed']) {
    const updated=db.saveSessionStatus({status,expectedStatus:expected},row.id);
    assert.equal(updated.status,status);assert.equal(updated.paymentStatus,'paid');assert.equal(updated.paymentMethod,'nequi');
    assert.equal(updated.time,row.time);assert.equal(updated.price,row.price);assert.equal(updated.isOverride,0);
    expected=status;
  }
  assert.throws(()=>db.saveSessionStatus({status:'cancelled',expectedStatus:'planned'},row.id),error=>error.status===409);
  assert.throws(()=>db.saveSessionStatus({status:'unknown'},row.id));
  assert.equal(db.occurrences(addDays(date,7),addDays(date,7))[0].status,'planned');
  assert.equal(db.classLedger({period:'future',status:'confirmed'}).total,1);
  assert.equal(db.classLedger({period:'future',payment:'paid'}).total,1);
});
test('deleting one recurring class excludes it from calendar, totals and conflicts, survives backups and cannot be edited',t=>{
  const {db,row,date,rule}=fixture(t);
  db.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);
  const before=db.classLedger({period:'future'}).totals.paid;assert.equal(before,row.price);
  db.deleteSession(row.id);
  assert.equal(db.occurrences(date,date).length,0);
  assert.equal(db.occurrences(addDays(date,7),addDays(date,7)).length,1);
  assert.equal(db.classLedger({period:'future'}).totals.paid,0);
  assert.equal(db.conflicts({kind:'busy',value:{date,time:'10:00',duration:60}}).total,0);
  for(const operation of [()=>db.deleteSession(row.id),()=>db.savePayment({paymentStatus:'unpaid'},row.id),()=>db.saveSessionStatus({status:'confirmed'},row.id),()=>db.saveSession({...row,status:'planned'},row.id)])assert.throws(operation,error=>error.status===404);
  db.saveSchedule({...rule,active:true,time:'10:15'},rule.id);
  assert.equal(db.occurrences(date,date).length,0);
  const archive=db.exportData();assert.equal(archive.version,5);db.importData(archive);
  assert.equal(db.occurrences(date,date).length,0);assert.equal(db.all('sessions').find(s=>s.originalDate===date).isDeleted,1);
});
test('deleted past classes stay deleted after materialization and history/ledger reports exclude them',t=>{
  const {db,student,today}=fixture(t),date=addDays(today,-7);
  const rule=db.saveSchedule({studentId:student.id,title:'Anterior',startDate:date,weekday:weekday(date),time:'08:00',duration:30,price:10000,recurrence:'once'});
  const old=db.history(student.id).find(r=>r.scheduleId===rule.id);assert.ok(old);
  db.deleteSession(old.id);db.freezePast();
  assert.equal(db.history(student.id).length,0);assert.equal(db.classLedger({period:'past'}).total,0);
  assert.equal(db.report(date).current.count,0);
});
test('confirmed sessions follow a series change and deleted occurrences remain suppressed after the split',t=>{
  const {db,row,date,rule}=fixture(t);
  const next=db.projected(rule,addDays(date,7)),removed=db.projected(rule,addDays(date,14));
  db.saveSessionStatus({status:'confirmed'},next.id);db.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},next.id);db.deleteSession(removed.id);
  db.changeSession({...row,status:'confirmed',date:addDays(date,1),time:'12:00',scope:'following'},row.id);
  const rows=db.occurrences(date,addDays(date,28));
  const confirmed=rows.find(r=>r.originalDate===addDays(date,8));assert.equal(confirmed.status,'confirmed');assert.equal(confirmed.time,'12:00');assert.equal(confirmed.paymentMethod,'transfer');
  assert.equal(rows.some(r=>r.originalDate===addDays(date,15)),false);
  assert.equal(db.conflicts({kind:'busy',value:{date:addDays(date,15),time:'12:00',duration:60}}).total,0);
  const archive=db.exportData();db.importData(archive);assert.equal(db.occurrences(addDays(date,15),addDays(date,15)).length,0);
});
test('one-off deletion does not deactivate other rules or regenerate its only occurrence',t=>{
  const {db,student,date}=fixture(t),rule=db.saveSchedule({studentId:student.id,title:'Puntual',startDate:date,weekday:weekday(date),time:'16:00',duration:30,price:1000,recurrence:'once'});
  db.deleteSession(db.projected(rule,date).id);
  assert.equal(db.occurrences(date,date).some(r=>r.scheduleId===rule.id),false);
  assert.equal(db.get('schedules',rule.id).active,1);
});
test('a real v4 schema migrates with a safety backup, unchanged payments and valid foreign keys',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'amapola-v4-')),file=path.join(dir,'amapola.sqlite');let db;
  try {
    db=new Store(file);const student=db.saveStudent({firstName:'Conservar',color:'#bc587a'}),date=addDays(todayIn(defaults.timezone),3);
    const rule=db.saveSchedule({studentId:student.id,title:'Anterior',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:90000});
    const paid=db.savePayment({paymentStatus:'paid',paymentMethod:'card'},db.projected(rule,date).id);
    db.db.exec('ALTER TABLE sessions DROP COLUMN isDeleted');
    const definition=db.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'").get().sql.replace("'planned','confirmed','completed','cancelled'","'planned','completed','cancelled'");
    db.db.exec(`ALTER TABLE sessions RENAME TO sessions_previous; ${definition}; INSERT INTO sessions SELECT * FROM sessions_previous; DROP TABLE sessions_previous; CREATE INDEX sessions_date ON sessions(date); PRAGMA user_version=4;`);
    db.close();db=new Store(file);
    assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,5);
    assert.equal(db.get('sessions',paid.id).paymentMethod,'card');assert.equal(db.get('sessions',paid.id).isDeleted,0);
    assert.equal(db.saveSessionStatus({status:'confirmed'},paid.id).status,'confirmed');
    assert.deepEqual(db.db.prepare('PRAGMA foreign_key_check').all(),[]);
    const names=readdirSync(path.join(dir,'copias'));assert.equal(names.length,1);
    const archive=JSON.parse(gunzipSync(readFileSync(path.join(dir,'copias',names[0]))));assert.equal(archive.version,4);assert.equal(archive.sessions[0].paymentStatus,'paid');
    db.importData(archive);assert.equal(db.get('sessions',paid.id).status,'planned');assert.equal(db.get('sessions',paid.id).isDeleted,0);
  } finally {db?.close();rmSync(dir,{recursive:true,force:true});}
});
