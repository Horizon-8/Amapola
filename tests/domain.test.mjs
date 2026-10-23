import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, defaults, addDays, monday, todayIn, weekday, studentInput, validateArchive } from '../app/domain.mjs';
const student = { firstName: 'Ana', lastName: 'Pérez', channel: 'whatsapp', phone: '+57 300 000 0000', email: 'ana@example.test', messenger: '', notes: 'Objetivo: conversación', color: '#bc587a', active: true };
function setup(t) { const db = new Store(':memory:'); t.after(()=>db.close()); const s=db.saveStudent(student); const today=todayIn(defaults.timezone); return { db,s,today }; }
const plan = (studentId, date, overrides={}) => ({ studentId, title:'Francés', time:'16:00', duration:60, price:7500000, modality:'online', notes:'', startDate:date, endDate:'', weekday:weekday(date), recurrence:'weekly', active:true,...overrides });
test('weekly recurrence respects start/end boundaries and Monday-based weekdays',t=>{
  const {db,s,today}=setup(t),start=addDays(monday(today),7);
  db.saveSchedule(plan(s.id,addDays(start,1),{weekday:3,endDate:addDays(start,17)}));
  const rows=db.occurrences(start,addDays(start,27));
  assert.deepEqual(rows.map(r=>r.date),[addDays(start,3),addDays(start,10),addDays(start,17)]);
  assert.equal(rows[0].modality,'online');
});
test('one-off sessions appear once and a moved exception never duplicates the original',t=>{
  const {db,s,today}=setup(t),date=addDays(today,10);
  const p=db.saveSchedule(plan(s.id,date,{recurrence:'once'}));
  let rows=db.occurrences(today,addDays(today,30));assert.equal(rows.length,1);
  const row=rows[0];db.saveSession({...row,date:addDays(date,8),status:'completed'},row.id);
  rows=db.occurrences(date,addDays(date,6));assert.equal(rows.length,0);
  rows=db.occurrences(addDays(date,7),addDays(date,9));assert.equal(rows.length,1);assert.equal(rows[0].status,'completed');
  assert.equal(db.all('sessions')[0].scheduleId,p.id);
});
test('editing recurrence preserves dates, tariffs and modalities of past sessions',t=>{
  const {db,s,today}=setup(t),start=addDays(today,-21);
  const p=db.saveSchedule(plan(s.id,start,{time:'08:00'}));
  const before=db.history(s.id).map(r=>({date:r.date,price:r.price,time:r.time,modality:r.modality}));assert.ok(before.length>=3);
  db.saveSchedule({...p,active:true,startDate:today,weekday:(p.weekday+2)%7,time:'12:00',price:10000000,modality:'travel'},p.id);
  const after=db.history(s.id).map(r=>({date:r.date,price:r.price,time:r.time,modality:r.modality}));
  assert.deepEqual(after,before);
  const next=db.occurrences(addDays(today,1),addDays(today,21));assert.ok(next.every(r=>r.price===10000000&&r.time==='12:00'));
});
test('cancelled classes do not contribute to estimated revenue; exact price per session',t=>{
  const {db,s,today}=setup(t),start=addDays(monday(today),7);
  db.saveSchedule(plan(s.id,start,{price:12345}));db.saveSchedule(plan(s.id,addDays(start,1),{price:23456,duration:90}));
  const rows=db.occurrences(start,addDays(start,6));
  db.saveSession({...rows[0],status:'cancelled'},rows[0].id);
  const report=db.report(start);assert.equal(report.current.total,23456);assert.equal(report.current.count,1);assert.equal(report.current.hours,1.5);assert.equal(report.next.total,35801);
});

test('a future effective date keeps the existing timetable until that date',t=>{
  const {db,s,today}=setup(t),start=addDays(today,1),effective=addDays(start,21);
  const p=db.saveSchedule(plan(s.id,start));
  db.saveSchedule({...p,active:true,startDate:effective,time:'18:00',price:9000000},p.id);
  const rows=db.occurrences(start,addDays(effective,7));
  assert.deepEqual(rows.filter(r=>r.date<effective).map(r=>r.date),[start,addDays(start,7),addDays(start,14)]);
  assert.ok(rows.filter(r=>r.date<effective).every(r=>r.time==='16:00'&&r.price===7500000));
  assert.ok(rows.filter(r=>r.date>=effective).every(r=>r.time==='18:00'&&r.price===9000000));
});
test('pausing an active student preserves history and suppresses future recurrence',t=>{
  const {db,s,today}=setup(t);db.saveSchedule(plan(s.id,addDays(today,-14)));
  assert.ok(db.history(s.id).length);db.saveStudent({...s,active:false},s.id);
  assert.equal(db.occurrences(addDays(today,1),addDays(today,30)).length,0);assert.ok(db.history(s.id).length);
});
test('deleting a recurring rule preserves history; deleting student cascades intentionally',t=>{
  const {db,s,today}=setup(t),p=db.saveSchedule(plan(s.id,addDays(today,-14)));
  const count=db.history(s.id).length;db.deleteSchedule(p.id);assert.equal(db.history(s.id).length,count);assert.equal(db.all('schedules').length,0);
  assert.ok(db.all('sessions').every(r=>r.scheduleId===null));db.deleteStudent(s.id);assert.equal(db.all('sessions').length,0);
});
test('backup restore preserves IDs, exceptions and settings; bad foreign keys leave database unchanged',t=>{
  const {db,s,today}=setup(t);const p=db.saveSchedule(plan(s.id,addDays(today,7)));
  const [row]=db.occurrences(addDays(today,7),addDays(today,7));db.saveSession({...row,status:'cancelled'},row.id);
  const archive=db.exportData();db.deleteStudent(s.id);db.importData(archive);
  assert.equal(db.get('students',s.id).email,student.email);assert.equal(db.get('schedules',p.id).price,7500000);assert.equal(db.all('sessions')[0].status,'cancelled');
  const broken=structuredClone(archive);broken.schedules[0].studentId='missing';assert.throws(()=>db.importData(broken));assert.equal(db.all('students').length,1);
  assert.throws(()=>validateArchive({...archive,version:999}));
});
test('rejects malformed dates, HTML colors, negative tariffs and classes spanning midnight',t=>{
  const {db,s,today}=setup(t);
  assert.throws(()=>studentInput({...student,color:'" onclick="'}));
  assert.throws(()=>db.saveSchedule(plan(s.id,'2026-02-30')));
  assert.throws(()=>db.saveSchedule(plan(s.id,today,{price:-1})));
  assert.throws(()=>db.saveSchedule(plan(s.id,today,{time:'23:30',duration:60})));
});
