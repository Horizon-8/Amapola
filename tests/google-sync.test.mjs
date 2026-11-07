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
    if(options.headers['If-Match']&&options.headers['If-Match']!==old.etag)return json({},412);
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

test('the rolling month uses 30 local dates and sending never imports other agendas',async t=>{
  const {store,api,sync,student}=await fixture(t),today=todayIn('UTC');
  for(const offset of [-1,0,29,30]){const date=addDays(today,offset);store.saveSchedule({studentId:student.id,title:'Clase '+offset,startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:0,recurrence:'once'});api.set('personal',event('event-'+offset,date));}
  await sync.run('push');assert.equal(api.events.get('target').size,2);assert.ok(!api.requests.some(r=>r.method==='GET'&&r.route.includes('/events')));
  await sync.run('pull');assert.deepEqual(store.busyBlocks(addDays(today,-1),addDays(today,30)).map(r=>r.date),[today,addDays(today,29)]);
  const query=api.requests.find(r=>r.route==='/calendars/target/events'&&r.method==='GET').query;
  assert.equal(query.timeMin,today+'T00:00:00.000Z');assert.equal(query.timeMax,addDays(today,30)+'T00:00:00.000Z');
  assert.deepEqual(googleWindow('America/Bogota',new Date('2026-10-30T02:00:00Z')),{from:'2026-10-29',to:'2026-11-27',end:'2026-11-28'});
});
test('receive is read-only in Google and preserves never-sent local classes',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();api.set('personal',event('phone',date));
  await sync.run('pull');assert.equal(store.busyBlocks(date,date).length,1);assert.equal(api.events.get('target').size,0);assert.equal(store.resolveSession(row.id).title,row.title);
  assert.ok(api.requests.every(r=>r.method==='GET'));assert.equal(sync.status().state,'pending');assert.ok(sync.status().lastPull);assert.equal(sync.status().lastPush,'');
  api.requests=[];await sync.run('push');assert.equal(api.events.get('target').size,1);assert.ok(!api.requests.some(r=>r.method==='GET'&&r.route.includes('/events')));
});
test('first receipt does not create an agenda or claim that an upload finished',async t=>{
  const {api,sync,date}=await fixture(t);sync.config.calendarId='';api.set('personal',event('phone',date));await sync.run();
  assert.ok(api.requests.every(r=>r.method==='GET'));assert.equal(sync.status().state,'received');assert.equal(sync.config.calendarId,'');assert.equal(sync.status().lastPush,'');
});
test('receive replaces unsent local changes even when the Google version did not change',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();await sync.run('push');
  store.saveSession({...row,title:'Solo PC',time:'16:00',price:3000000,status:'confirmed'},row.id);store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);
  api.requests=[];await sync.run('pull');const saved=store.resolveSession(row.id);
  assert.equal(saved.time,'10:00');assert.equal(saved.title,'Español');assert.equal(saved.price,3000000);assert.equal(saved.paymentStatus,'paid');assert.ok(api.requests.every(r=>r.method==='GET'));
  const archive=store.exportData();const clean=new Store(':memory:');try{clean.importData(archive);assert.equal(clean.all('sessions')[0].paymentMethod,'cash');}finally{clean.close();}
});
test('receive restores a locally deleted linked class without confirmation and keeps its payment',async t=>{
  const {store,sync,addClass}=await fixture(t),row=addClass();store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);await sync.run('push');store.deleteSession(row.id);
  await sync.run('pull');const restored=store.resolveSession(row.id);assert.equal(restored.isDeleted,0);assert.equal(restored.status,'planned');assert.equal(restored.paymentStatus,'paid');
});
test('a Google deletion cancels a virtual class with an archive-safe UUID, and only an explicit upload recreates it',async t=>{
  const {store,api,sync,addClass}=await fixture(t),row=addClass();await sync.run('push');api.events.get('target').clear();await sync.run('pull');
  const cancelled=store.resolveSession(row.id);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.isDeleted,0);assert.match(cancelled.id,/^[a-f0-9-]+$/);
  const clean=new Store(':memory:');try{clean.importData(store.exportData());}finally{clean.close();}
  assert.equal(api.events.get('target').size,0);await sync.run('push');assert.equal(api.events.get('target').size,1);assert.match([...api.events.get('target').values()][0].summary,/Cancelada/);
});
test('upload applies Amapola despite concurrent phone edits and never imports a Google schedule',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();await sync.run('push');const remote=[...api.events.get('target').values()][0];
  api.set('target',{...remote,summary:'Teléfono',start:{dateTime:date+'T13:15:00.000Z'},end:{dateTime:date+'T14:00:00.000Z'}});
  store.savePayment({paymentStatus:'paid',paymentMethod:'transfer'},row.id);api.requests=[];await sync.run('push');
  assert.equal(store.resolveSession(row.id).time,'10:00');assert.equal(api.events.get('target').get(remote.id).summary,'Español');assert.match(api.events.get('target').get(remote.id).description,/Pagada/);
  assert.ok(!api.requests.some(r=>r.method==='GET'&&r.route.includes('/events')));assert.ok(api.requests.filter(r=>r.method==='PATCH').every(r=>r.etag===undefined));
});
test('upload deletes locally removed classes despite a remote edit, without asking or downloading events',async t=>{
  const {store,api,sync,addClass}=await fixture(t),row=addClass();await sync.run('push');const remote=[...api.events.get('target').values()][0];store.deleteSession(row.id);api.set('target',{...remote,summary:'Modifié'});
  api.requests=[];await sync.run('push');assert.equal(api.events.get('target').size,0);assert.ok(!api.requests.some(r=>r.method==='GET'&&r.route.includes('/events')));assert.equal(sync.status().reviews.length,0);
});
test('upload recreates a phone-deleted active class even when the local class is unchanged',async t=>{
  const {store,api,sync,addClass}=await fixture(t),row=addClass();await sync.run('push');api.events.get('target').clear();await sync.run('push');
  assert.equal(api.events.get('target').size,1);assert.equal(store.resolveSession(row.id).status,'planned');
});
test('upload restores a Google cancelled tombstone and never counts a cancelled API response as success',async t=>{
  const {api,sync,addClass}=await fixture(t);addClass();await sync.run('push');
  const original=[...api.events.get('target').values()][0];api.set('target',{...original,status:'cancelled'});
  await sync.run('push');assert.equal(api.events.get('target').get(original.id).status,'confirmed');
  let refuseOnce=true;const fetch=sync.fetch;sync.fetch=async(url,options)=>{
    if(refuseOnce&&options.method==='PATCH'){refuseOnce=false;return json({...original,status:'cancelled'});}
    return fetch(url,options);
  };
  await sync.run('push');assert.equal(sync.status().operation.ok,true);
  const linked=sync.records('link-')[0];assert.notEqual(linked.googleId,original.id);assert.equal(api.events.get('target').get(linked.googleId).status,'confirmed');
});

