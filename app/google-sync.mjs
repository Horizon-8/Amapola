import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { AppError, addDays, classInput, dateValue } from './domain.mjs';
import { simpleEvent, eventSegments, googleId, googleWindow } from './google-data.mjs';

const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const fields=['title','date','time','duration','price','modality','notes','status','paymentStatus','paymentMethod','studentId','isDeleted'];
const fingerprint=row=>row?hash(fields.map(key=>row[key]??null)):'deleted';
const infoHash=row=>row?hash(['price','modality','notes','status','paymentStatus','paymentMethod','studentId'].map(key=>row[key]??null)):'deleted';
const keyOf=row=>row.scheduleId?`${row.scheduleId}@${row.originalDate}`:row.id;
const linkId=key=>'link-'+hash(key);
const eventId=(calendar,id)=>'event-'+hash(calendar+'\n'+id);
const scoped=['https://www.googleapis.com/auth/calendar.app.created','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events.readonly'];

async function protect(text, decrypt=false) {
  if(process.platform!=='win32')return text;
  const expression=decrypt
    ? '[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($secretText),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))'
    : '[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($secretText),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))';
  return new Promise((resolve,reject)=>{
    const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Security; $secretText=[Console]::In.ReadToEnd(); [Console]::Out.Write(${expression})`],{windowsHide:true,maxBuffer:1024*1024,timeout:15000},(error,stdout)=>error?reject(new AppError('No se puede acceder a la conexión Google guardada. Vuelve a conectarla.',503)):resolve(stdout));
    child.stdin.end(text);
  });
}
export function googleSlot(event, zone) {
  if(event.start?.date||!event.start?.dateTime||!event.end?.dateTime||Date.parse(event.end.dateTime)-Date.parse(event.start.dateTime)>86400000)return null;
  const parts=eventSegments(event.status==='cancelled'?{...event,status:'confirmed'}:event,zone,'2000-01-01','2100-12-31');
  if(parts.length!==1||parts[0].allDay||parts[0].duration<5||parts[0].duration>720) return null;
  const {date,time,duration}=parts[0];return {date,time,duration,title:String(event.summary||'Clase de Google').slice(0,150)};
}
function utcInstant(date,time,zone) {
  const minute=Number(time.slice(0,2))*60+Number(time.slice(3));
  if(minute===1440){date=addDays(date,1);time='00:00';}
  const target=Date.parse(`${date}T${time}:00Z`);let guess=target;
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const wall=ms=>{const p=Object.fromEntries(fmt.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);};
  for(let i=0;i<4&&wall(guess)!==target;i++)guess+=target-wall(guess);
  if(wall(guess)!==target)throw new AppError('Una clase cae en una hora inexistente por el cambio de horario. Revisa su horario.');
  return new Date(guess).toISOString();
}

export class GoogleSync {
  constructor(store,dataDir,{fetchImpl=fetch,backups=null,openBrowser=()=>{}}={}) {
    this.store=store;this.file=path.join(dataDir,'google-connection.json');this.fetch=fetchImpl;this.backups=backups;this.openBrowser=openBrowser;
    this.config=this.read('config')||{namespace:randomUUID(),account:'',calendarId:'',sourceIds:null,paused:false,lastSync:''};
    this.secrets={};this.phase='disconnected';this.message='Google sin conectar';this.busy=false;this.dirty=false;this.revision=0;this.closed=false;
  }
  read(id){const row=this.store.db.prepare('SELECT json FROM google_sync WHERE id=?').get(id);return row?JSON.parse(row.json):null;}
  write(id,value){this.store.db.prepare('INSERT INTO google_sync(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run(id,JSON.stringify(value));}
  records(prefix){return this.store.all('google_sync').filter(r=>r.id.startsWith(prefix)).map(r=>({id:r.id,...JSON.parse(r.json)}));}
  saveConfig(){this.write('config',this.config);}
  async init(){
    try {const envelope=JSON.parse(await readFile(this.file,'utf8'));if(envelope.protection==='dpapi'&&process.platform!=='win32')throw Error();this.secrets=JSON.parse(await protect(envelope.value,envelope.protection==='dpapi'));}
    catch(error){if(error.code!=='ENOENT')this.message='Vuelve a conectar Google en Mi información.';}
  }
  async saveSecrets(){
    const write=async()=>{const value=await protect(JSON.stringify(this.secrets)),temp=this.file+'.tmp';await writeFile(temp,JSON.stringify({protection:process.platform==='win32'?'dpapi':'file-permissions',value}),{mode:0o600});await rename(temp,this.file);};
    this.secretWriting=(this.secretWriting||Promise.resolve()).catch(()=>{}).then(write);await this.secretWriting;
  }
  status(){
    const window=googleWindow(this.store.settings().timezone);
    const events=this.records('event-').filter(r=>r.pending&&!r.dismissed&&r.event.status!=='cancelled'&&(this.config.sourceIds===null||r.calendarId===this.config.calendarId||this.config.sourceIds.includes(r.calendarId))&&eventSegments(r.event,this.store.settings().timezone,window.from,window.to).length);
    const conflicts=this.records('link-').filter(r=>r.review&&this.relevant(r,window));
    const connected=!!this.secrets.refreshToken;
    const state=this.busy?'syncing':this.config.paused?'paused':!connected?'disconnected':this.phase==='offline'||this.phase==='error'?this.phase:conflicts.length?'review':this.dirty?'pending':this.phase==='received'?'received':this.phase==='sent'||this.config.lastPush?'sent':'pending';
    const calendars=new Map((this.config.calendars||[]).map(c=>[c.id,c]));
    for(const record of this.records('event-'))if(!calendars.has(record.calendarId))calendars.set(record.calendarId,{id:record.calendarId,title:record.calendarName||record.calendarId});
    return {state,connected,paused:!!this.config.paused,configured:!!this.secrets.clientId,message:this.message,lastSync:this.config.lastSync,lastPull:this.config.lastPull||'',lastPush:this.config.lastPush||'',windowDays:30,pending:this.dirty,calendarId:this.config.calendarId,account:this.config.account,sourceIds:this.config.sourceIds,
      operation:this.operation||null,online:this.online??null,connectionIssue:this.connectionIssue||'',lastPullError:this.lastPullError||'',lastPushError:this.lastPushError||'',hiddenCalendarIds:this.config.hiddenCalendarIds||[],calendars:[...calendars.values()],
      classLinks:this.records('link-').filter(link=>this.relevant(link,window)).map(link=>({key:link.key,sessionId:link.sessionId,linked:!!link.etag,gone:!!link.gone,calendarName:calendars.get(this.config.calendarId)?.title||'Amapola'})),
      revision:this.revision,inbox:events.map(r=>({id:r.id,title:r.event.summary||'Sin título',calendarId:r.calendarId,calendarName:r.calendarName,...googleSlot(r.event,this.store.settings().timezone),foreign:r.calendarId!==this.config.calendarId})),
      reviews:conflicts.map(r=>({key:r.key,sessionId:r.sessionId,title:this.findLocal(r)?.title||r.remote?.summary||'Clase',message:r.review,conflict:false}))};
  }
  async configure(value){
    const client=value?.installed;
    if(!client||typeof client.client_id!=='string'||!/^[-a-zA-Z0-9_.]+\.apps\.googleusercontent\.com$/.test(client.client_id)||typeof client.client_secret!=='string'||!client.client_secret||client.client_secret.length>1024)throw new AppError('Selecciona el JSON de un cliente OAuth de tipo Aplicación de escritorio.');
    if(this.busy)throw new AppError('Espera a que termine la sincronización.',409);
    if((this.config.clientId&&this.config.clientId!==client.client_id)||(this.secrets.clientId&&this.secrets.clientId!==client.client_id&&this.config.calendarId))throw new AppError('Este espacio ya está vinculado a otro cliente Google. Utiliza el cliente original para conservar los vínculos.');
    this.secrets={...this.secrets,clientId:client.client_id,clientSecret:client.client_secret};await this.saveSecrets();this.config.clientId=client.client_id;this.saveConfig();return this.status();
  }
  async authorize(origin){
    if(!this.secrets.clientId)throw new AppError('Importa primero el JSON de conexión Google en Mi información.');
    const state=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url'),redirect=origin+'/oauth/google/callback';
    this.authorization={state,verifier,redirect,expires:Date.now()+600000};
    const query=new URLSearchParams({client_id:this.secrets.clientId,redirect_uri:redirect,response_type:'code',scope:scoped.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:hashBuffer(verifier),code_challenge_method:'S256'});
    return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+query};
  }
  async tokenRequest(body){
    let response;
    try {response=await this.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body).toString(),redirect:'error',signal:AbortSignal.timeout(15000)});}
    catch {throw new AppError('Sin conexión con Google. Los cambios locales se conservan.',503);}
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.access_token){if(result.error==='invalid_grant'){delete this.secrets.refreshToken;await this.saveSecrets();}throw new AppError('Google solicita una nueva conexión. Pulsa Conectar Google.',401);}
    return result;
  }
  async callback(params){
    const pending=this.authorization;this.authorization=null;
    if(!pending||pending.expires<Date.now()||params.get('state')!==pending.state)throw new AppError('La autorización Google caducó o no es válida. Vuelve a conectar.');
    if(params.get('error'))throw new AppError('No se autorizó la conexión Google. Puedes volver a intentarlo.');
    const code=params.get('code');if(!code||code.length>4096)throw new AppError('Respuesta de autorización no válida.');
    this.abort?.abort();await this.running?.catch(()=>{});
    const result=await this.tokenRequest({code,client_id:this.secrets.clientId,client_secret:this.secrets.clientSecret,redirect_uri:pending.redirect,grant_type:'authorization_code',code_verifier:pending.verifier});
    this.secrets={...this.secrets,accessToken:result.access_token,refreshToken:result.refresh_token||this.secrets.refreshToken,expires:Date.now()+Number(result.expires_in||3600)*1000};
    if(!this.secrets.refreshToken)throw new AppError('Google no facilitó acceso permanente. Vuelve a conectar y autoriza el acceso.');
    await this.saveSecrets();this.saveConfig();this.dirty=true;
    if(this.config.paused)this.message='Google conectado. Revisa los agendas y pulsa Reanudar.';
    else this.message='Google conectado. Actualiza para recibir sus eventos.';
  }
  async accessToken(){
    if(!this.secrets.refreshToken)throw new AppError('Conecta Google en Mi información.',401);
    if(!this.secrets.accessToken||this.secrets.expires<Date.now()+60000){
      if(!this.refreshing)this.refreshing=(async()=>{const result=await this.tokenRequest({client_id:this.secrets.clientId,client_secret:this.secrets.clientSecret,refresh_token:this.secrets.refreshToken,grant_type:'refresh_token'});this.secrets.accessToken=result.access_token;this.secrets.expires=Date.now()+Number(result.expires_in||3600)*1000;await this.saveSecrets();})();
      try{await this.refreshing;}finally{this.refreshing=null;}
    }
    return this.secrets.accessToken;
  }
  async request(route,{method='GET',body,etag}={},retry=true){
    const token=await this.accessToken();let response;
    try {response=await this.fetch('https://www.googleapis.com/calendar/v3'+route,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:this.abort?AbortSignal.any([this.abort.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});}
    catch {throw new AppError('Sin conexión con Google. Los cambios locales se conservan.',503);}
    if(response.status===401&&retry){this.secrets.expires=0;await response.body?.cancel();return this.request(route,{method,body,etag},false);}
    if([404,410,409,412].includes(response.status)){await response.body?.cancel();return {http:response.status};}
    if(!response.ok){await response.body?.cancel();throw new AppError(response.status===401?'Vuelve a conectar Google.':response.status===403?'Google no permite acceder a uno de los agendas seleccionados. Revisa la autorización.':response.status===429?'Google solicita esperar. Se reintentará la sincronización.':'Google no pudo completar la sincronización. Los cambios locales se conservan.',response.status===401?401:502);}
    if(response.status===204){await response.body?.cancel();return {};}
    return response.json();
  }
  async pages(route){
    const items=[];let page='';
    for(let count=0;count<100;count++){
      const result=await this.request(route+(page?(route.includes('?')?'&':'?')+'pageToken='+encodeURIComponent(page):''));
      if(result.http||!Array.isArray(result.items))throw new AppError('No se recibió la lista completa de Google. No se ha supuesto ninguna eliminación.',502);
      items.push(...result.items);page=result.nextPageToken;if(!page)return items;
    }
    throw new AppError('Demasiados eventos para sincronizar. Selecciona menos agendas.',502);
  }
  async calendars(){const calendars=(await this.pages('/users/me/calendarList?maxResults=250')).filter(c=>['owner','writer','reader'].includes(c.accessRole)).map(c=>({id:c.id,title:String(c.summaryOverride||c.summary||c.id).slice(0,2000),primary:!!c.primary,owned:c.id===this.config.calendarId}));this.config.calendars=calendars.map(({id,title})=>({id,title}));this.saveConfig();return calendars;}
  async checkConnection(){
    if(this.busy)return this.status();
    if(!this.secrets.refreshToken){this.online=false;this.connectionIssue='Google no está conectado. Los agendas no se han actualizado.';return this.status();}
    try{await this.calendars();this.online=true;this.connectionIssue='';if(this.phase==='offline')this.phase=this.config.lastPull?'received':'pending';}
    catch(error){this.online=false;this.connectionIssue=error instanceof AppError?error.message:'No se puede conectar con Google.';}
    return this.status();
  }
  setVisibility(ids){if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!googleId(id)))throw new AppError('Agendas ocultos no válidos.');this.config.hiddenCalendarIds=[...new Set(ids)];this.saveConfig();return this.status();}
  async selectCalendars(ids){
    const calendars=await this.calendars(),allowed=new Set(calendars.map(c=>c.id));
    if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!allowed.has(id)))throw new AppError('Selecciona agendas accesibles.');
    this.config.sourceIds=[...new Set([...ids,this.config.calendarId].filter(Boolean))];this.saveConfig();this.touch();return this.status();
  }
  touch(){this.dirty=true;}
  async run(direction='pull'){
    if(!['pull','push'].includes(direction))throw new AppError('Dirección de sincronización no válida.');
    if(this.closed||this.busy||this.config.paused||!this.secrets.refreshToken)return this.status();
    this.busy=true;this.abort=new AbortController();this.message=direction==='pull'?'Recibiendo de Google…':'Enviando Amapola a Google…';
    this.operation={id:randomUUID(),direction,done:0,total:0,stage:this.message,ok:null,error:''};
    this.running=this.cycle(direction);
    try {await this.running;this.phase=direction==='pull'?'received':'sent';this.message=direction==='pull'?(this.dirty?'Google recibido. Hay cambios locales pendientes de enviar.':'Datos recibidos de Google.'):'Agenda Amapola enviada a Google.';this.operation.ok=true;this.online=true;this.connectionIssue='';if(direction==='pull')this.lastPullError='';else this.lastPushError='';}
    catch(error){this.dirty=true;this.phase=error.status===503?'offline':error.status===401?'disconnected':'error';this.message=error instanceof AppError?error.message:'No se pudo sincronizar. Los datos locales se conservan.';this.operation.ok=false;this.operation.error=this.message;if(direction==='pull')this.lastPullError=this.message;else this.lastPushError=this.message;if(error.status===503||error.status===401){this.online=false;this.connectionIssue=this.message;}}
    finally{this.busy=false;this.abort=null;this.running=null;}
    return this.status();
  }
  async ensureCalendar(calendars,{create=true}={}){
    const account=calendars.find(c=>c.primary)?.id;
    if(!account)throw new AppError('No se puede identificar la cuenta Google.',502);
    if(this.config.account&&this.config.account!==account)throw new AppError('Conecta la misma cuenta Google que se utilizó con este espacio Amapola.');
    this.config.account=account;
    if(!this.config.calendarId&&!create){this.saveConfig();return;}
    if(!this.config.calendarId){const calendar=await this.request('/calendars',{method:'POST',body:{summary:'Amapola',timeZone:this.store.settings().timezone,description:'Clases de Amapola. Los datos de alumnos, tarifas y pagos se editan en Amapola.'}});if(!googleId(calendar.id))throw new AppError('Google no confirmó la creación del agenda.',502);this.config.calendarId=calendar.id;this.saveConfig();}
  }
  findLocal(link){
    if(link.sessionId){const row=this.store.db.prepare('SELECT * FROM sessions WHERE id=?').get(link.sessionId);if(row)return row;}
    const key=link.key;
    if(typeof key!=='string')return null;
    if(!key.includes('@'))return this.store.db.prepare('SELECT * FROM sessions WHERE id=?').get(key)||null;
    const [id,date]=key.split('@');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
    const stored=this.store.db.prepare('SELECT * FROM sessions WHERE scheduleId=? AND originalDate=?').get(id,date);if(stored)return stored;
    try {const rule=this.store.get('schedules',id);if(!this.store.get('students',rule.studentId).active||!this.store.scheduleDates(rule,date,date).length)return null;return this.store.projected(rule,date);}catch{return null;}
  }
  relevant(link,window){
    const local=this.findLocal(link);
    return !!(local&&local.date>=window.from&&local.date<=window.to)||!!(link.remote&&eventSegments(link.remote,this.store.settings().timezone,window.from,window.to).length);
  }
  saveGoogleClass(link,event) {
    let local=this.findLocal(link);
    const removed=event.status==='cancelled'||event.http===404||event.http===410;
    link.remote=simpleEvent({...link.remote,...event});link.conflict='';link.review='';
    if(!local){
      if(!removed){this.write(eventId(this.config.calendarId,event.id),{calendarId:this.config.calendarId,calendarName:this.config.calendars?.find(c=>c.id===this.config.calendarId)?.title||'Amapola',event:simpleEvent(event),pending:true,dismissed:false,linkKey:''});this.store.db.prepare('DELETE FROM google_sync WHERE id=?').run(linkId(link.key));}
      else {link.gone=true;link.etag=event.etag||link.etag;this.write(linkId(link.key),link);}
      return;
    }
    // Virtual occurrence IDs contain @; only UUIDs may be stored in session archives.
    if(local.virtual)local={...local,id:randomUUID()};
    if(removed){
      const saved=this.store.persistSession(local,{status:'cancelled',isDeleted:0,isOverride:1});link.sessionId=saved.id;link.baseHash=fingerprint(saved);link.gone=true;
    } else {
      const slot=googleSlot(event,this.store.settings().timezone);
      if(!slot){link.review='Revisa en Google este horario de varios días o fuera de la duración de una clase.';link.etag=event.etag;this.write(linkId(link.key),link);return;}
      const remoteStatus=event.extendedProperties?.private?.amapolaStatus;
      const metadata=event.extendedProperties?.private||{};
      // Amapola's display name in Google is independent of the local course
      // title. A manually changed Google title still takes priority on receipt.
      if(event.summary===metadata.amapolaSummary&&typeof metadata.amapolaTitle==='string'&&metadata.amapolaTitle.trim()&&metadata.amapolaTitle.length<=150)slot.title=metadata.amapolaTitle;
      const status=['planned','confirmed','completed','cancelled'].includes(remoteStatus)?remoteStatus:local.isDeleted||local.status==='cancelled'?'planned':local.status;
      if(status==='cancelled')slot.title=slot.title.replace(/^\[Cancelada\] /,'');
      const saved=this.store.persistSession(local,{...slot,status,isDeleted:0,isOverride:1});link.sessionId=saved.id;link.baseHash=fingerprint(saved);link.gone=false;
      if(Number(slot.time.slice(3))%15||slot.duration%15)link.review='Horario Google fuera de intervalos de 15 minutos. Puedes corregirlo en la clase.';
    }
    link.etag=event.etag||link.etag;this.write(linkId(link.key),link);
  }
  receiveEvent(calendar,event,links) {
    const own=calendar.id===this.config.calendarId,privateData=event.extendedProperties?.private||{};
    let link=own?links.get(event.id):null;
    if(!link&&own&&privateData.amapolaWorkspace===this.config.namespace&&googleId(privateData.amapolaClass)){
      const candidate={key:privateData.amapolaClass,googleId:event.id,etag:'',baseHash:''};
      if(this.findLocal(candidate))link=candidate;
    }
    if(link){this.saveGoogleClass(link,event);return;}
    const id=eventId(calendar.id,event.id),old=this.read(id),removed=event.status==='cancelled';
    this.write(id,{calendarId:calendar.id,calendarName:calendar.title,event:simpleEvent({...old?.event,...event}),pending:old?.pending??(own||/^\s*Amapola\b/i.test(event.description||'')),dismissed:removed,linkKey:old?.linkKey||''});
  }
  hasLocalChanges(window) {
    const links=this.records('link-'),keys=new Set(links.map(l=>l.key)),sessions=new Set(links.map(l=>l.sessionId).filter(Boolean));
    return this.store.occurrences(window.from,window.to).some(row=>!keys.has(keyOf(row))&&!sessions.has(row.id))||links.some(link=>this.relevant(link,window)&&(fingerprint(this.findLocal(link))!==link.baseHash||infoHash(this.findLocal(link))!==link.infoHash));
  }
  async receive() {
    const calendars=await this.calendars();await this.ensureCalendar(calendars,{create:false});
    if(this.config.calendarId&&!calendars.some(c=>c.id===this.config.calendarId))calendars.push({id:this.config.calendarId,title:'Amapola'});
    const selected=calendars.filter(c=>c.id===this.config.calendarId||this.config.sourceIds===null||this.config.sourceIds.includes(c.id));
    if(this.config.sourceIds?.some(id=>!selected.some(c=>c.id===id)))throw new AppError('Un agenda seleccionado ya no es accesible. Revisa la selección.');
    const zone=this.store.settings().timezone,window=googleWindow(zone),{from,to}=window;
    const links=this.records('link-'),index=new Map(links.map(link=>[link.googleId,link])),incoming=[];
    this.operation.total=selected.length;this.operation.stage='Descargando los agendas seleccionados…';
    for(const calendar of selected){
      const query=new URLSearchParams({singleEvents:'true',showDeleted:'true',maxResults:'1000',timeMin:utcInstant(from,'00:00',zone),timeMax:utcInstant(window.end,'00:00',zone)});
      const events=await this.pages(`/calendars/${encodeURIComponent(calendar.id)}/events?${query}`);
      for(const event of events){
        const linked=calendar.id===this.config.calendarId?index.get(event.id):null,old=this.read(eventId(calendar.id,event.id));
        if(eventSegments(event,zone,from,to).length||(linked&&this.relevant(linked,window))||(old&&eventSegments(old.event,zone,from,to).length))incoming.push({calendar,event});
      }
      this.operation.done++;
    }
    const missing=[];
    for(const link of links)if(link.etag&&this.relevant(link,window)&&!incoming.some(r=>r.calendar.id===this.config.calendarId&&r.event.id===link.googleId))missing.push({calendar:{id:this.config.calendarId,title:'Amapola'},id:link.googleId});
    for(const record of this.records('event-'))if(!record.dismissed&&!(record.linkKey&&!record.pending&&record.calendarId===this.config.calendarId)&&selected.some(c=>c.id===record.calendarId)&&eventSegments(record.event,zone,from,to).length&&!incoming.some(r=>r.calendar.id===record.calendarId&&r.event.id===record.event.id)&&!missing.some(r=>r.calendar.id===record.calendarId&&r.id===record.event.id))missing.push({calendar:selected.find(c=>c.id===record.calendarId),id:record.event.id});
    this.operation.total+=missing.length;
    for(const item of missing){
      const result=await this.request(`/calendars/${encodeURIComponent(item.calendar.id)}/events/${encodeURIComponent(item.id)}`);
      if(result.http&&![404,410].includes(result.http))throw new AppError('Google no confirmó el estado del evento. No se ha supuesto su eliminación.',502);
      incoming.push({calendar:item.calendar,event:result.http?{id:item.id,status:'cancelled',etag:'gone'}:result});this.operation.done++;
    }
    // No domain changes until every selected agenda and missing event has been read successfully.
    if(this.backups&&incoming.some(r=>r.calendar.id===this.config.calendarId&&index.has(r.event.id)))await this.backups.beforeGoogleSync();
    this.operation.stage='Aplicando Google a Amapola…';
    this.store.transaction(()=>{
      incoming.sort((a,b)=>Number(a.calendar.id===this.config.calendarId)-Number(b.calendar.id===this.config.calendarId));
      for(const {calendar,event} of incoming)this.receiveEvent(calendar,event,index);
    });
    this.revision++;this.dirty=this.hasLocalChanges(window);this.config.lastPull=new Date().toISOString();this.saveConfig();this.backups?.schedule();
  }
  async send() {
    // Account/calendar metadata may be checked; event contents are never imported by an upload.
    await this.ensureCalendar(await this.calendars());
    const window=googleWindow(this.store.settings().timezone),inventory=this.store.occurrences(window.from,window.to),known=this.records('link-');
    const keys=new Set(known.map(l=>l.key)),sessions=new Set(known.map(l=>l.sessionId).filter(Boolean));
    for(const row of inventory)if(!keys.has(keyOf(row))&&!sessions.has(row.id)){
      const key=keyOf(row);this.write(linkId(key),{key,sessionId:row.virtual?'':row.id,googleId:'amapola'+hash(this.config.namespace+'\n'+key),etag:'',baseHash:'',gone:false,review:'',conflict:''});
    }
    const links=this.records('link-').filter(link=>this.relevant(link,window));
    this.operation.total=links.length;this.operation.stage='Enviando las clases Amapola…';
    const route=`/calendars/${encodeURIComponent(this.config.calendarId)}/events`;
    for(const {id,...link} of links){
      const local=this.findLocal(link);
      if(!local||local.isDeleted){
        const result=await this.request(route+'/'+encodeURIComponent(link.googleId),{method:'DELETE'});if(result.http&&![404,410].includes(result.http))throw new AppError('Google no confirmó la eliminación. Vuelve a enviar.',502);
        link.gone=true;
      } else {
        const body=this.eventBody(local,link.key);
        let result=await this.request(route+'/'+encodeURIComponent(link.googleId),{method:'PATCH',body});
        if(result.http===404||result.http===410||result.status==='cancelled'){
          if(link.etag||link.gone){link.googleId='amapola'+randomUUID().replaceAll('-','');link.etag='';link.gone=false;this.write(id,link);}
          result=await this.request(route,{method:'POST',body:{...body,id:link.googleId}});
          if(result.http===409){
            const existing=await this.request(route+'/'+encodeURIComponent(link.googleId));
            if(existing.extendedProperties?.private?.amapolaWorkspace!==this.config.namespace||existing.extendedProperties?.private?.amapolaClass!==link.key)throw new AppError('El identificador Google pertenece a otro evento. No se ha sobrescrito.',409);
            result=await this.request(route+'/'+encodeURIComponent(link.googleId),{method:'PATCH',body});
          }
        }
        if(!result.etag)throw new AppError('Google no confirmó el guardado. Vuelve a enviar; no se creará un duplicado.',502);
        link.etag=result.etag;link.remote=simpleEvent(result);link.gone=false;
      }
      link.baseHash=fingerprint(local);link.infoHash=infoHash(local);link.conflict='';link.review='';this.write(id,link);this.operation.done++;
    }
    this.config.lastPush=new Date().toISOString();this.dirty=false;this.saveConfig();this.backups?.schedule();
  }
  async cycle(direction){return direction==='pull'?this.receive():this.send();}

  eventBody(row,key){
    const zone=this.store.settings().timezone,minutes=Number(row.time.slice(0,2))*60+Number(row.time.slice(3))+row.duration;
    const end=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
    const student=this.store.get('students',row.studentId),paid=row.paymentStatus==='paid';
    const summary=(row.status==='cancelled'?'[Cancelada] ':'')+'Clase con '+student.firstName;
    return {status:'confirmed',summary,
      description:`Amapola\nAlumno: ${student.firstName} ${student.lastName}\nTarifa: ${(row.price/100).toFixed(2)} ${this.store.settings().currency}\nPago: ${paid?'Pagada':'Pendiente'}${row.paymentMethod?' · '+row.paymentMethod:''}\nModalidad: ${row.modality}\nEstado: ${row.status}\n\nInformación de referencia. Alumno, tarifa y pago se modifican en Amapola.`,
      start:{dateTime:utcInstant(row.date,row.time,zone),timeZone:zone},end:{dateTime:utcInstant(row.date,end,zone),timeZone:zone},
      transparency:row.status==='cancelled'?'transparent':'opaque',extendedProperties:{private:{amapolaWorkspace:this.config.namespace,amapolaClass:key,amapolaStatus:row.status,amapolaTitle:row.title,amapolaSummary:summary}}};
  }
  complete(id,value){
    const record=this.read(id);if(!record||!record.pending||record.dismissed||record.event.status==='cancelled')throw new AppError('Esta clase Google ya no está pendiente.',409);
    const data=classInput(value),date=dateValue(value.date);this.store.get('students',data.studentId);
    return this.store.transaction(()=>{
      const row=this.store.insert('sessions',{...data,id:randomUUID(),scheduleId:null,originalDate:date,date,status:'planned',paymentStatus:'unpaid',paymentMethod:'',isOverride:1,isDeleted:0});
      const own=record.calendarId===this.config.calendarId;
      this.write(linkId(row.id),{key:row.id,sessionId:row.id,googleId:own?record.event.id:'amapola'+hash(this.config.namespace+'\n'+row.id),etag:own?record.event.etag:'',baseHash:'',gone:false,review:'',conflict:''});
      this.write(id,{...record,pending:false,linkKey:row.id});this.touch();return row;
    });
  }
  pauseAfterRestore(){this.config=this.read('config')||{namespace:randomUUID(),account:'',calendarId:'',sourceIds:null,lastSync:''};this.config.paused=true;this.saveConfig();this.message='Copia restaurada. Revisa los agendas y pulsa Reanudar.';clearTimeout(this.timer);}
  resume(){if(!this.secrets.refreshToken)throw new AppError('Conecta Google antes de reanudar la sincronización.',401);this.config.paused=false;this.saveConfig();this.dirty=true;this.message='Reanudado. Elige Actualizar o Enviar.';}
  async disconnect(){
    clearTimeout(this.timer);this.abort?.abort();await this.running?.catch(()=>{});
    const token=this.secrets.refreshToken;this.secrets={clientId:this.secrets.clientId,clientSecret:this.secrets.clientSecret};await this.saveSecrets();this.phase='disconnected';this.message='Google desconectado. Los datos locales se conservan.';
    if(token)try{await this.fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token}).toString(),signal:AbortSignal.timeout(5000),redirect:'error'});}catch{}
  }
  async close(){this.closed=true;clearTimeout(this.timer);clearInterval(this.periodic);this.abort?.abort();await this.running?.catch(()=>{});}
}
function hashBuffer(value){return createHash('sha256').update(value).digest('base64url');}
