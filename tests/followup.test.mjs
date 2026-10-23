import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Store, defaults, todayIn, addDays, weekday } from '../app/domain.mjs';

const date=addDays(todayIn(defaults.timezone),10);
function fixture(t) {
  const db=new Store(':memory:');t.after(()=>db.close());
  const student=db.saveStudent({firstName:'Ana',lastName:'Pérez',color:'#bc587a'});
  const lesson={studentId:student.id,title:'Español',startDate:date,endDate:'',weekday:weekday(date),time:'10:00',duration:60,price:50000,active:true};
  return {db,student,lesson};
}
const state=db=>JSON.stringify(['students','schedules','sessions','busy_blocks'].map(table=>db.all(table)));

test('prospects retain contacts and notes, convert to students and survive backups',t=>{
  const {db}=fixture(t);
  const prospect=db.saveStudent({firstName:'Lucía',color:'#698f9d',stage:'prospect',channel:'instagram',phone:'+57 300 123 4567',email:'lucia@example.test',messenger:'https://m.me/lucia',notes:'Hablar el viernes https://example.test/chat'});
  assert.equal(prospect.active,0);assert.equal(prospect.stage,'prospect');
  const archive=db.exportData();assert.equal(archive.version,4);db.importData(archive);
  assert.equal(db.get('students',prospect.id).messenger,prospect.messenger);
  assert.equal(db.get('students',prospect.id).stage,'prospect');
  assert.equal(db.get('students',prospect.id).channel,'instagram');
  const active=db.saveStudent({...prospect,stage:'student',active:true},prospect.id);
  assert.equal(active.active,1);assert.equal(active.notes,prospect.notes);assert.equal(active.id,prospect.id);
  const inactive=db.saveStudent({...active,active:false},active.id);assert.equal(inactive.active,0);
  assert.throws(()=>db.saveStudent({...prospect,stage:'unknown'}));
});

test('conflicts identify classes and busy blocks, allow adjacent slots and never write previews',t=>{
  const {db,student,lesson}=fixture(t),rule=db.saveSchedule({...lesson,recurrence:'once'});
  const busy=db.saveBusyBlock({title:'Cita',date,time:'11:00',duration:30});
  const before=state(db);
  let result=db.conflicts({kind:'busy',value:{title:'Ocupada',date,time:'10:30',duration:60}});
  assert.equal(result.total,2);assert.equal(result.conflicts[0].studentName,'Ana Pérez');assert.equal(result.conflicts[1].title,'Cita');
  assert.equal(state(db),before);
  result=db.conflicts({kind:'busy',id:busy.id,value:{...busy,time:'11:00'}});assert.equal(result.total,0);
  result=db.conflicts({kind:'schedule',id:rule.id,value:{...rule,active:true}});assert.equal(result.total,0);
  result=db.conflicts({kind:'busy',value:{date,time:'09:00',duration:60}});assert.equal(result.total,0);
  assert.throws(()=>db.conflicts({kind:'schedule',value:{...lesson,time:'10:03'}}));assert.equal(state(db),before);
  assert.equal(db.previewing,false);
  assert.equal(db.get('students',student.id).active,1);
  db.saveBusyBlock({date,time:'15:00',duration:30});assert.equal(db.all('busy_blocks').length,2);
});

test('weekly previews detect later conflicts beyond the first year and roll back the whole simulation',t=>{
  const {db,lesson}=fixture(t);
  const later=addDays(date,700);
  db.saveBusyBlock({title:'Viaje',date:later,time:'10:15',duration:30});
  const before=state(db);
  const result=db.conflicts({kind:'schedule',value:{...lesson,endDate:addDays(date,800)}});
  assert.equal(result.total,1);assert.equal(result.conflicts[0].date,later);assert.equal(result.recurring,true);
  assert.equal(state(db),before);
  assert.equal(db.conflicts({kind:'schedule',value:{...lesson,endDate:addDays(date,14)}}).total,0);
  assert.equal(db.conflicts({kind:'schedule',value:{...lesson,active:false}}).total,0);
});

