import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import { Store, defaults, todayIn, addDays, weekday } from '../app/domain.mjs';
import { createFormsUI } from '../app/public/ui/forms.mjs';

const studentValue={firstName:'Ana',lastName:'Pérez',color:'#bc587a',defaultPrice:4750000};
const scheduleValue=studentId=>{const date=addDays(todayIn(defaults.timezone),3);return {studentId,title:'Conversación',time:'10:00',duration:60,startDate:date,weekday:weekday(date),recurrence:'once'};};

test('student prices are defaults for new lessons, while explicit prices, free lessons and existing payments stay independent',()=>{
  const store=new Store(':memory:');try{
    const student=store.saveStudent(studentValue),draft=scheduleValue(student.id),rule=store.saveSchedule(draft);
    assert.equal(rule.price,student.defaultPrice);
    assert.equal(store.saveSchedule({...draft,price:1200000}).price,1200000);assert.equal(store.saveSchedule({...draft,price:0}).price,0);
    const paid=store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},store.projected(rule,rule.startDate).id);
    store.saveStudent({...student,active:true,defaultPrice:6000000},student.id);
    assert.equal(store.get('schedules',rule.id).price,4750000);assert.equal(store.get('sessions',paid.id).price,4750000);assert.equal(store.get('sessions',paid.id).paymentStatus,'paid');
    assert.equal(store.saveSchedule(draft).price,6000000);
    const {defaultPrice,...olderClient}=student;store.saveStudent({...olderClient,active:true},student.id);assert.equal(store.get('students',student.id).defaultPrice,6000000);
    const restored=new Store(':memory:');try{restored.importData(store.exportData());assert.equal(restored.get('students',student.id).defaultPrice,6000000);assert.equal(restored.get('sessions',paid.id).paymentMethod,'cash');}finally{restored.close();}
    for(const invalid of [-1,1.5,'25',null,100000000001])assert.throws(()=>store.saveStudent({...studentValue,defaultPrice:invalid}),/Tarifa habitual/);
  }finally{store.close();}
});

test('v5 and v7 databases migrate without the new column, retain all business data and produce a readable pre-upgrade copy',async t=>{
  for(const version of [5,7])await t.test('schema v'+version,async()=>{
    const directory=await mkdtemp(path.join(os.tmpdir(),'amapola-price-migration-')),file=path.join(directory,'amapola.sqlite');let store;
    try{
      store=new Store(file);const student=store.saveStudent(studentValue),rule=store.saveSchedule({...scheduleValue(student.id),price:1234500});
      const paid=store.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},store.projected(rule,rule.startDate).id);
      const prospect=store.saveStudent({firstName:'Contacto',stage:'prospect',messenger:'https://m.me/prueba',notes:'Seguimiento',color:'#bc587a'});
      store.db.exec('ALTER TABLE students DROP COLUMN defaultPrice;');
      if(version===5)store.db.exec('DROP TABLE google_sync;');
      else store.insert('google_sync',{id:'config',json:JSON.stringify({namespace:'12345678-1234-1234-1234-123456789abc',calendarId:'target',account:'personal',sourceIds:null,hiddenCalendarIds:['work']})});
      store.db.exec('PRAGMA user_version='+version);store.close();store=new Store(file);
      assert.equal(store.db.prepare('PRAGMA user_version').get().user_version,8);assert.equal(store.get('students',student.id).defaultPrice,0);
      assert.equal(store.get('students',prospect.id).stage,'prospect');assert.equal(store.get('students',prospect.id).notes,'Seguimiento');
      assert.equal(store.get('sessions',paid.id).paymentStatus,'paid');assert.equal(store.get('sessions',paid.id).price,1234500);assert.equal(store.get('sessions',paid.id).paymentMethod,'transfer');
      assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
      if(version===7)assert.equal(JSON.parse(store.all('google_sync')[0].json).calendarId,'target');
      const copies=await readdir(path.join(directory,'copias'));assert.equal(copies.length,1);
      const raw=JSON.parse(gunzipSync(await readFile(path.join(directory,'copias',copies[0]))));assert.equal(raw.version,version);assert.equal(Object.hasOwn(raw.students[0],'defaultPrice'),false);
      const restored=new Store(':memory:');try{restored.importData(raw);assert.equal(restored.get('students',student.id).defaultPrice,0);assert.equal(restored.get('sessions',paid.id).paymentStatus,'paid');}finally{restored.close();}
    }finally{store?.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));await rm(directory,{recursive:true,force:true});}
  });
});

function priceForm(automatic=true){
  const events={},selectionEvents={},classes=new Set(),warning={hidden:true};
  const price={value:'42.50',dataset:automatic?{studentDefault:'true'}:{},addEventListener:(event,fn)=>events[event]=fn,closest:()=>({classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}})};
  const student={value:'a',addEventListener:(event,fn)=>selectionEvents[event]=fn};
  const form={elements:{price,studentId:student},querySelector:()=>warning};
  const ui=createFormsUI({S:{students:[{id:'a',defaultPrice:2500},{id:'b',defaultPrice:0}]},priceInput:cents=>(cents/100).toFixed(2),esc:String});
  ui.setupClassPrice(form);return {ui,price,student,warning,classes,events,selectionEvents};
}
test('student selection prefills new prices, custom amounts remain editable and zero warnings react immediately',()=>{
  const {ui,price,student,warning,classes,events,selectionEvents}=priceForm();assert.equal(price.value,'25.00');assert.equal(warning.hidden,true);
  price.value='12,50';events.input();assert.equal(price.value,'12,50');assert.equal(warning.hidden,true);
  student.value='b';selectionEvents.change();assert.equal(price.value,'0.00');assert.equal(warning.hidden,false);assert.equal(classes.has('price-zero'),true);
  price.value='10.00';events.input();assert.equal(warning.hidden,true);assert.equal(classes.has('price-zero'),false);
  assert.match(ui.inputField('price','Tarifa','0.00'),/price-zero/);assert.match(ui.inputField('price','Tarifa','0.00'),/role="status"/);
  assert.match(ui.inputField('price','Tarifa','25.00'),/id="class-price-warning" role="status" hidden/);
  const existing=priceForm(false);assert.equal(existing.price.value,'42.50');assert.equal(existing.selectionEvents.change,undefined);
});
