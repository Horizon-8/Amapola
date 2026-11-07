import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { paymentState, hasEnded } from '../app/public/class-utils.mjs';
function ui(){
  const source=readFileSync(new URL('../app/public/app.js',import.meta.url),'utf8'),nodes={},events=[];
  const node=selector=>nodes[selector]??={open:false,innerHTML:'',textContent:'',classList:{toggle(){}},showModal(){this.open=true;events.push('open');},close(){this.open=false;events.push('close');}};
  const context=vm.createContext({URL,paymentState,hasEnded,setTimeout:fn=>{fn();return 1;},clearTimeout(){},window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>null},location:{hash:'#calendario'},document:{querySelector:node,querySelectorAll:()=>[]}});
  vm.runInContext(source.slice(source.indexOf('/* Amapola'),source.indexOf("document.addEventListener('click'")),context);
  return {context,nodes,events};
}
test('startup asks to receive and closing offers send/close, with no shutdown if sending fails',async()=>{
  const {context}=ui();vm.runInContext(`
    S.google={configured:true,connected:true,paused:false};globalThis.forms=[];globalThis.actions=[];
    modal=(title,subtitle,body,footer,submit)=>forms.push({title,body,footer,submit});
    runGoogleSync=async direction=>actions.push(direction);shutdownLocalApp=async()=>actions.push('close');
    startupGooglePrompt();shutdownPrompt();
  `,context);
  assert.match(context.forms[0].footer,/Trabajar sin actualizar/);assert.match(context.forms[0].footer,/Recibir de Google/);
  assert.match(context.forms[1].footer,/Cerrar sin enviar/);assert.match(context.forms[1].footer,/Enviar y cerrar/);assert.match(context.forms[1].footer,/Cancelar/);
  await context.forms[0].submit();await context.forms[1].submit();assert.deepEqual(Array.from(context.actions),['pull','push','close']);
  vm.runInContext("runGoogleSync=async()=>{throw Error('Sin Internet');};",context);
  await assert.rejects(context.forms[1].submit(),/Sin Internet/);assert.deepEqual(Array.from(context.actions),['pull','push','close']);
});
test('the flower overlay remains open while the operation runs, suppresses duplicate clicks, and closes only after confirmation',async()=>{
  const {context,nodes,events}=ui();vm.runInContext(`
    globalThis.calls=[];globalThis.polls=0;refresh=async()=>{};render=async()=>{};toast=()=>{};
    api=async(route,method,value)=>{calls.push({route,method,value});if(method==='POST')return {state:'syncing',operation:{id:'op',direction:'push',ok:null,total:1,done:0}};polls++;return polls===1?{state:'syncing',operation:{id:'op',direction:'push',ok:null,total:1,done:0}}:{state:'sent',operation:{id:'op',direction:'push',ok:true,total:1,done:1}};};
    globalThis.first=runGoogleSync('push');globalThis.second=runGoogleSync('pull');
  `,context);
  assert.equal(nodes['#google-progress'].open,true);await Promise.all([context.first,context.second]);
  assert.equal(context.calls.filter(r=>r.method==='POST').length,1);assert.equal(context.calls[0].value.direction,'push');assert.equal(nodes['#google-progress'].open,false);assert.deepEqual(events,['open','close']);
});
test('returning to the calendar while offline shows the warning again and never performs a sync implicitly',async()=>{
  const {context}=ui();vm.runInContext(`
    S.google={configured:true,connected:true};globalThis.warnings=[];globalThis.routes=[];
    modal=(title,subtitle,body)=>warnings.push({title,body});
    api=async route=>{routes.push(route);return {configured:true,connected:true,online:false,connectionIssue:'Sin conexión con Google'};};
    globalThis.check=()=>checkCalendarEntry();
  `,context);
  await context.check();await context.check();assert.equal(context.warnings.length,2);assert.match(context.warnings[0].body,/Sin conexión/);assert.deepEqual(Array.from(context.routes),['/api/google/check','/api/google/check']);
});
test('display filters hide events without changing the complete set of data used by the application',()=>{
  const {context}=ui();vm.runInContext(`
    const student={id:'s1',firstName:'Ana',lastName:'',color:'#bc587a'};S.students=[student];S.today='2026-10-30';S.week='2026-10-26';
    S.google={sourceIds:null,calendarId:'target',hiddenCalendarIds:['$amapola','personal'],calendars:[{id:'personal',title:'Privado <chat>'},{id:'work',title:'Trabajo'}]};
    const row={id:'local-class',studentId:'s1',studentName:'Ana',color:student.color,date:S.today,time:'10:00',duration:60,title:'Clase',modality:'online',status:'planned',price:0};
    const blocks=['personal','work'].map(calendarId=>({id:'busy-'+calendarId,kind:'busy',source:'google',readOnly:true,calendarId,calendarName:calendarId,title:'Cita',date:S.today,time:'12:00',duration:60}));
    globalThis.html=renderCalendar([row],{current:{count:1,hours:1,total:0}},blocks);globalThis.keptRows=S.rows.length;globalThis.keptBlocks=S.busyBlocks.length;
  `,context);
  assert.doesNotMatch(context.html,/data-id="local-class"|data-id="busy-personal"/);assert.match(context.html,/data-id="busy-work"/);assert.match(context.html,/Privado &lt;chat&gt;/);assert.equal(context.keptRows,1);assert.equal(context.keptBlocks,2);
});
