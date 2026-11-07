import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { Store, defaults, todayIn, addDays, weekday } from '../app/domain.mjs';
import { GoogleSync } from '../app/google-sync.mjs';
import { googleWindow } from '../app/google-data.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const copy=value=>structuredClone(value);
function remote(){
  const calendars=[{id:'personal',summary:'Personal',primary:true,accessRole:'owner'},{id:'work',summary:'Trabajo',accessRole:'reader'},{id:'target',summary:'Amapola',accessRole:'owner'}];
  const events=new Map(calendars.map(c=>[c.id,new Map()]));let sequence=0;
  const api={calendars,events,requests:[],fail:null,lostInsert:false,conflictPatch:false};
  api.set=(calendar,event)=>{const value={...copy(event),etag:'"'+(++sequence)+'"'};events.get(calendar).set(value.id,value);return value;};
  api.fetch=async(url,options={})=>{
    const parsed=new URL(url),route=decodeURIComponent(parsed.pathname.replace('/calendar/v3','')),method=options.method||'GET',body=options.body&&options.headers?.['Content-Type']==='application/json'?JSON.parse(options.body):null;
    api.requests.push({route,method,body,etag:options.headers?.['If-Match'],query:Object.fromEntries(parsed.searchParams)});
    if(api.fail?.(route,method))throw Error('network unavailable');
    if(parsed.hostname==='oauth2.googleapis.com')return json({access_token:'access-for-tests',refresh_token:'refresh-for-tests',expires_in:3600});
    if(route==='/users/me/calendarList')return json({items:copy(calendars)});
    const match=route.match(/^\/calendars\/([^/]+)\/events(?:\/(.+))?$/);assert.ok(match,route);
    const [,calendar,id]=match,list=events.get(calendar);assert.ok(list,calendar);
    if(method!=='GET')assert.equal(calendar,'target','Only the Amapola agenda may be changed');
    if(!id&&method==='GET'){
      const min=parsed.searchParams.get('timeMin'),max=parsed.searchParams.get('timeMax');
      return json({items:[...list.values()].filter(e=>{const start=e.start?.dateTime||(e.start?.date?e.start.date+'T00:00:00.000Z':null),end=e.end?.dateTime||(e.end?.date?e.end.date+'T00:00:00.000Z':null);return !start||(!min||end>min)&&(!max||start<max);}).map(copy)});
    }
    if(!id&&method==='POST'){
      if(list.has(body.id))return json({},409);
      const saved=api.set(calendar,body);
      if(api.lostInsert){api.lostInsert=false;throw Error('response lost after commit');}
      return json(saved);
    }
    const old=list.get(id);if(!old)return json({},404);
    if(method==='GET')return json(copy(old));
    if(options.headers['If-Match']!==old.etag)return json({},412);
    if(method==='DELETE'){list.delete(id);return new Response(null,{status:204});}
    if(api.conflictPatch){api.conflictPatch=false;api.set(calendar,{...old,summary:'Cambio simultáneo',start:{dateTime:old.start.dateTime.replace('10:00','14:00')},end:{dateTime:old.end.dateTime.replace('11:00','15:00')}});return json({},412);}
    return json(api.set(calendar,{...old,...body,id}));
  };
  return api;
}
async function fixture(t){
  const testRoot=path.resolve('.local'),dir=await mkdtemp(path.join(testRoot,'amapola-google-')),store=new Store(':memory:'),api=remote();
  store.saveSettings({...defaults,timezone:'UTC'});
  const sync=new GoogleSync(store,dir,{fetchImpl:api.fetch});
  sync.config={namespace:'12345678-1234-1234-1234-123456789abc',account:'personal',calendarId:'target',sourceIds:null,paused:false,lastSync:''};sync.saveConfig();
  sync.secrets={clientId:'example.apps.googleusercontent.com',clientSecret:'test-only',accessToken:'access-for-tests',refreshToken:'refresh-for-tests',expires:Date.now()+3600000};
  t.after(async()=>{await sync.close();store.close();assert.ok(dir.startsWith(testRoot+path.sep));await rm(dir,{recursive:true,force:true});});
  const date=addDays(todayIn('UTC'),1),student=store.saveStudent({firstName:'Ana',color:'#bc587a'});
  const addClass=()=>{const rule=store.saveSchedule({studentId:student.id,title:'Español',time:'10:00',duration:60,price:2500000,startDate:date,weekday:weekday(date),recurrence:'once'});return store.projected(rule,date);};
  return {dir,store,api,sync,date,student,addClass};
}
const event=(id,date,extra={})=>({id,summary:'Evento Google',status:'confirmed',start:{dateTime:date+'T10:00:00.000Z'},end:{dateTime:date+'T11:00:00.000Z'},...extra});

