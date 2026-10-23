import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { startApp, appVersion, buildId } from '../app/server.mjs';

const identity=dir=>createHash('sha256').update(path.resolve(dir).toLowerCase()).digest('hex').slice(0,20);
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});

test('opening an updated app gracefully closes an old instance and preserves its students',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-upgrade-'));
  const old=await startApp({dataDir:dir,port:0});let next;
  t.after(async()=>{await old.close();await next?.close();await rm(dir,{recursive:true,force:true});});
  const student=old.store.saveStudent({firstName:'Conservar',color:'#bc587a'});
  const requests=[];
  const fetchImpl=async(url,options={})=>{
    requests.push(url);
    if(url.endsWith('/api/health'))return json({app:'amapola',instance:identity(dir),version:'0.1.0'});
    if(url===old.url)return new Response('old index',{headers:{'Set-Cookie':'amapola_local=test-only; Path=/; HttpOnly'}});
    assert.equal(options.headers.Cookie,'amapola_local=test-only');
    if(url.endsWith('/api/bootstrap'))return json({csrf:'upgrade-test-token'});
    if(url.endsWith('/api/shutdown')){
      assert.equal(options.method,'POST');assert.equal(options.headers.Origin,old.url);assert.equal(options.headers['X-Amapola-Token'],'upgrade-test-token');
      await old.close();return json({ok:true});
    }
    throw new Error('unexpected request');
  };
  next=await startApp({dataDir:dir,port:0,fetchImpl});
  assert.equal(next.reused,false);assert.equal(next.store.get('students',student.id).firstName,'Conservar');
  assert.equal(requests.length,4);
});
test('the same version with a different server build is restarted, while the exact build is reused',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'amapola-same-build-')),app=await startApp({dataDir:dir,port:0});
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const reused=await startApp({dataDir:dir,port:0,fetchImpl:async()=>json({app:'amapola',instance:identity(dir),version:appVersion,build:buildId})});
  assert.equal(reused.reused,true);assert.equal(reused.url,app.url);
  const originalLock=await readFile(path.join(dir,'instance.json'),'utf8');
  await assert.rejects(startApp({dataDir:dir,port:0,fetchImpl:async url=>{
    if(url.endsWith('/api/health'))return json({app:'amapola',instance:identity(dir),version:appVersion,build:'previous-build'});
    return new Response('unavailable',{status:503});
  }}),/cerrar la versión anterior/);
  assert.equal(await readFile(path.join(dir,'instance.json'),'utf8'),originalLock);
  assert.equal(app.store.all('students').length,0);
});
test('an old server displays a useful startup error instead of an infinite loading screen',async()=>{
  const source=await readFile(new URL('../app/public/app.js',import.meta.url),'utf8');
  const startup=source.slice(0,source.indexOf('/* Amapola'));
  const children=[];
  const node=()=>({className:'',textContent:'',append(...items){children.push(...items);},addEventListener(){}});
  const document={getElementById:()=>({replaceChildren(){}}),createElement:node};
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const run=new AsyncFunction('fetch','document','location',startup);
  await assert.rejects(run(async()=>json({app:'amapola',version:'0.1.0'}),document,{}),/versión anterior/);
  assert.ok(children.some(child=>child.textContent==='No se pudo iniciar Amapola'));
  assert.ok(children.some(child=>child.textContent.includes('Abre de nuevo Amapola.exe')));
});
