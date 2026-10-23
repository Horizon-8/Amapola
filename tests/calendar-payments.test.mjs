import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Store, defaults, todayIn, addDays, weekday } from '../app/domain.mjs';
import { paymentState, hasEnded, selectionRange, moveRange, resizeRange } from '../app/public/class-utils.mjs';

function fixture(t) {
  const db=new Store(':memory:');t.after(()=>db.close());
  const student=db.saveStudent({firstName:'Lucía',color:'#bc587a'}),today=todayIn(defaults.timezone);
  const plan=(date,extra={})=>db.saveSchedule({studentId:student.id,title:'Español',time:'10:00',duration:60,price:4500000,startDate:date,endDate:'',weekday:weekday(date),recurrence:'weekly',active:true,...extra});
  return {db,student,today,plan};
}
test('start times and durations enforce 15 minutes, including direct API data',t=>{
  const {plan,today}=fixture(t);
  for(const time of ['08:03','11:17','08:01','23:59'])assert.throws(()=>plan(today,{time}),/15 minutos/);
  for(const duration of [5,17,31])assert.throws(()=>plan(today,{duration}),/15 minutos/);
  for(const time of ['08:00','08:15','08:30','08:45'])assert.equal(plan(today,{time,duration:15}).time,time);
  assert.equal(plan(today,{time:'23:45',duration:15}).duration,15);
  assert.throws(()=>plan(today,{time:'23:45',duration:30}),/mismo día/);
});
test('payment colors use the end of a class and distinguish cancellations and advance payments',()=>{
  const row={date:'2026-10-20',time:'08:15',duration:45,price:100,paymentStatus:'unpaid',status:'planned'};
  assert.equal(hasEnded(row,'2026-10-20','08:59'),false);
  assert.equal(paymentState(row,'2026-10-20','08:59'),'pending');
  assert.equal(paymentState(row,'2026-10-20','09:00'),'overdue');
  assert.equal(paymentState(row,'2026-10-21','00:00'),'overdue');
  assert.equal(paymentState({...row,paymentStatus:'paid'},'2026-10-19','23:59'),'paid');
  assert.equal(paymentState({...row,status:'cancelled'},'2026-10-21','00:00'),'nocharge');
  assert.equal(paymentState({...row,price:0},'2026-10-21','00:00'),'nocharge');
  assert.equal(paymentState({...row,time:'23:45',duration:15},'2026-10-20','23:59'),'pending');
});
test('payments belong to exactly one occurrence, survive moves and round-trip through backups',t=>{
  const {db,today,plan}=fixture(t),date=addDays(today,5),rule=plan(date);
  const row=db.occurrences(date,date)[0];
  assert.throws(()=>db.savePayment({paymentStatus:'paid'},row.id),/método/);
  assert.equal(db.all('sessions').length,0);
  const paid=db.savePayment({paymentStatus:'paid',paymentMethod:'nequi'},row.id);
  assert.equal(paid.isOverride,0);
  db.changeSession({...paid,date:addDays(date,1),time:'11:15',duration:45,scope:'session'},paid.id);
  const rows=db.occurrences(date,addDays(date,14));
  assert.equal(rows.filter(r=>r.paymentStatus==='paid').length,1);
  assert.equal(rows.find(r=>r.paymentStatus==='paid').paymentMethod,'nequi');
  assert.equal(rows.find(r=>r.date===addDays(date,7)).time,'10:00');
  assert.equal(rows.filter(r=>r.date===date).length,0);
  const archive=db.exportData();assert.equal(archive.version,4);db.importData(archive);
  assert.equal(db.all('sessions')[0].paymentMethod,'nequi');
  assert.equal(db.get('schedules',rule.id).time,'10:00');
});
test('following scope splits a series, follows payments and preserves history and individual exceptions',t=>{
  const {db,today,plan}=fixture(t),start=addDays(today,-28),rule=plan(start);
  const all=db.occurrences(today,addDays(today,35));
  const selected=all.find(r=>r.date>today),anchor=selected.date;
  const paymentOnly=all.find(r=>r.date===addDays(anchor,7));
  db.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},paymentOnly.id);
  const exception=all.find(r=>r.date===addDays(anchor,14));
  db.saveSession({...exception,time:'16:45',status:'cancelled'},exception.id);
  const before=db.history(selected.studentId).map(r=>[r.date,r.time,r.price]);
  db.changeSession({...selected,date:addDays(anchor,1),time:'11:15',duration:90,scope:'following'},selected.id);
  assert.deepEqual(db.history(selected.studentId).map(r=>[r.date,r.time,r.price]),before);
  const after=db.occurrences(today,addDays(anchor,28));
  assert.equal(after.filter(r=>r.date===anchor).length,0);
  assert.equal(after.filter(r=>r.date===addDays(anchor,1)).length,1);
  const paid=after.find(r=>r.paymentStatus==='paid');
  assert.equal(paid.date,addDays(anchor,8));assert.equal(paid.time,'11:15');assert.equal(paid.duration,90);
  assert.equal(paid.paymentMethod,'transfer');
  const cancelled=after.find(r=>r.status==='cancelled');
  assert.equal(cancelled.date,addDays(anchor,14));assert.equal(cancelled.time,'16:45');
  assert.equal(after.filter(r=>r.date===addDays(anchor,15)).length,0);
  assert.equal(db.get('schedules',rule.id).endDate,addDays(anchor,-1));
});
test('following scope cannot rewrite history and an invalid change rolls back entirely',t=>{
  const {db,today,plan}=fixture(t),rule=plan(addDays(today,-7));
  const past=db.history(rule.studentId)[0],before=db.exportData();
  assert.throws(()=>db.changeSession({...past,date:addDays(today,7),scope:'following'},past.id),/ya iniciadas/);
  assert.deepEqual(db.all('schedules'),before.schedules);
  assert.deepEqual(db.all('sessions'),before.sessions);
});
test('the class ledger includes all history, filters payments and paginates without losing totals',t=>{
  const {db,today,plan}=fixture(t);plan(addDays(today,-500));
  const history=db.classLedger({period:'past'});assert.ok(history.total>50);assert.equal(history.rows.length,50);assert.equal(history.page,1);
  const second=db.classLedger({period:'past',page:2});assert.ok(second.rows.length>0);assert.deepEqual(second.totals,history.totals);
  assert.ok(second.rows.some(r=>r.date<addDays(today,-365)));
  const row=history.rows[0];db.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);
  const paid=db.classLedger({period:'past',payment:'paid',method:'cash'});assert.equal(paid.total,1);assert.equal(paid.totals.paid,row.price);
  const overdue=db.classLedger({period:'past',payment:'overdue'});assert.equal(overdue.total,history.total-1);
  assert.ok(db.classLedger({period:'future'}).rows.every(r=>!r.isPast));
});
test('v1 databases migrate with a safety copy; old off-grid times and backups remain readable',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'amapola-v1-')),file=path.join(dir,'old.sqlite');
  let db;
  try {
    db=new Store(file);const student=db.saveStudent({firstName:'Anterior',color:'#bc587a'}),date=addDays(todayIn(defaults.timezone),-8);
    db.saveSchedule({studentId:student.id,title:'Antigua',time:'10:00',duration:60,price:2500,startDate:date,weekday:weekday(date)});
    db.freezePast();
    db.db.exec("UPDATE sessions SET time='08:03',duration=17; ALTER TABLE sessions DROP COLUMN paymentStatus; ALTER TABLE sessions DROP COLUMN paymentMethod; ALTER TABLE sessions DROP COLUMN isOverride; PRAGMA user_version=1;");
    db.close();db=new Store(file);
    assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,4);
    assert.equal(db.all('sessions')[0].paymentStatus,'unpaid');assert.equal(db.all('sessions')[0].time,'08:03');
    const copies=readdirSync(path.join(dir,'copias'));assert.equal(copies.length,1);
    const archive=JSON.parse(gunzipSync(readFileSync(path.join(dir,'copias',copies[0]))));assert.equal(archive.version,1);
    db.importData(archive);assert.equal(db.all('sessions')[0].duration,17);
    db.savePayment({paymentStatus:'paid',paymentMethod:'cash'},db.all('sessions')[0].id);
    const current=db.exportData();db.importData(current);assert.equal(db.all('sessions')[0].paymentMethod,'cash');
    db.close();db=new Store(file);assert.equal(readdirSync(path.join(dir,'copias')).length,1);
  } finally { db?.close();rmSync(dir,{recursive:true,force:true}); }
});
test('calendar movement, upward selections and both resize edges snap to quarter hours',()=>{
  assert.deepEqual(selectionRange(8*60+3,9*60+2),{start:480,duration:75});
  assert.deepEqual(selectionRange(9*60+2,8*60+3),{start:480,duration:75});
  assert.deepEqual(moveRange(480,60,19),{start:495,duration:60});
  assert.deepEqual(moveRange(480,60,-1000),{start:0,duration:60});
  assert.deepEqual(moveRange(1380,60,120),{start:1380,duration:60});
  assert.deepEqual(resizeRange(480,60,'end',-40),{start:480,duration:15});
  assert.deepEqual(resizeRange(480,60,'start',19),{start:495,duration:45});
  assert.deepEqual(resizeRange(480,60,'start',100),{start:525,duration:15});
  assert.deepEqual(resizeRange(1425,15,'end',100),{start:1425,duration:15});
});