test('a moved linked event is aligned outside the month once and never deleted just for leaving the period',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();await sync.run('push');store.saveSession({...row,date:addDays(date,90),status:'planned'},row.id);await sync.run('push');
  assert.ok([...api.events.get('target').values()][0].start.dateTime.startsWith(addDays(date,90)));api.requests=[];await sync.run('pull');assert.equal(api.events.get('target').size,1);assert.ok(!api.requests.some(r=>/\/events\//.test(r.route)));
});
test('a lost creation response is idempotent, including deleting a creation whose response was lost',async t=>{
  const {store,api,sync,addClass}=await fixture(t),row=addClass();api.lostInsert=true;await sync.run('push');assert.equal(sync.status().state,'offline');assert.equal(api.events.get('target').size,1);
  await sync.run('push');assert.equal(api.events.get('target').size,1);store.deleteSession(row.id);await sync.run('push');assert.equal(api.events.get('target').size,0);
  const second=addClass();api.lostInsert=true;await sync.run('push');assert.equal(api.events.get('target').size,1);store.deleteSession(second.id);await sync.run('push');assert.equal(api.events.get('target').size,0);
});
test('failed or incomplete downloads never cancel a class or partially apply another calendar',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();await sync.run('push');api.set('personal',event('not-yet-imported',date));
  api.fail=route=>route==='/calendars/work/events';await sync.run('pull');assert.equal(sync.status().state,'offline');assert.equal(store.resolveSession(row.id).status,'planned');assert.equal(store.busyBlocks(date,date).length,0);
  api.fail=null;const fetch=sync.fetch;sync.fetch=async(url,options)=>url.includes('/events?')?json({items:[],nextPageToken:'next'}):fetch(url,options);await sync.run('pull');assert.equal(sync.status().state,'error');assert.equal(store.resolveSession(row.id).status,'planned');
});
test('new Google classes stay unassigned and one-off, including events without a prefix in the Amapola agenda',async t=>{
  const {store,api,sync,date,student}=await fixture(t);api.set('target',event('new-phone',date,{summary:'Cours téléphone'}));
  api.set('personal',{id:'all-day',summary:'Voyage',start:{date},end:{date:addDays(date,2)}});
  api.set('work',event('late',date,{start:{dateTime:date+'T23:17:00.000Z'},end:{dateTime:addDays(date,1)+'T00:07:00.000Z'}}));
  await sync.run('pull');assert.equal(sync.status().inbox.length,1);assert.equal(store.classLedger({period:'future'}).total,0);assert.equal(store.busyBlocks(date,addDays(date,1)).filter(b=>b.allDay).length,2);
  const row=sync.complete(sync.status().inbox[0].id,{studentId:student.id,title:'Español',date,time:'10:15',duration:45,price:2000000,modality:'online'});
  assert.equal(row.scheduleId,null);assert.equal(store.all('schedules').length,0);await sync.run('push');assert.equal(api.events.get('target').size,1);assert.equal(api.events.get('target').get('new-phone').extendedProperties.private.amapolaClass,row.id);
});
test('hidden calendars retain availability and backup preferences independently of selected calendars',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t),row=addClass();api.set('personal',event('busy',date));await sync.run('pull');
  api.requests=[];sync.setVisibility(['personal','$amapola']);assert.equal(api.requests.length,0);assert.equal(store.busyBlocks(date,date).length,1);
  assert.equal(store.conflicts({kind:'schedule',value:{studentId:row.studentId,title:'Conflict',time:'10:00',duration:60,price:0,startDate:date,weekday:weekday(date),recurrence:'once'}}).total,2);
  const clean=new Store(':memory:');try{clean.importData(store.exportData());assert.deepEqual(JSON.parse(clean.all('google_sync').find(r=>r.id==='config').json).hiddenCalendarIds,['personal','$amapola']);}finally{clean.close();}
});
test('local edits and calendar selection never start an automatic exchange',async t=>{
  const {api,sync,addClass}=await fixture(t);await sync.init();addClass();sync.touch();await sync.selectCalendars(['target']);api.requests=[];
  await new Promise(resolve=>setTimeout(resolve,1700));assert.equal(api.requests.length,0);assert.equal(sync.status().pending,true);
});
test('operation state stays busy through all writes and rejects business edits until complete',async t=>{
  const {api,sync,addClass}=await fixture(t);addClass();let release,entered;const waiting=new Promise(resolve=>entered=resolve),fetch=sync.fetch;
  sync.fetch=async(url,options)=>{if(options.method==='POST'&&url.endsWith('/events')){entered();await new Promise(resolve=>release=resolve);}return fetch(url,options);};
  const operation=sync.run('push');await waiting;assert.equal(sync.status().state,'syncing');assert.equal(sync.status().operation.ok,null);release();await operation;assert.equal(sync.status().operation.ok,true);assert.equal(sync.status().operation.done,sync.status().operation.total);
});
test('sync links and pending imports survive backup/restore while authorization stays outside and sync is paused',async t=>{
  const {store,api,sync,date,addClass}=await fixture(t);addClass();await sync.run('push');api.set('personal',event('pending',date,{description:'Amapola'}));await sync.run('pull');
  const archive=store.exportData();assert.equal(archive.version,7);assert.ok(archive.google_sync.some(r=>r.id.startsWith('link-')));assert.doesNotMatch(JSON.stringify(archive),/refresh-for-tests|clientSecret|access-for-tests/);
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
test('a v5 database upgrades to v7 with a readable safety copy and unchanged payments',async t=>{
  const {dir}=await fixture(t),file=path.join(dir,'old.sqlite'),old=new Store(file);
  const student=old.saveStudent({firstName:'Conservar',color:'#bc587a'}),date=addDays(todayIn('UTC'),1);
  const rule=old.saveSchedule({studentId:student.id,title:'Clase',time:'10:00',duration:60,price:50000,startDate:date,weekday:weekday(date),recurrence:'once'});
  old.savePayment({paymentStatus:'paid',paymentMethod:'cash'},old.projected(rule,date).id);old.db.exec('DROP TABLE google_sync; PRAGMA user_version=5;');old.close();
  const next=new Store(file);try {
    assert.equal(next.db.prepare('PRAGMA user_version').get().user_version,7);assert.equal(next.all('sessions')[0].paymentStatus,'paid');
    const copies=await readdir(path.join(dir,'copias')),raw=JSON.parse(gunzipSync(await readFile(path.join(dir,'copias',copies[0]))));assert.equal(raw.version,5);assert.equal(raw.sessions[0].paymentMethod,'cash');
  } finally {next.close();}
});
test('v6 migration preserves Google links in its pre-upgrade backup before enabling biweekly plans',async t=>{
  const {dir}=await fixture(t),file=path.join(dir,'v6.sqlite'),old=new Store(file);
  const student=old.saveStudent({firstName:'Migrar',color:'#bc587a'}),date=addDays(todayIn('UTC'),1),rule=old.saveSchedule({studentId:student.id,title:'Clase',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:25000,recurrence:'once'}),legacy=old.projected(rule,date);
  old.insert('sessions',legacy);old.insert('google_sync',{id:'link-'+'a'.repeat(64),json:JSON.stringify({key:legacy.id,sessionId:legacy.id,googleId:'google-event',etag:'known'})});
  old.insert('google_sync',{id:'config',json:JSON.stringify({namespace:'12345678-1234-1234-1234-123456789abc',account:'personal',calendarId:'target',sourceIds:null,lastPull:'2026-10-30T10:00:00Z'})});old.db.exec('PRAGMA user_version=6;');old.close();
  const current=new Store(file);try{
    assert.equal(current.db.prepare('PRAGMA user_version').get().user_version,7);assert.equal(JSON.parse(current.all('google_sync').find(r=>r.id==='config').json).calendarId,'target');
    const copies=await readdir(path.join(dir,'copias')),raw=JSON.parse(gunzipSync(await readFile(path.join(dir,'copias',copies[0]))));assert.equal(raw.version,6);assert.equal(JSON.parse(raw.google_sync.find(r=>r.id==='config').json).calendarId,'target');
    const corrected=current.all('sessions')[0];assert.doesNotMatch(corrected.id,/@/);assert.equal(JSON.parse(current.all('google_sync').find(r=>r.id.startsWith('link-')).json).sessionId,corrected.id);
    const clean=new Store(':memory:');try{clean.importData(raw);assert.equal(clean.all('sessions')[0].id,corrected.id);}finally{clean.close();}
  }finally{current.close();}
});
