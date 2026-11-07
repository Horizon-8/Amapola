import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { paymentState, hasEnded } from '../app/public/class-utils.mjs';
import { uiDefinitions } from './ui-fixture.mjs';
function ui({setTimeoutImpl=fn=>{fn();return 1;}}={}){
  const nodes={},events=[];
  const node=selector=>nodes[selector]??={open:false,innerHTML:'',textContent:'',classList:{toggle(){}},showModal(){this.open=true;events.push('open');},close(){this.open=false;events.push('close');}};
  const context=vm.createContext({URL,paymentState,hasEnded,setTimeout:setTimeoutImpl,clearTimeout(){},window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>null},location:{hash:'#calendario'},document:{querySelector:node,querySelectorAll:()=>[]}});
  vm.runInContext(uiDefinitions(),context);
  vm.runInContext('S.opening=false;',context);
  return {context,nodes,events};
}
test('closing offers send/close, with no shutdown if sending fails',async()=>{
  const {context}=ui();vm.runInContext(`
    S.google={configured:true,connected:true,paused:false};globalThis.forms=[];globalThis.actions=[];
    modal=(title,subtitle,body,footer,submit)=>forms.push({title,body,footer,submit});
    runGoogleSync=async direction=>actions.push(direction);shutdownLocalApp=async()=>actions.push('close');
    shutdownPrompt();
  `,context);
  assert.match(context.forms[0].footer,/Cerrar sin enviar/);assert.match(context.forms[0].footer,/Enviar y cerrar/);assert.match(context.forms[0].footer,/Cancelar/);
  await context.forms[0].submit();assert.deepEqual(Array.from(context.actions),['push','close']);
  vm.runInContext("runGoogleSync=async()=>{throw Error('Sin Internet');};",context);
  await assert.rejects(context.forms[0].submit(),/Sin Internet/);assert.deepEqual(Array.from(context.actions),['push','close']);
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

test('complete calendar rendering and navigation work with or without a Google connection',async t=>{
  for(const connected of [false,true])await t.test(connected?'Google connected':'Google not configured',async()=>{
    const {context,nodes}=ui(),visibility=[{dataset:{calendarVisibility:'$amapola'}},{dataset:{calendarVisibility:'$local-busy'}}];
    const listeners=[];visibility.forEach(input=>input.addEventListener=(type,listener)=>listeners.push({input,type,listener}));
    for(const key of ['#main','#page-name','#google-sync-control','.calendar-scroll','.calendar-body'])context.document.querySelector(key);
    nodes['.calendar-scroll'].clientHeight=600;
    nodes['.calendar-body'].querySelector=()=>null;
    context.document.querySelector=selector=>selector==='[data-calendar-visibility]'?(context.location.hash==='#calendario'?visibility[0]:null):selector.startsWith('.calendar-')&&context.location.hash!=='#calendario'?null:nodes[selector]||null;
    context.document.querySelectorAll=selector=>selector==='[data-calendar-visibility]'&&context.location.hash==='#calendario'?visibility:[];
    context.attachCalendarGestures=()=>{context.gestures=(context.gestures||0)+1;return ()=>{};};
    context.attachCalendarClock=()=>()=>{};
    vm.runInContext(`
      Object.assign(S,{today:'2026-10-30',week:'2026-10-26',google:{configured:${connected},connected:${connected},state:'${connected?'pending':'disconnected'}',sourceIds:null,calendars:[],hiddenCalendarIds:[]}});
      globalThis.errors=[];toast=(message,error)=>{if(error)errors.push(message);};
      api=async route=>route.startsWith('/api/reports')?{current:{count:0,hours:0,total:0}}:[];
      globalThis.openView=async page=>{location.hash='#'+page;await render();};
    `,context);
    for(const page of ['calendario','alumnos','planificacion','calendario']){
      await context.openView(page);assert.doesNotMatch(nodes['#main'].innerHTML,/No se pudo abrir esta vista/);
    }
    assert.equal(context.errors.length,0);assert.equal(context.gestures,2);assert.equal(listeners.length,4);
    assert.match(nodes['#main'].innerHTML,/Agendas visibles/);
  });
});

test('opening receives only from Google and waits for both the animation and real synchronization before unlocking',async()=>{
  let releaseAnimation,releaseReceive;
  const receive=new Promise(resolve=>releaseReceive=resolve);
  const {context,nodes}=ui({setTimeoutImpl:(fn,ms)=>{assert.equal(ms,1700);releaseAnimation=fn;}});
  const shell={inert:true};context.document.querySelectorAll=selector=>selector==='[data-opening-inert]'?[shell]:[];
  context.receiveWait=receive;
  vm.runInContext(`
    globalThis.actions=[];refresh=async()=>{S.google={connected:true,configured:true,paused:false};};
    render=async()=>actions.push('render');runGoogleSync=async direction=>{actions.push(direction);syncOverlay({state:'syncing',operation:{stage:'Recibiendo los agendas…'}});await receiveWait;};
    toast=()=>{};globalThis.opening=openApplication();
  `,context);
  await Promise.resolve();assert.deepEqual(Array.from(context.actions),['pull']);assert.equal(shell.inert,true);
  assert.match(nodes['#startup-message'].textContent,/Recibiendo/);assert.equal(nodes['#google-progress'],undefined);
  releaseAnimation();await Promise.resolve();assert.equal(shell.inert,true,'finishing the animation must not unlock a running receipt');
  releaseReceive();await context.opening;assert.equal(shell.inert,false);assert.equal(nodes['#startup-screen'].hidden,true);assert.deepEqual(Array.from(context.actions),['pull','render']);
});

test('opening without Google or after restoring never starts an exchange, and an offline receipt still unlocks local data',async t=>{
  for(const kind of ['unconfigured','paused','offline'])await t.test(kind,async()=>{
    const {context,nodes}=ui();context.kind=kind;
    vm.runInContext(`
      globalThis.actions=[];globalThis.warnings=[];
      refresh=async()=>{S.google={configured:kind!=='unconfigured',connected:kind!=='unconfigured',paused:kind==='paused'};};
      render=async()=>actions.push('render');runGoogleSync=async direction=>{actions.push(direction);throw Error('Sin Internet');};
      calendarConnectionWarning=message=>warnings.push(message);toast=()=>{};globalThis.opening=openApplication();
    `,context);
    await context.opening;assert.equal(nodes['#startup-screen'].hidden,true);assert.equal(context.actions.includes('push'),false);
    assert.deepEqual(Array.from(context.actions),kind==='offline'?['pull','render']:['render']);assert.equal(context.warnings.length,kind==='offline'?1:0);
  });
});

test('calendar sync buttons and the collapsed agenda selector belong to the toolbar rather than above the summaries',()=>{
  const {context}=ui();vm.runInContext(`
    Object.assign(S,{today:'2026-10-30',week:'2026-10-26',google:{connected:true,calendars:[],sourceIds:null}});
    globalThis.html=renderCalendar([],{current:{count:0,hours:0,total:0}},[]);
  `,context);
  const html=context.html,toolbar=html.indexOf('calendar-toolbar'),receive=html.indexOf('data-action="google-pull"'),view=html.indexOf('class="view-toggle"');
  assert.ok(toolbar<receive&&receive<view);assert.match(html,/class="btn google-receive/);assert.match(html,/class="btn google-send/);
  assert.match(html,/<details class="calendar-agendas" id="calendar-agendas">/);assert.doesNotMatch(html,/<details[^>]*\sopen[\s>]/);
  assert.ok(html.indexOf('calendar-visibility')>toolbar);
});