test('the rolling month includes today and day 29, excludes history and day 30, and follows the workspace timezone',async t=>{
  const {store,api,sync,student}=await fixture(t),today=todayIn('UTC');
  for(const offset of [-1,0,29,30]){
    const date=addDays(today,offset);store.saveSchedule({studentId:student.id,title:'Clase '+offset,startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:0,recurrence:'once'});
    api.set('personal',event('event-'+offset,date));
  }
  await sync.run();assert.equal(api.events.get('target').size,2);
  assert.deepEqual(store.busyBlocks(addDays(today,-1),addDays(today,30)).map(r=>r.date),[today,addDays(today,29)]);
  const query=api.requests.find(r=>r.route==='/calendars/target/events'&&r.method==='GET').query;
  assert.equal(query.timeMin,today+'T00:00:00.000Z');assert.equal(query.timeMax,addDays(today,30)+'T00:00:00.000Z');
  assert.deepEqual(googleWindow('America/Bogota',new Date('2026-10-30T02:00:00Z')),{from:'2026-10-29',to:'2026-11-27',end:'2026-11-28'});
});
test('manual receive imports Google without any outgoing event writes and leaves local changes pending',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);addClass();api.set('personal',event('phone',date));
  await sync.run('pull');assert.equal(store.busyBlocks(date,date).length,1);assert.equal(api.events.get('target').size,0);
  assert.ok(api.requests.every(request=>request.method==='GET'));assert.equal(sync.status().state,'pending');assert.ok(sync.status().lastPull);assert.equal(sync.status().lastSync,'');assert.equal(sync.status().lastPush,'');
  api.requests=[];await sync.run('push');assert.equal(api.events.get('target').size,1);assert.ok(sync.status().lastPush);
  assert.ok(api.requests.findIndex(r=>r.method==='POST')>api.requests.findIndex(r=>r.route==='/calendars/work/events'&&r.method==='GET'));
});
test('manual receive on first connection does not create an agenda and reports receipt separately from full synchronization',async t=>{
  const {api,sync,date}=await fixture(t);sync.config.calendarId='';api.set('personal',event('phone',date));
  await sync.run('pull');assert.ok(api.requests.every(request=>request.method==='GET'));assert.equal(sync.status().state,'received');assert.equal(sync.config.calendarId,'');
});
test('a linked event moved outside the month is aligned once, then preserved without continued out-of-window polling',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();await sync.run();
  store.saveSession({...row,date:addDays(date,90),status:'planned'},row.id);await sync.run('push');
  const saved=[...api.events.get('target').values()][0];assert.ok(saved.start.dateTime.startsWith(addDays(date,90)));
  api.requests=[];await sync.run();assert.equal(api.events.get('target').size,1);assert.ok(api.requests.every(r=>r.method==='GET'&&!/\/events\//.test(r.route)));
});

test('Google is imported first, every readable calendar becomes striped busy, and writes stay in Amapola',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);const row=addClass();
  api.set('personal',event('personal-event',date,{summary:'Cita personal'}));api.set('work',event('work-event',date,{summary:'Reunión'}));
  await sync.run();assert.equal(sync.status().state,'synced');
  const blocks=store.busyBlocks(date,date);assert.equal(blocks.length,2);assert.ok(blocks.every(b=>b.readOnly&&b.source==='google'));
  const firstWrite=api.requests.findIndex(r=>r.method==='POST');assert.ok(firstWrite>api.requests.findIndex(r=>r.route==='/calendars/work/events'&&r.method==='GET'));
  assert.equal(api.events.get('target').size,1);const saved=[...api.events.get('target').values()][0];assert.equal(saved.extendedProperties.private.amapolaClass,row.id);
  assert.match(saved.description,/Tarifa: 25000.00 COP/);
  assert.equal(store.conflicts({kind:'schedule',value:{studentId:row.studentId,title:'Otra clase',time:'10:15',duration:30,price:0,startDate:date,weekday:weekday(date),recurrence:'once'}}).total,3);
  await sync.selectCalendars(['target']);await sync.run();assert.equal(store.busyBlocks(date,date).length,0);
});
test('phone edits override calendar fields while local money is preserved and sent back as information',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);const row=addClass();store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);
  await sync.run();const saved=[...api.events.get('target').values()][0];
  api.set('target',{...saved,summary:'Desde el móvil',description:'Amapola\nTarifa inventada: 999',start:{dateTime:date+'T13:15:00.000Z'},end:{dateTime:date+'T14:00:00.000Z'}});
  const local=store.resolveSession(row.id);store.saveSession({...local,price:3000000,status:'confirmed'},local.id);
  await sync.run();const result=store.resolveSession(row.id);
  assert.equal(result.time,'13:15');assert.equal(result.duration,45);assert.equal(result.title,'Desde el móvil');assert.equal(result.price,3000000);assert.equal(result.paymentStatus,'paid');assert.equal(result.paymentMethod,'cash');
  assert.match(api.events.get('target').get(saved.id).description,/Tarifa: 30000.00 COP/);
});
test('a confirmed Google deletion cancels, preserves payment and history, and never recreates the event automatically',async t=>{
  const {store,api,sync,addClass}=await fixture(t);const row=addClass();store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);await sync.run();
  const id=[...api.events.get('target').keys()][0];api.events.get('target').delete(id);await sync.run();
  const local=store.resolveSession(row.id);assert.equal(local.status,'cancelled');assert.equal(local.isDeleted,0);assert.equal(local.paymentStatus,'paid');
  await sync.run();assert.equal(api.events.get('target').size,0);
  store.saveSessionStatus({status:'confirmed'},local.id);await sync.run();assert.equal(api.events.get('target').size,1);
});
test('local deletion is queued offline, then deletes the linked Google event only after an import',async t=>{
  const {store,api,sync,addClass}=await fixture(t);const row=addClass();await sync.run();store.deleteSession(row.id);
  api.fail=()=>true;await sync.run();assert.equal(sync.status().state,'offline');assert.equal(api.events.get('target').size,1);
  api.fail=null;api.requests=[];await sync.run();assert.equal(api.events.get('target').size,0);
  assert.ok(api.requests.findIndex(r=>r.method==='DELETE')>api.requests.findIndex(r=>r.method==='GET'&&r.route==='/calendars/target/events'));
});
test('a lost creation response and a first offline attempt do not duplicate or cancel an unsynchronized class',async t=>{
  const {store,api,sync,addClass}=await fixture(t);const row=addClass();api.fail=(route,method)=>method==='POST';
  await sync.run();assert.equal(store.resolveSession(row.id).status,'planned');
  api.fail=null;api.lostInsert=true;await sync.run();assert.equal(api.events.get('target').size,1);
  await sync.run();assert.equal(api.events.get('target').size,1);assert.equal(store.resolveSession(row.id).status,'planned');
});
test('out-of-window events, network errors and incomplete pagination are never inferred as deletions',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);const row=addClass();await sync.run();const saved=[...api.events.get('target').values()][0];
  const future=addDays(date,400);api.set('target',{...saved,start:{dateTime:future+'T10:00:00.000Z'},end:{dateTime:future+'T11:00:00.000Z'}});
  await sync.run();assert.equal(store.resolveSession(row.id).date,future);assert.equal(store.resolveSession(row.id).status,'planned');
  const fetch=sync.fetch;sync.fetch=async(url,options)=>url.includes('/events?')?json({items:[],nextPageToken:'next'}):fetch(url,options);
  await sync.run();assert.equal(sync.status().state,'error');assert.equal(store.resolveSession(row.id).status,'planned');
});
test('Amapola descriptions create visible unassigned one-off lessons and all-day/multiday busy slots retain exact times',async t=>{
  const {store,api,sync,date,student}=await fixture(t);
  api.set('target',event('new-phone',date,{summary:'Cours téléphone',description:'Amapola\nNouveau cours'}));
  api.set('personal',{id:'all-day',summary:'Voyage',start:{date},end:{date:addDays(date,2)}});
  api.set('work',event('late',date,{start:{dateTime:date+'T23:17:00.000Z'},end:{dateTime:addDays(date,1)+'T00:07:00.000Z'}}));
  await sync.run();assert.equal(sync.status().inbox.length,1);assert.equal(store.classLedger({period:'future'}).total,0);
  const blocks=store.busyBlocks(date,addDays(date,1));assert.equal(blocks.filter(b=>b.allDay).length,2);assert.ok(blocks.some(b=>b.time==='23:17'&&b.duration===43));assert.ok(blocks.some(b=>b.time==='00:00'&&b.duration===7));
  const row=sync.complete(sync.status().inbox[0].id,{studentId:student.id,title:'Español',date,time:'10:15',duration:45,price:2000000,modality:'online'});
  assert.equal(row.scheduleId,null);await sync.run();assert.equal(sync.status().inbox.length,0);assert.equal(api.events.get('target').size,1);assert.ok(!store.busyBlocks(date,date).some(b=>b.needsAssignment));
  assert.equal(api.events.get('target').get('new-phone').extendedProperties.private.amapolaClass,row.id);
});
test('concurrent Google edits prevent a local deletion until the user explicitly chooses a version',async t=>{
  const {store,api,sync,addClass}=await fixture(t);const row=addClass();await sync.run();const saved=[...api.events.get('target').values()][0];
  store.deleteSession(row.id);api.set('target',{...saved,summary:'Modifié sur téléphone'});await sync.run();
  assert.equal(api.events.get('target').size,1);assert.equal(sync.status().state,'review');
  sync.resolve(sync.status().reviews[0].key,'google');await sync.run();assert.equal(store.resolveSession(row.id).isDeleted,0);
  store.deleteSession(row.id);api.set('target',{...api.events.get('target').get(saved.id),summary:'Encore modifié'});await sync.run();
  sync.resolve(sync.status().reviews[0].key,'amapola');await sync.run();assert.equal(api.events.get('target').size,0);
});
test('optimistic version conflicts trigger another import and keep locally changed payment data',async t=>{
  const {store,api,sync,addClass}=await fixture(t);const row=addClass();await sync.run();store.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},row.id);api.conflictPatch=true;
  await sync.run();assert.equal(sync.status().state,'pending');await sync.run();
  assert.equal(store.resolveSession(row.id).time,'14:00');assert.equal(store.resolveSession(row.id).paymentStatus,'paid');assert.match([...api.events.get('target').values()][0].description,/Pagada/);
});
test('sync links and pending imports survive backup/restore while authorization stays outside and sync is paused',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);addClass();api.set('personal',event('pending',date,{description:'Amapola'}));await sync.run();
  const archive=store.exportData();assert.equal(archive.version,6);assert.ok(archive.google_sync.some(r=>r.id.startsWith('link-')));assert.doesNotMatch(JSON.stringify(archive),/refresh-for-tests|clientSecret|access-for-tests/);
  const clean=new Store(':memory:');t.after(()=>clean.close());clean.importData(archive);assert.equal(JSON.parse(clean.all('google_sync').find(r=>r.id==='config').json).paused,true);assert.equal(clean.busyBlocks(date,date).length,1);
  clean.importData({...archive,version:5});assert.equal(clean.all('google_sync').length,0);
});
test('OAuth uses one-use state and PKCE, and credentials never appear in status or data backups',async t=>{
  const {dir,store,sync}=await fixture(t);await sync.configure({installed:{client_id:'example.apps.googleusercontent.com',client_secret:'test-only'}});
  const auth=await sync.authorize('http://127.0.0.1:3847'),url=new URL(auth.url);assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(url.searchParams.get('code_challenge'));assert.equal(url.searchParams.get('redirect_uri'),'http://127.0.0.1:3847/oauth/google/callback');
  await assert.rejects(sync.callback(new URLSearchParams({state:'wrong',code:'test-code'})),/caducó|válida/);
  await assert.rejects(sync.callback(new URLSearchParams({state:url.searchParams.get('state'),code:'test-code'})),/caducó|válida/);
  assert.doesNotMatch(JSON.stringify(sync.status()),/test-only|refresh-for-tests/);assert.doesNotMatch(JSON.stringify(store.exportData()),/test-only|refresh-for-tests/);
  if(process.platform==='win32')assert.doesNotMatch(await readFile(path.join(dir,'google-connection.json'),'utf8'),/test-only|refresh-for-tests/);
});
test('OAuth callback exchanges the verifier, reloads the protected connection and refuses replay',async t=>{
  const {dir,store,sync,api}=await fixture(t);await sync.configure({installed:{client_id:'example.apps.googleusercontent.com',client_secret:'test-only'}});
  sync.config.paused=true;sync.saveConfig();
  const authorization=await sync.authorize('http://127.0.0.1:3847'),url=new URL(authorization.url),verifier=sync.authorization.verifier;
  let tokenBody;const fetch=sync.fetch;sync.fetch=async(url,options)=>{if(url==='https://oauth2.googleapis.com/token')tokenBody=new URLSearchParams(options.body);return fetch(url,options);};
  const params=new URLSearchParams({state:url.searchParams.get('state'),code:'temporary-code'});
  await sync.callback(params);clearTimeout(sync.timer);
  assert.equal(sync.status().state,'paused');
  assert.equal(tokenBody.get('code_verifier'),verifier);assert.equal(tokenBody.get('grant_type'),'authorization_code');
  await assert.rejects(sync.callback(params),/caducó|válida/);
  const reload=new GoogleSync(store,dir,{fetchImpl:api.fetch});await reload.init();t.after(()=>reload.close());
  assert.equal(reload.status().connected,true);assert.equal(reload.secrets.refreshToken,'refresh-for-tests');
});
test('concurrent API reads share a token refresh and persist one protected connection',async t=>{
  const {sync}=await fixture(t);sync.secrets.expires=0;let refreshes=0;const fetch=sync.fetch;
  sync.fetch=async(url,options)=>{if(url==='https://oauth2.googleapis.com/token')refreshes++;return fetch(url,options);};
  await Promise.all([sync.calendars(),sync.calendars()]);assert.equal(refreshes,1);
});
test('a v5 database upgrades to v6 with a readable safety copy and unchanged payments',async t=>{
  const {dir}=await fixture(t),file=path.join(dir,'old.sqlite'),old=new Store(file);
  const student=old.saveStudent({firstName:'Conservar',color:'#bc587a'}),date=addDays(todayIn('UTC'),1);
  const rule=old.saveSchedule({studentId:student.id,title:'Clase',time:'10:00',duration:60,price:50000,startDate:date,weekday:weekday(date),recurrence:'once'});
  old.savePayment({paymentStatus:'paid',paymentMethod:'cash'},old.projected(rule,date).id);old.db.exec('DROP TABLE google_sync; PRAGMA user_version=5;');old.close();
  const next=new Store(file);try {
    assert.equal(next.db.prepare('PRAGMA user_version').get().user_version,6);assert.equal(next.all('sessions')[0].paymentStatus,'paid');
    const copies=await readdir(path.join(dir,'copias')),raw=JSON.parse(gunzipSync(await readFile(path.join(dir,'copias',copies[0]))));assert.equal(raw.version,5);assert.equal(raw.sessions[0].paymentMethod,'cash');
  } finally {next.close();}
});
