import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, defaults, addDays, todayIn, weekday } from '../app/domain.mjs';

function setup(t){const store=new Store(':memory:');store.saveSettings({...defaults,timezone:'UTC'});t.after(()=>store.close());const student=store.saveStudent({firstName:'Ana',color:'#bc587a'});return {store,student,today:todayIn('UTC')};}
const plan=(student,date)=>({studentId:student.id,title:'Español',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:50000,recurrence:'biweekly'});
test('biweekly dates align with the first eligible weekday and keep their phase when viewing a later range',t=>{
  const {store,student}=setup(t),rule=store.saveSchedule({...plan(student,'2026-11-01'),weekday:0});
  assert.deepEqual(store.scheduleDates(rule,'2026-11-01','2026-12-01'),['2026-11-02','2026-11-16','2026-11-30']);
  assert.deepEqual(store.scheduleDates(rule,'2026-11-10','2026-11-29'),['2026-11-16']);
});
test('editing a fortnightly plan on its skipped week keeps the next real occurrence rather than adding a class today',t=>{
  const {store,student,today}=setup(t),rule=store.saveSchedule(plan(student,addDays(today,-21)));
  const changed=store.saveSchedule({...rule,active:true,price:60000},rule.id);
  assert.deepEqual(store.scheduleDates(changed,today,addDays(today,30)),[addDays(today,7),addDays(today,21)]);
  assert.deepEqual(store.occurrences(today,addDays(today,30)).map(row=>row.price),[60000,60000]);
  const clean=new Store(':memory:');try{clean.importData(store.exportData());assert.equal(clean.all('schedules')[0].recurrence,'biweekly');}finally{clean.close();}
});
test('following edits retain the 14-day interval, follow payments and preserve deleted exceptions',t=>{
  const {store,student,today}=setup(t),first=addDays(today,3),rule=store.saveSchedule(plan(student,first));
  const selected=store.projected(rule,first),paid=store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},store.projected(rule,addDays(first,14)).id);
  const deleted=store.deleteSession(store.projected(rule,addDays(first,28)).id);
  const changed=store.changeSession({...selected,scope:'following',date:addDays(first,1),time:'11:00'},selected.id);
  assert.equal(store.get('schedules',changed.newScheduleId).recurrence,'biweekly');
  const rows=store.occurrences(first,addDays(first,45));assert.deepEqual(rows.map(r=>r.date),[addDays(first,1),addDays(first,15),addDays(first,43)]);
  assert.equal(store.get('sessions',paid.id).paymentStatus,'paid');assert.equal(store.get('sessions',paid.id).date,addDays(first,15));assert.equal(store.get('sessions',deleted.id).isDeleted,1);
  assert.equal(store.get('sessions',paid.id).time,'11:00');
});
