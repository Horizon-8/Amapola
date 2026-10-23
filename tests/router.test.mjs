import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { startApp } from '../app/server.mjs';
import { todayIn, defaults, addDays, weekday } from '../app/domain.mjs';

// Exercise the actual request handler and SQLite data without requiring the
// test host to permit outbound loopback sockets. Socket coverage stays in
// server.test.mjs and is not replaced by this transport.
function transport(app) {
  const handler=app.server.listeners('request')[0];
  return async (route,{method='GET',headers={},data,bytes}={})=>{
    const req=Readable.from(bytes ? [bytes] : data===undefined ? [] : [Buffer.from(JSON.stringify(data))]);
    req.method=method;req.url=route;
    req.headers={host:new URL(app.url).host,...Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]))};
    let code=200,body=Buffer.alloc(0);const output={};
    const res={headersSent:false,setHeader(key,value){output[key.toLowerCase()]=value;},writeHead(status,values){code=status;Object.entries(values||{}).forEach(([key,value])=>this.setHeader(key,value));this.headersSent=true;},end(value){body=Buffer.from(value||'');}};
    await handler(req,res);
    return {code,headers:output,bytes:body,json:()=>JSON.parse(body.toString()),text:()=>body.toString()};
  };
}
test('HTTP status and single-session deletion preserve payment, require confirmation and create a restorable safety copy',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-session-actions-')),app=await startApp({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const request=transport(app),index=await request('/'),cookie=index.headers['set-cookie'].split(';')[0];
  const boot=(await request('/api/bootstrap',{headers:{Cookie:cookie}})).json(),headers={Cookie:cookie,Origin:app.url,'Content-Type':'application/json','X-Amapola-Token':boot.csrf};
  const student=app.store.saveStudent({firstName:'Ana',color:'#bc587a'}),date=addDays(todayIn(defaults.timezone),3);
  const rule=app.store.saveSchedule({studentId:student.id,title:'Clase',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:50000});
  const row=app.store.projected(rule,date),url=`/api/sessions/${encodeURIComponent(row.id)}`;
  app.store.savePayment({paymentStatus:'paid',paymentMethod:'cash'},row.id);
  assert.equal((await request(`${url}/status`,{method:'PUT',data:{status:'confirmed'}})).code,401);
  const confirmed=await request(`${url}/status`,{method:'PUT',headers,data:{status:'confirmed',expectedStatus:'planned'}});
  assert.equal(confirmed.code,200);assert.equal(confirmed.json().paymentStatus,'paid');assert.equal(confirmed.json().paymentMethod,'cash');
  assert.equal((await request(`${url}/status`,{method:'PUT',headers,data:{status:'cancelled',expectedStatus:'planned'}})).code,409);
  assert.equal((await request(url,{method:'DELETE',headers,data:{}})).code,400);
  assert.equal(app.store.occurrences(date,date).length,1);
  assert.equal((await request(url,{method:'DELETE',headers,data:{confirm:true}})).code,200);
  assert.equal(app.store.occurrences(date,date).length,0);assert.equal(app.store.occurrences(addDays(date,7),addDays(date,7)).length,1);
  assert.equal((await request(`${url}/status`,{method:'PUT',headers,data:{status:'confirmed'}})).code,404);
  const files=(await request('/api/backups',{headers})).json().files,safety=files.find(f=>f.filename.includes('antes-de-eliminar'));assert.ok(safety);
  const bytes=(await request(`/api/backups/file/${safety.filename}`,{headers})).bytes,payload=JSON.parse(gunzipSync(bytes));
  assert.equal(payload.sessions[0].status,'confirmed');assert.equal(payload.sessions[0].isDeleted,0);assert.equal(payload.sessions[0].paymentMethod,'cash');
  const restored=await request('/api/restore',{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','X-Amapola-Confirm':'RESTAURAR'},bytes});
  assert.equal(restored.code,200);assert.equal(app.store.occurrences(date,date)[0].status,'confirmed');
});
test('HTTP follow-up and overlap previews preserve data and use normal session authentication',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-followup-routes-')),app=await startApp({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const request=transport(app),root=await request('/'),cookie=root.headers['set-cookie'].split(';')[0];
  const boot=(await request('/api/bootstrap',{headers:{Cookie:cookie}})).json();
  const headers={Cookie:cookie,Origin:app.url,'Content-Type':'application/json','X-Amapola-Token':boot.csrf};
  const created=await request('/api/students',{method:'POST',headers,data:{firstName:'Sofía',color:'#bc587a',stage:'prospect',messenger:'https://m.me/sofia'}});
  assert.equal(created.code,201);const prospect=created.json();assert.equal(prospect.stage,'prospect');assert.equal(prospect.active,0);
  const date=addDays(todayIn(defaults.timezone),2);
  const data={kind:'busy',value:{date,time:'14:00',duration:30}};
  app.store.saveBusyBlock({date,time:'14:00',duration:60,title:'Dentista'});
  assert.equal((await request('/api/conflicts',{method:'POST',data})).code,401);
  assert.equal((await request('/api/conflicts',{method:'POST',headers:{...headers,Origin:'https://wrong.example'},data})).code,403);
  const preview=await request('/api/conflicts',{method:'POST',headers,data});assert.equal(preview.code,200);
  assert.equal(preview.json().conflicts[0].title,'Dentista');assert.equal(app.store.all('busy_blocks').length,1);
  assert.equal(app.store.all('sessions').length,0);
  const converted=await request(`/api/students/${prospect.id}`,{method:'PUT',headers,data:{...prospect,stage:'student',active:true}});
  assert.equal(converted.code,200);assert.equal(converted.json().messenger,prospect.messenger);
  assert.equal(converted.json().stage,'student');assert.equal(converted.json().active,1);
  assert.equal((await request('/api/conflicts',{method:'POST',headers,data:{kind:'busy',value:{date,time:'14:03',duration:30}}})).code,400);
  assert.equal(app.store.all('busy_blocks').length,1);
});
test('HTTP handler connects class lists, payment changes, scoped calendar changes and backup restoration',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-routes-'));
  const app=await startApp({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const request=transport(app),index=await request('/');assert.equal(index.code,200);assert.match(index.text(),/type="module"/);
  for(const file of ['/app.js','/calendar-interactions.mjs','/class-utils.mjs']){
    const res=await request(file);assert.equal(res.code,200);assert.match(res.headers['content-type'],/javascript/);
  }
  assert.equal((await request('/api/classes')).code,401);
  const cookie=index.headers['set-cookie'].split(';')[0];
  const bootstrap=(await request('/api/bootstrap',{headers:{Cookie:cookie}})).json();
  const headers={Cookie:cookie,Origin:app.url,'Content-Type':'application/json','X-Amapola-Token':bootstrap.csrf};
  const mutate=(route,data,extra={})=>request(route,{method:'PUT',headers:{...headers,...extra},data});
  const created=await request('/api/students',{method:'POST',headers,data:{firstName:'Prueba',color:'#bc587a'}});assert.equal(created.code,201);
  const student=created.json(),date=addDays(todayIn(defaults.timezone),3);
  const planned=await request('/api/schedules',{method:'POST',headers,data:{studentId:student.id,title:'Clase',startDate:date,weekday:weekday(date),time:'10:00',duration:60,price:50000}});assert.equal(planned.code,201);
  const rule=planned.json();
  const row=(await request(`/api/occurrences?from=${date}&to=${date}`,{headers})).json()[0];
  assert.equal(row.paymentState,'pending');
  const url=`/api/sessions/${encodeURIComponent(row.id)}`;
  assert.equal((await mutate(`${url}/payment`,{paymentStatus:'paid',paymentMethod:'cash'},{Origin:'https://wrong.example'})).code,403);
  assert.equal(app.store.all('sessions').length,0);
  assert.equal((await mutate(`${url}/payment`,{paymentStatus:'paid',paymentMethod:'cash'})).code,200);
  const ledger=(await request('/api/classes?period=future&payment=paid&method=cash',{headers})).json();
  assert.equal(ledger.total,1);assert.equal(ledger.rows[0].paymentState,'paid');
  let change=await mutate(`${url}/change`,{...row,date:addDays(date,1),time:'11:15',duration:45,paymentStatus:'paid',paymentMethod:'cash',scope:'session'});assert.equal(change.code,200);
  assert.equal(app.store.get('schedules',rule.id).time,'10:00');
  const moved=change.json();assert.equal(moved.paymentMethod,'cash');
  change=await mutate(`/api/sessions/${moved.id}/change`,{...moved,time:'12:00',duration:90,scope:'following'});assert.equal(change.code,200);
  const next=change.json();assert.ok(next.newScheduleId);assert.equal(next.paymentStatus,'paid');
  const invalid=await mutate(`/api/sessions/${next.id}/change`,{...next,time:'12:03',scope:'session'});assert.equal(invalid.code,400);
  const local=await request('/api/backups/local',{method:'POST',headers,data:{}});assert.equal(local.code,200);
  const downloaded=await request(`/api/backups/file/${local.json().filename}`,{headers});assert.equal(downloaded.code,200,downloaded.text());
  const archive=downloaded.bytes;
  const payload=JSON.parse(gunzipSync(archive));assert.equal(payload.version,5);assert.equal(payload.sessions[0].paymentMethod,'cash');
  await mutate(`/api/sessions/${next.id}/payment`,{paymentStatus:'unpaid',paymentMethod:''});
  const restored=await request('/api/restore',{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','X-Amapola-Confirm':'RESTAURAR'},bytes:archive});assert.equal(restored.code,200);
  assert.equal(app.store.get('sessions',next.id).paymentStatus,'paid');
  assert.equal((await request('/api/classes?period=past',{headers})).json().total,0);
});

test('HTTP busy-block workflow includes authentication, edits, safe deletion and restoration',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-busy-routes-')),app=await startApp({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const request=transport(app),root=await request('/'),cookie=root.headers['set-cookie'].split(';')[0];
  const boot=(await request('/api/bootstrap',{headers:{Cookie:cookie}})).json();
  const headers={Cookie:cookie,Origin:app.url,'Content-Type':'application/json','X-Amapola-Token':boot.csrf};
  const date=addDays(todayIn(defaults.timezone),1),data={date,time:'12:00',duration:60,title:'Almuerzo'};
  assert.equal((await request('/api/busy-blocks',{method:'POST',data})).code,401);
  const created=await request('/api/busy-blocks',{method:'POST',headers,data});assert.equal(created.code,201);const block=created.json();
  const url=`/api/busy-blocks/${block.id}`,list=`/api/busy-blocks?from=${date}&to=${date}`;
  assert.equal((await request(list,{headers})).json()[0].kind,'busy');
  assert.equal((await request(url,{method:'PUT',headers,data:{...block,time:'12:15',duration:45}})).code,200);
  assert.equal((await request(url,{method:'DELETE',headers,data:{}})).code,400);
  assert.equal((await request(url,{method:'DELETE',headers,data:{confirm:true}})).code,200);
  assert.equal((await request(list,{headers})).json().length,0);
  const backups=(await request('/api/backups',{headers})).json().files;
  const saved=backups.find(b=>b.filename.includes('antes-de-eliminar'));assert.ok(saved);
  const bytes=(await request(`/api/backups/file/${saved.filename}`,{headers})).bytes;
  const preview=await request('/api/restore/preview',{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},bytes});assert.equal(preview.json().busyBlocks,1);
  const restore=await request('/api/restore',{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','X-Amapola-Confirm':'RESTAURAR'},bytes});assert.equal(restore.code,200);
  assert.equal((await request(list,{headers})).json()[0].time,'12:15');
  assert.equal((await request('/api/classes?period=all',{headers})).json().total,0);
});
