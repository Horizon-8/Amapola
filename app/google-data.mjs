// Only calendar data belongs in the database and backups. OAuth credentials live separately.
export const googleId = value => typeof value === 'string' && value.length > 0 && value.length <= 1024;
export function googleWindow(zone, now = new Date()) {
  const from=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const day=new Date(from+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+29);const to=day.toISOString().slice(0,10);
  day.setUTCDate(day.getUTCDate()+1);return {from,to,end:day.toISOString().slice(0,10)};
}
export function syncRows(rows = []) {
  if (!Array.isArray(rows) || rows.length > 100000) throw Error('Datos de Google no válidos.');
  return rows.map(row => {
    if (!row || !/^(config|link-[a-f0-9]{64}|event-[a-f0-9]{64})$/.test(row.id) || typeof row.json !== 'string' || row.json.length > 100000) throw Error('Datos de Google no válidos.');
    const value = JSON.parse(row.json);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Datos de Google no válidos.');
    const fields = row.id === 'config'
      ? ['namespace','account','calendarId','clientId','sourceIds','paused','lastSync','lastPull','lastPush','hiddenCalendarIds','calendars']
      : row.id.startsWith('link-')
        ? ['key','sessionId','googleId','etag','baseHash','infoHash','gone','review','conflict','remote']
        : ['calendarId','calendarName','event','pending','dismissed','linkKey'];
    const clean = Object.fromEntries(fields.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
    if (row.id === 'config' && (!/^[a-f0-9-]{36}$/.test(clean.namespace) || (clean.sourceIds !== null && (!Array.isArray(clean.sourceIds) || clean.sourceIds.length > 1000 || clean.sourceIds.some(id=>!googleId(id)))))) throw Error('Configuración Google no válida.');
    if(row.id==='config'&&clean.hiddenCalendarIds!==undefined&&(!Array.isArray(clean.hiddenCalendarIds)||clean.hiddenCalendarIds.length>1000||clean.hiddenCalendarIds.some(id=>!googleId(id))))throw Error('Agendas ocultos no válidos.');
    if(row.id==='config'&&clean.calendars!==undefined&&(!Array.isArray(clean.calendars)||clean.calendars.length>1000||clean.calendars.some(c=>!googleId(c?.id)||typeof c.title!=='string'||c.title.length>2000)))throw Error('Lista de agendas no válida.');
    if (row.id.startsWith('link-') && (!googleId(clean.key) || !googleId(clean.googleId))) throw Error('Vínculo Google no válido.');
    if (row.id.startsWith('event-') && (!googleId(clean.calendarId) || !googleId(clean.event?.id))) throw Error('Evento Google no válido.');
    return {id:row.id,json:JSON.stringify(clean)};
  });
}

export function simpleEvent(event) {
  return Object.fromEntries(['id','etag','status','summary','description','start','end','htmlLink','recurringEventId','originalStartTime','extendedProperties'].filter(key=>event[key]!==undefined).map(key=>[key,event[key]]));
}
const dateRE = /^\d{4}-\d{2}-\d{2}$/;
const nextDay = date => {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
function instant(value, zone) {
  if (!value?.dateTime || !Number.isFinite(Date.parse(value.dateTime))) return null;
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value.dateTime)).map(p=>[p.type,p.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,minutes:Number(p.hour)*60+Number(p.minute)+Number(p.second)/60};
}
export function eventSegments(event, zone, from, to) {
  if (event.status === 'cancelled') return [];
  const allDay=!!event.start?.date;
  const start=allDay?{date:event.start.date,minutes:0}:instant(event.start,zone);
  const finish=allDay?{date:event.end?.date,minutes:0}:instant(event.end,zone);
  if (!start || !finish || !dateRE.test(start.date)||!dateRE.test(finish.date)||start.date>finish.date) return [];
  const rows=[];
  for(let date=start.date<from?from:start.date;date<=to&&date<=finish.date;date=nextDay(date)){
    const a=date===start.date?Math.floor(start.minutes):0,b=date===finish.date?Math.ceil(finish.minutes):1440;
    if(b<=a)continue;
    rows.push({date,time:`${String(Math.floor(a/60)).padStart(2,'0')}:${String(a%60).padStart(2,'0')}`,duration:b-a,allDay});
  }
  return rows;
}
export function googleBusy(rows, zone, from, to) {
  const output=[];
  const window=googleWindow(zone);from=from<window.from?window.from:from;to=to>window.to?window.to:to;
  if(from>to)return output;
  const config=rows.find(r=>r.id==='config'),selected=config?JSON.parse(config.json):null;
  for(const row of rows){
    if(!row.id.startsWith('event-'))continue;
    const record=JSON.parse(row.json);
    if(record.dismissed||(record.linkKey&&!record.pending&&record.calendarId===selected?.calendarId)||(selected?.sourceIds!==null&&selected?.sourceIds&&!selected.sourceIds.includes(record.calendarId)&&record.calendarId!==selected.calendarId))continue;
    const event=record.event;
    for(const part of eventSegments(event,zone,from,to))output.push({...part,id:`${row.id}:${part.date}`,googleRecord:row.id,kind:'busy',source:'google',readOnly:true,needsAssignment:!!record.pending,
      title:String(event.summary||'Sin título').slice(0,150),notes:'',calendarId:record.calendarId,calendarName:String(record.calendarName||''),googleUrl:event.htmlLink||''});
  }
  return output;
}
