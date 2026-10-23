import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { gunzipSync } from 'node:zlib';
import { Store, defaults, todayIn, addDays, weekday, paymentMethods } from '../app/domain.mjs';
import { Backups, decodeArchive } from '../app/backup.mjs';

const tables=['students','schedules','sessions','busy_blocks'];
const normalized=rows=>rows.map(row=>({...row})).sort((a,b)=>a.id.localeCompare(b.id));
const data=store=>({settings:store.settings(),...Object.fromEntries(tables.map(table=>[table,normalized(store.all(table))]))});
const schedule=(studentId,startDate,extra={})=>({studentId,title:'Español — conversación',time:'10:15',duration:45,price:4750000,modality:'online',notes:'Preparar lectura y audio.',startDate,endDate:'',weekday:weekday(startDate),recurrence:'weekly',active:true,...extra});

test('a downloaded backup restores every business field on a clean PC, including payments, prospects, exceptions and settings',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-transfer-'));
  const sourceDir=path.join(dir,'source'),targetDir=path.join(dir,'new-pc');
  await mkdir(sourceDir);await mkdir(targetDir);
  let source,target;
  try {
    source=new Store(path.join(sourceDir,'amapola.sqlite'));
    target=new Store(path.join(targetDir,'amapola.sqlite'));
    for(const table of tables)assert.equal(target.all(table).length,0);
    assert.deepEqual(target.settings(),defaults);
    source.saveSettings({...defaults,name:'Profesora de prueba',business:'Clases de prueba',email:'profesora@example.test',phone:'+57 300 000 0000',notes:'Configuración que debe viajar.',currency:'EUR',timezone:'Europe/Paris',backupMode:'folder',backupFolder:sourceDir,driveId:'123456',driveFolder:'Pruebas/Copias'});
    const today=todayIn(source.settings().timezone),start=addDays(today,-35);
    const active=source.saveStudent({firstName:'Ana',lastName:'Prueba',channel:'whatsapp',phone:'+57 300 123 4567',email:'ana@example.test',messenger:'https://m.me/ana-prueba',notes:'Preferencias, objetivos y enlaces https://example.test/contacto',color:'#bc587a',stage:'student',active:true});
    const inactive=source.saveStudent({firstName:'Luis',lastName:'Anterior',channel:'email',phone:'+33 600 000 001',email:'luis@example.test',notes:'Alumno inactivo: conservar su historia.',color:'#698f9d',active:false});
    const prospect=source.saveStudent({firstName:'Sofía',lastName:'Potencial',channel:'instagram',phone:'+33 600 000 002',email:'sofia@example.test',messenger:'https://m.me/sofia-prueba',notes:'En conversación: responder el viernes. https://www.instagram.com/prueba/',color:'#8b79bd',stage:'prospect'});
    const rule=source.saveSchedule(schedule(active.id,start));
    source.saveSchedule(schedule(active.id,addDays(today,3),{title:'Clase puntual',recurrence:'once',time:'15:30',duration:90,modality:'travel',price:8900000}));
    source.saveSchedule(schedule(inactive.id,addDays(today,4),{active:false,title:'Horario pausado',modality:'home'}));
    source.freezePast();
    const past=source.history(active.id).sort((a,b)=>a.date.localeCompare(b.date));
    source.saveSession({...past[0],status:'completed',notes:'Clase realizada y anotaciones del historial.'},past[0].id);
    source.saveSession({...past[1],status:'cancelled',notes:'Cancelación individual.'},past[1].id);
    source.saveSession({...past[2],date:addDays(past[2].date,1),time:'11:45',duration:30,price:2500000,modality:'home',notes:'Excepción: horario y tarifa propios.'},past[2].id);
    const anchor=addDays(today,7),selected=source.projected(rule,anchor);
    source.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},selected.id);
    const futureException=source.projected(rule,addDays(anchor,14));
    source.saveSession({...futureException,time:'18:00',notes:'Excepción futura que debe conservarse.'},futureException.id);
    const split=source.changeSession({...selected,date:addDays(anchor,1),time:'12:30',duration:60,scope:'following',paymentStatus:'paid',paymentMethod:'transfer'},selected.id);
    const nextRule=source.get('schedules',split.newScheduleId);
    source.saveSessionStatus({status:'confirmed'},split.id);
    const removed=source.projected(nextRule,addDays(nextRule.startDate,21));source.deleteSession(removed.id);
    let weeks=4;
    for(const method of paymentMethods.filter(Boolean)) {
      const occurrence=source.projected(nextRule,addDays(nextRule.startDate,7*weeks++));
      source.savePayment({paymentStatus:'paid',paymentMethod:method},occurrence.id);
    }
    source.saveBusyBlock({title:'Cita personal',date:addDays(today,2),time:'08:15',duration:90,notes:'Bloque Ocupada sin alumno ni pago.'});
    source.saveBusyBlock({title:'Pausa pasada',date:addDays(today,-2),time:'13:00',duration:30,notes:'También se conserva el pasado.'});
    const beforeFuture=source.occurrences(today,addDays(today,180));
    const beforeHistory=source.history(active.id);
    const copy=await new Backups(source,sourceDir).snapshot();
    const downloaded=await new Backups(source,sourceDir).read(copy.filename);
    const decoded=decodeArchive(downloaded),raw=JSON.parse(gunzipSync(downloaded));
    assert.equal(raw.version,5);
    assert.deepEqual(decoded.students.find(row=>row.id===prospect.id).notes,prospect.notes);
    const expected=data(source);
    source.close();source=null;
    target.importData(raw);
    assert.deepEqual(data(target),expected);
    assert.deepEqual(target.occurrences(today,addDays(today,180)),beforeFuture);
    assert.deepEqual(target.history(active.id),beforeHistory);
    assert.equal(target.get('students',prospect.id).stage,'prospect');
    assert.equal(target.get('students',prospect.id).channel,'instagram');
    assert.equal(target.get('students',inactive.id).active,0);
    assert.equal(target.get('sessions',split.id).status,'confirmed');
    assert.equal(target.occurrences(removed.date,removed.date).some(row=>row.scheduleId===nextRule.id),false);
    assert.deepEqual(new Set(target.all('sessions').filter(row=>row.paymentStatus==='paid').map(row=>row.paymentMethod)),new Set(paymentMethods.filter(Boolean)));
    target.close();target=new Store(path.join(targetDir,'amapola.sqlite'));
    assert.deepEqual(data(target),expected);
  } finally {
    source?.close();target?.close();await rm(dir,{recursive:true,force:true});
  }
});