test('cancelled sessions free their slot and moved exceptions occupy only their new time',t=>{
  const {db,lesson}=fixture(t),rule=db.saveSchedule(lesson);
  const cancelled={...db.projected(rule,date),status:'cancelled'};
  db.saveSession(cancelled,cancelled.id);
  assert.equal(db.conflicts({kind:'busy',value:{date,time:'10:00',duration:60}}).total,0);
  const nextDate=addDays(date,7),next=db.projected(rule,nextDate);
  db.saveSession({...next,time:'12:00'},next.id);
  assert.equal(db.conflicts({kind:'busy',value:{date:nextDate,time:'10:00',duration:60}}).total,0);
  assert.equal(db.conflicts({kind:'busy',value:{date:nextDate,time:'12:00',duration:60}}).total,1);
  assert.equal(db.conflicts({kind:'session',id:next.id,value:{...next,time:'12:00',scope:'session'}}).total,0);
  assert.equal(db.conflicts({kind:'session',id:next.id,value:{...next,status:'cancelled',scope:'session'}}).total,0);
});

test('single-session and following previews match the actual series split, keeping exceptions and payments',t=>{
  const {db,lesson}=fixture(t),rule=db.saveSchedule({...lesson,endDate:addDays(date,28)}),row=db.projected(rule,date);
  const other=db.saveStudent({firstName:'Luis',color:'#698f9d'});
  db.saveSchedule({...lesson,studentId:other.id,startDate:addDays(date,14),recurrence:'once',time:'12:00'});
  const paid=db.projected(rule,addDays(date,7));db.savePayment({paymentStatus:'paid',paymentMethod:'cash'},paid.id);
  const exception=db.projected(rule,addDays(date,21));db.saveSession({...exception,date:addDays(date,28),time:'12:00'},exception.id);
  const before=state(db),value={...row,time:'12:00'};
  assert.equal(db.conflicts({kind:'session',id:row.id,value:{...value,scope:'session'}}).total,0);
  const result=db.conflicts({kind:'session',id:row.id,value:{...value,scope:'following'}});
  assert.equal(result.total,2);assert.equal(result.conflicts[0].studentName,'Luis');assert.equal(result.conflicts[1].studentName,'Ana Pérez');
  assert.equal(state(db),before);assert.equal(db.get('schedules',rule.id).time,'10:00');
  const changed=db.changeSession({...value,scope:'following'},row.id);
  assert.equal(db.get('schedules',changed.newScheduleId).time,'12:00');
  assert.equal(db.all('sessions').find(s=>s.originalDate===paid.originalDate).paymentStatus,'paid');
});

test('a v3 upgrade backs up busy blocks and contacts before adding student follow-up',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'amapola-followup-')),file=path.join(dir,'amapola.sqlite');let db;
  try {
    db=new Store(file);const student=db.saveStudent({firstName:'Antes',color:'#bc587a'});
    db.saveBusyBlock({date,time:'15:00',duration:30,title:'Pausa'});
    db.db.exec('ALTER TABLE students DROP COLUMN stage; PRAGMA user_version=3;');db.close();db=new Store(file);
    assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,4);
    assert.equal(db.get('students',student.id).stage,'student');assert.equal(db.all('busy_blocks').length,1);
    const fileName=readdirSync(path.join(dir,'copias')).find(n=>n.includes('antes-de-actualizar'));
    const archive=JSON.parse(gunzipSync(readFileSync(path.join(dir,'copias',fileName))));
    assert.equal(archive.version,3);assert.equal(archive.busy_blocks[0].title,'Pausa');
    db.importData(archive);assert.equal(db.get('students',student.id).stage,'student');assert.equal(db.all('busy_blocks').length,1);
  } finally {db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('historical new plans warn against existing historical lessons without materializing preview data',t=>{
  const {db,lesson}=fixture(t),past=addDays(todayIn(defaults.timezone),-3);
  db.saveSchedule({...lesson,startDate:past,recurrence:'once'});
  const before=state(db);
  const result=db.conflicts({kind:'schedule',value:{...lesson,startDate:past,recurrence:'once'}});
  assert.equal(result.total,1);assert.equal(result.conflicts[0].date,past);assert.equal(state(db),before);
});
