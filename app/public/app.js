let attachCalendarGestures, paymentState, hasEnded;
try {
  const response = await fetch('/api/health', { signal: AbortSignal.timeout(10000) });
  const health = await response.json();
  if (!response.ok || health.app !== 'amapola' || health.version !== '0.5.0') throw new Error('Hay una versión anterior de Amapola abierta. Abre de nuevo Amapola.exe para reiniciarla y cargar la actualización.');
  ({ attachCalendarGestures } = await import('./calendar-interactions.mjs'));
  ({ paymentState, hasEnded } = await import('./class-utils.mjs'));
} catch (error) {
  const target = document.getElementById('main');
  const panel = document.createElement('div'); panel.className = 'empty-state';
  const title = document.createElement('h3'); title.textContent = 'No se pudo iniciar Amapola';
  const message = document.createElement('p'); message.textContent = error.message.startsWith('Hay una versión anterior') ? error.message : 'No se pudieron cargar los archivos de la aplicación. Abre Amapola.exe desde la carpeta del proyecto y vuelve a cargar esta pestaña.';
  const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Volver a cargar'; retry.addEventListener('click', () => location.reload());
  panel.append(title, message, retry); target.replaceChildren(panel);
  throw error;
}
/* Amapola — no business data is stored in the browser. Only appearance is local. */
const icons = {
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
 plan:'<rect x="5" y="4" width="15" height="18" rx="2"/><path d="M9 2h7v4H9zM9 11h7m-7 5h7"/>',
 chart:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
 settings:'<path d="m9 3-.5 2-2 .9-1.9-.6-2 3.4L4 10v2l-1.4 1.3 2 3.4 1.9-.5 2 .9.5 2h4l.5-2 2-.9 1.9.5 2-3.4L20 12v-2l1.4-1.3-2-3.4-1.9.6-2-.9-.5-2z"/><circle cx="12" cy="11" r="3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 left:'<path d="m14 6-6 6 6 6"/>', right:'<path d="m10 6 6 6-6 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
 edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>', trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 online:'<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M12 16v5m-5 0h10M8 12h8"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7"/>',
 travel:'<path d="m5 7 2-4h10l2 4m-16 3 2-3h14l2 3v8H3zm2 8v3m14-3v3M7 13h1m8 0h1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', money:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
 moon:'<path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>', cloud:'<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-2 5 5 0 0 1 0 12m-6 3V11m-4 4 4-4 4 4"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>', check:'<path d="m5 12 4 4L19 6"/>',
 repeat:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
 power:'<path d="M12 2v10M5 5a9 9 0 1 0 14 0"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 whatsapp:'<path d="M21 11.5a9 9 0 0 1-13.5 7.8L3 21l1.6-5A9 9 0 1 1 21 11.5Z"/><path d="M8 7c0 5 4 8 8 8l1-2-3-1-1 1-3-3 1-1-1-3Z"/>',
 messenger:'<path d="M21 11a9 8 0 0 1-13 7l-4 2 .5-4A9 8 0 1 1 21 11Z"/><path d="m7 13 4-4 3 3 3-3"/>',
 instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7"/>',
 phone:'<path d="m6 3 4 1-1 5 6 6 5-1 1 4c-3 7-21-11-15-15Z"/>', other:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const shortDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const channelNames = {whatsapp:'WhatsApp',messenger:'Messenger',instagram:'Instagram',email:'Email',phone:'Teléfono',other:'Otro'};
const modalityNames = {online:'En línea',home:'Presencial',travel:'A domicilio'};
const palette = ['#bc587a','#8b79bd','#bf895b','#698f9d','#8c9a65','#d88396','#6a87bb','#be7663'];
const S = { students:[], schedules:[], settings:{currency:'COP',timezone:'America/Bogota'}, csrf:'', today:'', week:'', calendarMode:'week', planDay:null, studentTab:'planning', reportTab:'current', search:'', channel:'all', active:'all', renderId:0 };
Object.assign(S, { classPeriod:'past', classFilters:{from:'',to:'',student:'',payment:'all',method:'',status:''}, classPage:1 });
const calendarScale=0.8;
S.busyBlocks=[];
let disposeCalendar = () => {};
let theme = 'system';
try { theme = localStorage.getItem('amapola-theme') || 'system'; } catch {}
const media = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(value) {
  theme = ['light','dark','system'].includes(value) ? value : 'system';
  document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
  try { localStorage.setItem('amapola-theme', theme); } catch {}
  $('#theme-toggle').innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
  $$('[data-theme-choice]').forEach(b => b.classList.toggle('active', b.dataset.themeChoice === theme));
}
media.addEventListener('change', () => { if (theme === 'system') applyTheme(theme); });
const plusDays = (date, n) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const dayOf = date => (new Date(`${date}T12:00:00Z`).getUTCDay()+6)%7;
const weekOf = date => plusDays(date,-dayOf(date));
const fmtDate = (date, options = {day:'numeric',month:'short'}) => new Intl.DateTimeFormat('es-CO',{...options,timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const range = start => `${fmtDate(start)} – ${fmtDate(plusDays(start,6), {day:'numeric',month:'short',year:'numeric'})}`;
const money = cents => new Intl.NumberFormat('es-CO',{style:'currency',currency:S.settings.currency,currencyDisplay:'code',minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2}).format(cents/100);
const num = n => new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(n);
const min = t => Number(t.slice(0,2))*60+Number(t.slice(3));
const end = row => { const t=min(row.time)+row.duration; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };
const fullname = s => `${s.firstName} ${s.lastName}`.trim();
const initials = s => ((s.firstName||'?').slice(0,1)+(s.lastName||'').slice(0,1)).toUpperCase();
const avatar = (s, large=false) => `<span class="avatar ${large?'large':''}" style="--student:${esc(s.color)}">${esc(initials(s))}</span>`;
const studentBy = id => S.students.find(s=>s.id===id);
const studentStatus = s => s.stage === 'prospect' ? 'prospect' : s.active ? 'active' : 'inactive';
const studentStatusNames = {prospect:'En conversación',active:'Activo',inactive:'Inactivo'};
const studentBadge = s => `<span class="badge student-status ${studentStatus(s)}"><span class="status-marker" aria-hidden="true"></span>${studentStatusNames[studentStatus(s)]}</span>`;
const channelBadge = s => `<span class="badge channel-badge ${esc(s.channel)}">${icon(s.channel)}${esc(channelNames[s.channel])}</span>`;
function webLink(value) {
  try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password ? u.href : ''; } catch { return ''; }
}
function noteLinks(value) { return (String(value||'').match(/https?:\/\/[^\s<>"']+/gi)||[]).map(v=>v.replace(/[.,;!?]+$/,'')).filter(webLink); }
function linkedNotes(value) {
  const source=String(value||''); let result='',offset=0;
  for(const match of source.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url=match[0].replace(/[.,;!?]+$/,'');
    result+=esc(source.slice(offset,match.index));
    result+=webLink(url)?`<a href="${esc(webLink(url))}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`:esc(url);
    offset=match.index+url.length;
  }
  return result+esc(source.slice(offset));
}
function contactLinks(s) {
  const links=[], phone=String(s.phone||'').trim(), digits=phone.replace(/\D/g,'').replace(/^00/,'');
  if(/^(\+|00)[\d\s().-]+$/.test(phone)&&/^[1-9]\d{7,14}$/.test(digits)) links.push(['whatsapp','WhatsApp',`https://wa.me/${digits}`]);
  if(s.email) links.push(['mail','Email',`mailto:${encodeURIComponent(s.email)}`]);
  if(webLink(s.messenger)) links.push(['messenger','Messenger',webLink(s.messenger)]);
  if(phone&&/^\+?[\d\s().-]+$/.test(phone)) links.push(['phone','Llamar',`tel:${phone.replace(/[^+\d]/g,'')}`]);
  for(const url of [...new Set(noteLinks(s.notes))].slice(0,3)) if(!links.some(l=>l[2]===webLink(url))) {
    const host=new URL(url).hostname.toLowerCase(),instagram=host==='instagram.com'||host.endsWith('.instagram.com');
    links.push([instagram?'instagram':'other',instagram?'Instagram':host,webLink(url)]);
  }
  links.sort((a,b)=>(b[0]===(s.channel==='email'?'mail':s.channel))-(a[0]===(s.channel==='email'?'mail':s.channel)));
  return `<div class="contact-links">${links.map(([ico,label,url])=>`<a class="btn small contact-link ${ico}" href="${esc(url)}" ${url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${icon(ico)}${esc(label)}</a>`).join('')}</div>`;
}
const priceInput = cents => (cents/100).toFixed(2);
function parsePrice(value) { if (!/^\d{1,10}([.,]\d{1,2})?$/.test(value)) throw new Error('Indica una tarifa positiva con un máximo de dos decimales.'); const [a,b=''] = value.replace(',','.').split('.'); return Number(a)*100+Number(b.padEnd(2,'0')); }
function toast(message, error=false) { const el=$('#toast'); el.textContent=message; el.className=`show${error?' error':''}`; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.className='',error?6500:4000); }
async function api(route, method='GET', data, headers={}) {
  let res;
  try { res=await fetch(route,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json','X-Amapola-Token':S.csrf}:{}),...headers},...(data===undefined?{}:{body:data instanceof File?data:JSON.stringify(data)})}); }
  catch { throw new Error('No se puede conectar con Amapola. Vuelve a abrirla desde su acceso directo.'); }
  const result=await res.json().catch(()=>({error:'Respuesta no válida. Recarga la página.'}));
  if (!res.ok) throw new Error(result.error||'No se pudo completar la operación.');
  return result;
}
async function refresh() { const v=await api('/api/bootstrap'); Object.assign(S,v); if(!S.week)S.week=weekOf(S.today); updateShell(); }
function updateShell() {
  const nav=[['calendario','calendar','Calendario'],['alumnos','users','Alumnos'],['clases','clock','Clases'],['planificacion','plan','Planificación'],['informes','chart','Informes']];
  $('#navigation').innerHTML=nav.map(([route,ico,label])=>`<a href="#${route}" class="nav-item" data-nav="${route}" title="${label}">${icon(ico)}<span class="nav-label">${label}</span>${route==='alumnos'?`<span class="count">${S.students.filter(s=>s.active).length}</span>`:''}</a>`).join('');
  $('#settings-link').className='nav-item'; $('#settings-link').dataset.nav='ajustes'; $('#settings-link').title='Mi información'; $('#settings-link').innerHTML=`${icon('settings')}<span class="nav-label">Mi información</span>`;
  $('#shutdown').innerHTML=`${icon('power')}<span class="nav-label">Cerrar aplicación</span>`;$('#shutdown').title='Cerrar aplicación';
  $('#business-name').textContent=S.settings.business||'Mis clases';$('#profile-avatar').textContent=(S.settings.name||'A')[0].toUpperCase();
  applyTheme(theme);
}
const heading=(eyebrow,title,sub,action='')=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${action}</div>`;
const newClass=studentId=>`<button class="btn primary" data-action="new-schedule" ${studentId?`data-student="${studentId}"`:''}>${icon('plus')} Nueva clase</button>`;
const empty=(title,sub,action='')=>`<div class="empty-state"><span aria-hidden="true">✿</span><h3>${title}</h3><p>${sub}</p>${action}</div>`;
const modalityIcon=row=>`<span class="modality-icon ${row.modality}" title="${modalityNames[row.modality]}" aria-hidden="true">${icon(row.modality)}</span>`;
const modalityBadge=row=>`<span class="badge modality-badge ${row.modality}">${modalityIcon(row)}${modalityNames[row.modality]}</span>`;
function statusBadge(row) {
  return classStatusPill(row);
}
const classStatusNames={planned:'Por confirmar',confirmed:'Confirmada',completed:'Realizada',cancelled:'Cancelada'};
const nextClassStatus=status=>status==='planned'?'confirmed':status==='confirmed'||status==='completed'?'cancelled':'planned';
function classStatusPill(row,compact=false) {
  const status=row.status||'planned',label=classStatusNames[status],next=classStatusNames[nextClassStatus(status)];
  const symbol=status==='planned'?'?':status==='cancelled'?'×':status==='completed'?'✓✓':'✓';
  return `<button type="button" class="class-status ${status} ${compact?'compact':''}" data-action="class-status" data-id="${esc(row.id)}" data-class-status="${status}" aria-label="Clase de ${esc(row.studentName||fullname(studentBy(row.studentId)))}: ${label}. Cambiar a ${next}" title="${label}. Clic: ${next}. Cambia solo esta sesión."><span aria-hidden="true">${symbol}</span>${compact?'':`<span>${label}</span>`}</button>`;
}
async function cycleClassStatus(id,button) {
  if(button.disabled)return;
  const row=findSession(id);if(!row)return;
  const status=nextClassStatus(row.status);
  const save=async()=>{await api(`/api/sessions/${encodeURIComponent(id)}/status`,'PUT',{status,expectedStatus:row.status});await refresh();await render();toast(`Clase: ${classStatusNames[status]}.`);};
  button.disabled=true;
  try {
    if(row.status==='cancelled') {
      const value={...row,status};
      const result=await api('/api/conflicts','POST',{kind:'session',id,value});
      if(result.total) {
        modal('Reactivar esta clase','Al volver a ocupar este horario hay otras actividades.',conflictMarkup(result),cancelBtn+submitBtn('Reactivar clase'),async form=>{await confirmConflicts(form);await save();$('#dialog').close();});
        setupConflicts('session',id,()=>value);return;
      }
    }
    await save();
  } finally {if(button.isConnected)button.disabled=false;}
}
function weekControls(){return `<div class="calendar-controls"><button class="icon-button" data-action="prev-week" aria-label="Semana anterior">${icon('left')}</button><span class="calendar-range">${range(S.week)}</span><button class="icon-button" data-action="next-week" aria-label="Semana siguiente">${icon('right')}</button><button class="btn small" data-action="today">Hoy</button></div>`;}
function summary(report){return `<div class="stats"><div class="stat-card featured"><div class="stat-top"><span class="stat-icon">${icon('calendar')}</span>Esta semana</div><div class="stat-value">${report.current.count} <span style="font:14px 'Segoe UI',sans-serif">clases</span></div><div class="stat-caption">${num(report.current.hours)} horas para compartir conocimiento</div></div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${icon('money')}</span>Ingresos estimados</div><div class="stat-value">${money(report.current.total)}</div><div class="stat-caption">Según las clases de la semana seleccionada</div></div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${icon('users')}</span>Alumnos activos</div><div class="stat-value">${S.students.filter(s=>s.active).length}</div><div class="stat-caption"><a class="rose" href="#alumnos">Cada alumno, un camino diferente ${icon('right')}</a></div></div></div>`;}

const paymentMethodNames = {'':'Sin especificar',cash:'Efectivo',transfer:'Transferencia bancaria',card:'Tarjeta',nequi:'Nequi',daviplata:'DaviPlata',paypal:'PayPal',other:'Otro'};
const paymentLabels = {paid:'Pagada',overdue:'Vencida sin pagar',pending:'Pendiente',nocharge:'Sin cobro'};
function classClock() {
  const date=new Date(),timeZone=S.settings.timezone;
  return {today:new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),time:new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)};
}
function paymentPill(row,compact=false) {
  const clock=classClock(),state=paymentState(row,clock.today,clock.time),label=paymentLabels[state];
  return `<button type="button" class="payment-pill ${state} ${compact?'compact':''}" data-action="payment" data-id="${esc(row.id)}" data-payment-state="${state}" aria-label="Pago de ${esc(row.studentName||fullname(studentBy(row.studentId)))}: ${label}. Registrar pago" title="${label} · ${paymentMethodNames[row.paymentMethod||'']}"><span aria-hidden="true">$</span>${compact?'':`<span>${label}</span>`}</button>`;
}
function findSession(id) { return [...(S.rows||[]),...(S.history||[])].find(r=>r.id===id); }
function validateSlot(v) {
  if(!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(v.time)||!Number.isInteger(v.duration)||v.duration<15||v.duration>720||v.duration%15) throw new Error('El inicio y la duración deben ser múltiplos de 15 minutos.');
  if(min(v.time)+v.duration>1440)throw new Error('La clase debe terminar el mismo día.');
}
function classTable(rows) {
  if(!rows.length)return empty('No hay clases en esta selección','Cambia el periodo o los filtros para consultar otras clases.');
  return `<div class="table-scroll"><table><thead><tr><th>Fecha y hora</th><th>Alumno / clase</th><th>Modalidad</th><th>Estado de clase</th><th>Pago</th><th>Método de pago</th><th>Tarifa</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.date,{day:'numeric',month:'short',year:'numeric'})}<div class="student-secondary">${r.time} – ${end(r)} · ${r.duration} min</div></td><td><a class="student-cell" href="#alumnos/${r.studentId}">${avatar(studentBy(r.studentId))}<div><div class="student-name">${esc(r.studentName||fullname(studentBy(r.studentId)))}</div><div class="student-secondary">${esc(r.title)}</div></div></a></td><td>${modalityBadge(r)}</td><td>${statusBadge(r)}</td><td>${paymentPill(r)}</td><td>${esc(paymentMethodNames[r.paymentMethod||''])}</td><td>${money(r.price)}</td><td><div class="row-actions"><button class="icon-button" data-action="edit-session" data-id="${esc(r.id)}" aria-label="Editar clase del ${r.date}">${icon('edit')}</button><button class="icon-button delete-class" data-action="delete-session" data-id="${esc(r.id)}" aria-label="Eliminar solo esta clase del ${r.date}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function renderClasses(data) {
  S.rows=data.rows;S.classPage=data.page;
  const f=S.classFilters;
  return heading('HISTORIAL Y SEGUIMIENTO DE PAGOS','Clases','Todas tus clases y sus pagos, sin tener que abrir cada alumno.',newClass())+
    `<div class="tabs">${[['past','Clases pasadas'],['future','Próximas clases'],['all','Todas']].map(([key,label])=>`<button class="tab ${S.classPeriod===key?'active':''}" data-action="class-period" data-period="${key}">${label}</button>`).join('')}</div>`+
    `<section class="panel"><form id="class-filters" class="class-filters">${inputField('from','Desde',f.from,'date','min="2000-01-01" max="2100-12-31"')}${inputField('to','Hasta',f.to,'date','min="2000-01-01" max="2100-12-31"')}${selectField('student','Alumno',f.student,[['','Todos los alumnos'],...S.students.map(s=>[s.id,fullname(s)])])}${selectField('payment','Pago',f.payment,[['all','Todos los pagos'],['paid','Pagadas'],['unpaid','Sin pagar'],['overdue','Vencidas sin pagar'],['pending','Pendientes futuras']])}${selectField('method','Método',f.method,[['','Todos los métodos'],...Object.entries(paymentMethodNames).filter(([key])=>key)])}${selectField('status','Estado de clase',f.status,[['','Todos los estados'],...Object.entries(classStatusNames)])}<div class="button-row"><button class="btn primary" type="submit">Aplicar filtros</button><button class="btn" type="button" data-action="class-clear">Limpiar</button></div></form></section>`+
    `<div class="stats payment-totals"><div class="stat-card"><div class="stat-top">Pagado</div><div class="stat-value">${money(data.totals.paid)}</div></div><div class="stat-card"><div class="stat-top">Vencido sin pagar</div><div class="stat-value">${money(data.totals.overdue)}</div></div><div class="stat-card"><div class="stat-top">Pendiente futuro</div><div class="stat-value">${money(data.totals.pending)}</div></div></div>`+
    `<section class="panel"><div class="panel-header"><h2>${data.total} clases</h2><span class="small-text muted">Totales de toda la selección · ${S.classPeriod==='past'?'Histórico completo':`Próximas hasta ${fmtDate(data.futureUntil,{day:'numeric',month:'short',year:'numeric'})}`}</span></div>${classTable(data.rows)}<div class="panel-header pagination"><button class="btn small" data-action="class-prev" ${data.page<=1?'disabled':''}>${icon('left')} Anterior</button><span class="muted small-text">Página ${data.page} de ${data.pages} · 50 por página</span><button class="btn small" data-action="class-next" ${data.page>=data.pages?'disabled':''}>Siguiente ${icon('right')}</button></div></section><p class="inline-help">Pulsa la pastilla $ para registrar el pago. Blanco: pendiente; verde: pagada; rojo: la clase terminó y sigue sin pagar. Las canceladas sin pago y las gratuitas no generan deuda.</p>`;
}

function layoutEvents(events) {
  const result=[]; let group=[], boundary=-1;
  function flush(){if(!group.length)return;const lanes=[];for(const row of group){let lane=lanes.findIndex(v=>v<=min(row.time));if(lane<0)lane=lanes.length;lanes[lane]=min(row.time)+row.duration;row.lane=lane;}for(const row of group)result.push({...row,lanes:lanes.length});group=[];boundary=-1;}
  for(const original of [...events].sort((a,b)=>min(a.time)-min(b.time))){const row={...original};if(min(row.time)>=boundary)flush();group.push(row);boundary=Math.max(boundary,min(row.time)+row.duration);}flush();return result;
}
function calendarGrid(rows) {
  const scale=calendarScale,height=1440*scale;
  const headers=Array.from({length:7},(_,i)=>{const d=plusDays(S.week,i);return `<div class="calendar-day ${d===S.today?'today':''}"><span>${shortDays[i]}</span><strong class="day-number">${Number(d.slice(-2))}</strong></div>`;}).join('');
  const labels=Array.from({length:24},(_,i)=>`<span class="hour-label" style="top:${i*60*scale}px">${String(i).padStart(2,'0')}:00</span>`).join('');
  const lines=Array.from({length:96},(_,i)=>`<span class="calendar-grid-line ${i%4===0?'hour':i%2===0?'half':'quarter'}" style="top:${i*15*scale}px"></span>`).join('');
  const lanes=Array.from({length:7},(_,i)=>{
    const date=plusDays(S.week,i),events=layoutEvents(rows.filter(r=>r.date===date));
    return `<div class="day-lane ${date===S.today?'today':''} ${i>4?'weekend':''}" data-date="${date}" style="height:${height}px">${events.map(r=>{
      const busy=r.kind==='busy',inline=r.duration<60;
      return `<div role="button" tabindex="0" class="calendar-event ${busy?'busy-event':r.status} ${inline?'inline-event':''} ${r.duration<=15?'short-event':''}" data-action="${busy?'edit-busy':'edit-session'}" data-id="${esc(r.id)}" style="--student:${busy?'#a9b0bc':esc(r.color)};top:${min(r.time)*scale}px;height:${r.duration*scale}px;left:calc(${r.lane*100/r.lanes}% + 3px);width:calc(${100/r.lanes}% - 6px);z-index:${r.lane+2}" title="${busy?`Ocupada · ${esc(r.title)}`:`${esc(r.studentName)} · ${esc(r.title)} · ${modalityNames[r.modality]}`} · ${r.time}–${end(r)}" aria-label="${busy?`Ocupada: ${esc(r.title)}`:esc(r.studentName)}, ${r.time}. Arrastra para mover o pulsa para editar."><span class="resize-handle start" data-resize="start" title="Ajustar inicio"></span><div class="event-top">${busy?`<span class="modality-icon busy" aria-hidden="true">${icon('clock')}</span>`:modalityIcon(r)}<span class="event-time">${r.time}${!inline&&r.duration>=90?` – ${end(r)}`:''}</span>${inline?`<span class="event-inline-name">${esc(busy?r.title:r.studentName)}</span>`:''}${busy?'':`<span class="event-actions">${classStatusPill(r,true)}${paymentPill(r,true)}</span>`}</div>${!inline?`<span class="event-name">${esc(busy?r.title:r.studentName)}</span>`:''}${r.duration>=90?`<span class="event-sub">${busy?'No disponible para clases':esc(r.title)}</span>`:''}<span class="resize-handle finish" data-resize="end" title="Ajustar fin"></span></div>`;
    }).join('')}</div>`;
  }).join('');
  return `<div class="calendar-scroll"><div class="calendar"><div class="calendar-days"><div></div>${headers}</div><div class="calendar-body" data-scale="${scale}"><div class="time-labels" style="height:${height}px">${labels}</div>${lanes}<div class="calendar-grid-lines" aria-hidden="true">${lines}</div></div></div></div>`;
}
function legend(rows) {
  const ids=[...new Set(rows.filter(r=>r.kind!=='busy').map(r=>r.studentId))];
  return `<div class="calendar-legend">${ids.slice(0,7).map(id=>{const s=studentBy(id);return `<a class="legend-item" href="#alumnos/${id}"><span class="color-dot" style="--student:${esc(s.color)}"></span>${esc(s.firstName)}</a>`;}).join('')}<span class="legend-spacer"></span>${Object.entries(modalityNames).map(([k,v])=>`<span class="legend-item">${modalityIcon({modality:k})}${v}</span>`).join('')}<span class="legend-item"><span class="modality-icon busy">${icon('clock')}</span>Ocupada</span></div>`;
}
function agenda(rows) {
  if(!rows.length)return empty('Una semana por escribir','Añade una clase o un bloqueo de disponibilidad para organizar tu semana.',newClass());
  return [...new Set(rows.map(r=>r.date))].map(date=>`<div class="agenda-day">${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}</div>${rows.filter(r=>r.date===date).map(r=>r.kind==='busy'?`<div class="agenda-item busy-agenda" role="button" tabindex="0" data-action="edit-busy" data-id="${esc(r.id)}"><div class="agenda-time">${r.time}<div class="student-secondary">${end(r)}</div></div><span class="modality-icon busy">${icon('clock')}</span><div class="agenda-info"><div class="student-name">${esc(r.title)}</div><div class="student-secondary">Ocupada · No disponible para clases</div></div><span class="badge">${r.duration} min</span>${icon('right')}</div>`:`<div class="agenda-item" role="button" tabindex="0" data-action="edit-session" data-id="${esc(r.id)}"><div class="agenda-time">${r.time}<div class="student-secondary">${end(r)}</div></div>${avatar(studentBy(r.studentId))}<div class="agenda-info"><div class="student-name">${esc(r.studentName)}</div><div class="student-secondary">${esc(r.title)} · ${r.duration} min</div></div>${modalityBadge(r)}${statusBadge(r)}${paymentPill(r)}<span class="price">${money(r.price)}</span>${icon('right')}</div>`).join('')}`).join('');
}
function renderCalendar(rows,report,blocks=[]) {
  S.rows=rows;S.busyBlocks=blocks;
  const events=[...rows,...blocks].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return heading('TU TIEMPO, CON INTENCIÓN','Calendario','Crea y organiza tus clases en intervalos de 15 minutos.',`<div class="button-row"><button class="btn busy-button" data-action="new-busy">${icon('clock')} Ocupada</button>${newClass()}</div>`)+summary(report)+`<section class="panel"><div class="panel-header">${weekControls()}<div class="view-toggle" aria-label="Vista del calendario"><button class="${S.calendarMode==='week'?'active':''}" aria-pressed="${S.calendarMode==='week'}" data-action="calendar-week">${icon('calendar')} Semana</button><button class="${S.calendarMode==='agenda'?'active':''}" aria-pressed="${S.calendarMode==='agenda'}" data-action="calendar-agenda">${icon('plan')} Agenda</button></div></div>${S.calendarMode==='week'?calendarGrid(events):agenda(events)}${legend(events)}<div class="payment-legend"><span><span class="payment-dot paid">$</span> Pagada</span><span><span class="payment-dot overdue">$</span> Vencida sin pagar</span><span><span class="payment-dot pending">$</span> Pendiente / sin cobro</span></div></section><p class="calendar-mobile-hint">Desliza horizontalmente para ver todos los días. También puedes usar la vista Agenda.</p><p class="inline-help">${icon('info')} Pulsa o arrastra un espacio vacío para crear una clase o marcarte ocupada. Arrastra los bloques para moverlos y sus bordes para ajustar su duración. Los bloqueos grises son recordatorios de indisponibilidad y no generan ingresos.</p>`;
}
function renderStudents() {
  return heading('PERSONAS QUE APRENDEN CONTIGO','Alumnos','Alumnos y contactos con los que estás conversando, en un mismo lugar.',`<button class="btn primary" data-action="new-student">${icon('plus')} Nuevo alumno</button>`)+`<div class="tabs student-status-tabs">${[['all','Todos'],['active','Activos'],['prospect','En conversación'],['inactive','Inactivos']].map(([key,label])=>`<button class="tab ${S.active===key?'active':''}" data-action="student-filter" data-status="${key}">${label} <span class="muted">(${S.students.filter(s=>key==='all'||studentStatus(s)===key).length})</span></button>`).join('')}</div><section class="panel"><div class="toolbar"><div class="search">${icon('search')}<input id="student-search" aria-label="Buscar alumnos" placeholder="Buscar por nombre, correo o teléfono…" value="${esc(S.search)}"></div><div class="button-row"><select id="student-channel" class="filter-select" aria-label="Filtrar por canal"><option value="all">Todos los canales</option>${Object.entries(channelNames).map(([v,l])=>`<option value="${v}" ${S.channel===v?'selected':''}>${l}</option>`).join('')}</select><select id="student-active" class="filter-select" aria-label="Filtrar por estado"><option value="all">Todos los alumnos</option><option value="active" ${S.active==='active'?'selected':''}>Activos</option><option value="prospect" ${S.active==='prospect'?'selected':''}>En conversación</option><option value="inactive" ${S.active==='inactive'?'selected':''}>Inactivos</option></select></div></div><div id="students-table"></div></section><p class="inline-help">Cada alumno tiene su propio color. Lo reconocerás también en el calendario.</p>`;
}
function fillStudentTable() {
  const q=S.search.trim().toLocaleLowerCase('es');
  const rows=S.students.filter(s=>(!q||[s.firstName,s.lastName,s.email,s.phone,s.messenger,s.notes].join(' ').toLocaleLowerCase('es').includes(q))&&(S.channel==='all'||s.channel===S.channel)&&(S.active==='all'||studentStatus(s)===S.active)).sort((a,b)=>fullname(a).localeCompare(fullname(b),'es'));
  const target=$('#students-table');if(!target)return;
  target.innerHTML=rows.length?`<div class="table-scroll"><table><thead><tr><th>Alumno</th><th>Contacto</th><th>Canal preferido</th><th>Planificación</th><th>Estado</th><th><span class="muted">Acciones</span></th></tr></thead><tbody>${rows.map(s=>`<tr><td><a href="#alumnos/${s.id}" class="student-cell">${avatar(s)}<div><div class="student-name">${esc(fullname(s))}</div><div class="student-secondary">Ver ficha del alumno</div></div></a></td><td>${esc(s.phone||'—')}<div class="student-secondary">${esc(s.email)}</div>${contactLinks(s)}</td><td>${channelBadge(s)}</td><td>${S.schedules.filter(p=>p.studentId===s.id&&p.active&&(!p.endDate||p.endDate>=S.today)&&(p.recurrence==='weekly'||p.startDate>=S.today)).length} horarios</td><td>${studentBadge(s)}</td><td><button class="icon-button" data-action="edit-student" data-id="${s.id}" aria-label="Editar ${esc(fullname(s))}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`:empty(S.students.length?'No hay coincidencias':'Aquí empieza cada nueva historia',S.students.length?'Prueba otra búsqueda o cambia los filtros.':'Crea la ficha de tu primer alumno y elige un color para identificar sus clases.',`<button class="btn primary" data-action="new-student">${icon('plus')} Nuevo alumno</button>`);
}
function scheduleTable(rows) {
  if(!rows.length)return empty('Todavía no hay horarios','Planifica una clase puntual o un horario que se repita cada semana.');
  return `<div class="table-scroll"><table><thead><tr><th>Clase / alumno</th><th>Día y horario</th><th>Repetición</th><th>Modalidad</th><th>Tarifa / sesión</th><th></th></tr></thead><tbody>${rows.map(p=>{const s=studentBy(p.studentId);return `<tr><td><div class="student-cell"><span class="color-dot" style="--student:${esc(s.color)}"></span><div><div class="student-name">${esc(p.title)}</div><a class="student-secondary" href="#alumnos/${s.id}">${esc(fullname(s))}</a></div></div></td><td>${p.recurrence==='once'?fmtDate(p.startDate):days[p.weekday]}<div class="student-secondary">${p.time} – ${end(p)} · ${p.duration} min</div></td><td><span class="badge">${icon(p.recurrence==='weekly'?'repeat':'calendar')}${p.recurrence==='weekly'?'Cada semana':'Una vez'}</span><div class="student-secondary">Desde ${fmtDate(p.startDate)}${p.endDate?` hasta ${fmtDate(p.endDate)}`:''}${!p.active?' · Pausada':''}</div></td><td>${modalityBadge(p)}</td><td>${money(p.price)}</td><td><div class="row-actions"><button class="icon-button" data-action="edit-schedule" data-id="${p.id}" aria-label="Editar planificación de ${esc(fullname(s))}">${icon('edit')}</button><button class="icon-button" data-action="delete-schedule" data-id="${p.id}" aria-label="Eliminar planificación de ${esc(fullname(s))}">${icon('trash')}</button></div></td></tr>`;}).join('')}</tbody></table></div>`;
}
function renderStudent(s,history) {
  const plans=S.schedules.filter(p=>p.studentId===s.id).sort((a,b)=>a.weekday-b.weekday||a.time.localeCompare(b.time));
  S.history=history;S.rows=history;
  return `<a href="#alumnos" class="back-link">${icon('left')} Todos los alumnos</a>`+`<div class="page-heading"><div class="student-hero">${avatar(s,true)}<div><div class="eyebrow">FICHA DEL ALUMNO</div><h1>${esc(fullname(s))}</h1>${studentBadge(s)}</div></div><div class="button-row"><button class="btn" data-action="edit-student" data-id="${s.id}">${icon('edit')} Editar alumno</button><button class="icon-button" data-action="delete-student" data-id="${s.id}" aria-label="Eliminar alumno">${icon('trash')}</button></div></div><div class="detail-grid"><section class="panel"><div class="panel-header"><h2>Información de contacto</h2>${channelBadge(s)}</div><div class="panel-body">${contactLinks(s)}<div class="info-grid"><div><div class="info-label">Teléfono</div><div class="info-value">${esc(s.phone||'Sin especificar')}</div></div><div><div class="info-label">Email</div><div class="info-value">${esc(s.email||'Sin especificar')}</div></div><div><div class="info-label">Messenger</div><div class="info-value">${esc(s.messenger||'Sin especificar')}</div></div><div><div class="info-label">Color en el calendario</div><div class="legend-item"><span class="color-dot" style="--student:${esc(s.color)}"></span><span class="small-text">${esc(s.color)}</span></div></div></div></div></section><section class="panel"><div class="panel-header"><h2>Notas generales</h2>${icon('plan')}</div><div class="panel-body"><div class="notes-text">${linkedNotes(s.notes||'Añade aquí objetivos, preferencias o cualquier detalle que quieras recordar.')}</div></div></section></div><div class="tabs"><button class="tab ${S.studentTab==='planning'?'active':''}" data-action="student-planning">Planificación <span class="muted">(${plans.length})</span></button><button class="tab ${S.studentTab==='history'?'active':''}" data-action="student-history">Clases pasadas <span class="muted">(${history.length})</span></button></div>${S.studentTab==='planning'?`<section class="panel"><div class="panel-header"><div><h2>Horarios de ${esc(s.firstName)}</h2><p class="subtitle small-text">Clases puntuales y horarios recurrentes.</p></div>${s.stage==='prospect'?`<button class="btn primary" data-action="edit-student" data-id="${s.id}">Activar como alumno</button>`:newClass(s.id)}</div>${s.stage==='prospect'?'<p class="panel-body muted">Contacto en conversación. Usa sus enlaces para continuar el seguimiento. Cuando confirme las clases, cambia su estado a Activo.</p>':scheduleTable(plans)}</section>`:`<section class="panel"><div class="panel-header"><h2>Historial de clases</h2><span class="muted small-text">Las clases pasadas conservan su tarifa y horario.</span></div>${classTable(history)}</section>`}`;
}
function renderPlanning(rows) {
  S.rows=rows;const visible=S.planDay===null?rows:rows.filter(r=>dayOf(r.date)===S.planDay);
  return heading('UNA BUENA SEMANA EMPIEZA AQUÍ','Planificación','Organiza los horarios y deja que las repeticiones hagan el resto.',newClass())+`<section class="panel"><div class="panel-header"><h2>Agenda de la semana</h2>${weekControls()}</div><div class="panel-body" style="padding-bottom:0"><div class="week-summary">${days.map((d,i)=>`<button class="week-chip ${S.planDay===i?'active':''}" data-action="plan-day" data-day="${i}"><span>${shortDays[i]}</span><strong>${rows.filter(r=>dayOf(r.date)===i&&r.status!=='cancelled').length}</strong><span>clases</span></button>`).join('')}</div>${S.planDay!==null?'<button class="text-button small-text" data-action="plan-all">Mostrar toda la semana</button>':''}</div>${agenda(visible)}</section><section class="panel"><div class="panel-header"><div><h2>Todas las planificaciones</h2><p class="subtitle small-text">Edita aquí la repetición. Los cambios conservan el historial.</p></div><span class="badge">${S.schedules.length} horarios</span></div>${scheduleTable([...S.schedules].sort((a,b)=>a.weekday-b.weekday||a.time.localeCompare(b.time)))}</section>`;
}
function renderReports(report) {
  const data=report[S.reportTab],max=Math.max(1,...data.students.map(s=>s.total));
  return heading('UNA MIRADA A TU ACTIVIDAD','Informes','Una previsión sencilla de tus clases e ingresos.',weekControls())+`<div class="report-cards">${[['current','Semana seleccionada'],['next','Semana siguiente']].map(([key,label])=>{const r=report[key];return `<section class="report-card ${key==='current'?'highlight':''}"><div class="eyebrow">${label}</div><h2>${range(r.start)}</h2><div class="report-total">${money(r.total)}</div><div class="report-meta"><span>${icon('calendar')}${r.count} clases</span><span>${icon('clock')}${num(r.hours)} horas</span><span>${r.cancelled} canceladas</span></div></section>`;}).join('')}</div><div class="tabs"><button class="tab ${S.reportTab==='current'?'active':''}" data-action="report-current">Semana seleccionada</button><button class="tab ${S.reportTab==='next'?'active':''}" data-action="report-next">Semana siguiente</button></div><section class="panel"><div class="panel-header"><h2>Ingresos estimados por alumno</h2><span class="muted small-text">${range(data.start)}</span></div>${data.students.length?`<div class="table-scroll"><table><thead><tr><th>Alumno</th><th>Clases</th><th>Horas</th><th>Distribución</th><th>Total estimado</th></tr></thead><tbody>${data.students.sort((a,b)=>b.total-a.total).map(s=>`<tr><td><a class="student-cell" href="#alumnos/${s.id}">${avatar(studentBy(s.id))}<span class="student-name">${esc(s.name)}</span></a></td><td>${s.count}</td><td>${num(s.minutes/60)}</td><td><div class="bar-track"><div class="bar-fill" style="--student:${s.color};width:${s.total/max*100}%"></div></div></td><td><strong>${money(s.total)}</strong></td></tr>`).join('')}</tbody></table></div>`:empty('Todavía no hay ingresos previstos','Añade clases con su tarifa para ver aquí la previsión semanal.')}</section><div class="notice">${icon('info')}<div>Los importes son una estimación: suman la tarifa por sesión de las clases programadas y realizadas. Las canceladas no se incluyen. No representan pagos recibidos.</div></div>`;
}
function inputField(name,label,value='',type='text',extra='',help='') { return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>${help?`<small>${help}</small>`:''}</div>`; }
function selectField(name,label,value,options,extra='') { return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}" ${extra}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`; }
function textField(name,label,value='',extra='') { return `<div class="field full"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" maxlength="6000" ${extra}>${esc(value)}</textarea></div>`; }
function renderSettings(backups) {
  const c=S.settings;
  return heading('A TU MANERA','Mi información','Los pequeños detalles que hacen de Amapola tu espacio.',`<button class="btn primary" type="submit" form="settings-form">${icon('check')} Guardar cambios</button>`)+`<div class="settings-grid"><nav class="settings-menu" aria-label="Secciones de configuración"><a href="#info-section" data-scroll="info-section">Mi información</a><a href="#appearance-section" data-scroll="appearance-section">Apariencia</a><a href="#backup-section" data-scroll="backup-section">Copias de seguridad</a></nav><div><form id="settings-form"><section class="panel settings-section" id="info-section"><div class="panel-header"><h2>Mi información</h2><span class="muted">${icon('users')}</span></div><div class="panel-body field-grid">${inputField('name','Mi nombre',c.name,'text','maxlength="200"')}${inputField('business','Nombre de mi espacio',c.business,'text','maxlength="200"')}${inputField('email','Email',c.email,'email','maxlength="254"')}${inputField('phone','Teléfono',c.phone,'tel','maxlength="60"')}${selectField('currency','Moneda',c.currency,[['COP','Peso colombiano · COP'],['EUR','Euro · EUR'],['CAD','Dólar canadiense · CAD'],['USD','Dólar estadounidense · USD'],['MXN','Peso mexicano · MXN'],['GBP','Libra esterlina · GBP']])}${inputField('timezone','Zona horaria',c.timezone,'text','required list="timezones"','Define el día actual y el comienzo del historial.')}<datalist id="timezones"><option value="America/Bogota"><option value="America/New_York"><option value="America/Toronto"><option value="Europe/Paris"><option value="Europe/Madrid"><option value="America/Mexico_City"></datalist>${textField('notes','Notas personales',c.notes)}<div class="field full"><small>La moneda se aplica a toda la aplicación. Cambiarla no convierte las tarifas existentes.</small></div></div></section><section class="panel settings-section" id="appearance-section"><div class="panel-header"><h2>Apariencia</h2>${icon('sun')}</div><div class="panel-body"><p class="subtitle" style="margin-bottom:17px">Elige cómo quieres ver tu espacio.</p><div class="theme-options">${[['light','sun','Claro'],['dark','moon','Oscuro'],['system','system','Sistema']].map(([v,ico,label])=>`<button type="button" class="theme-option ${theme===v?'active':''}" data-theme-choice="${v}">${icon(ico)}${label}</button>`).join('')}</div><p class="help-text">Esta preferencia se guarda en este navegador.</p></div></section><section class="panel settings-section" id="backup-section"><div class="panel-header"><div><h2>Copias de seguridad</h2><p class="subtitle small-text">Tus clases merecen estar bien guardadas.</p></div>${icon('cloud')}</div><div class="panel-body"><div class="notice">${icon('info')}<div>Se crean copias locales automáticamente después de los cambios. Conserva también una copia fuera de este ordenador.</div></div>${backups.error?`<div class="notice warning">${esc(backups.error)}</div>`:''}<div class="field-grid">${selectField('backupMode','Destino de la copia manual',c.backupMode,[['download','Descarga / copia local'],['folder','Carpeta sincronizada de kDrive'],['api','Envío directo a kDrive (API)']])}<div></div><div class="field full backup-folder ${c.backupMode==='folder'?'':'hide'}"><label for="backupFolder">Ruta completa de la carpeta sincronizada</label><input id="backupFolder" name="backupFolder" value="${esc(c.backupFolder)}" placeholder="C:\Usuarios\…\kDrive\Amapola"><small>La carpeta debe existir. Amapola confirma la copia local; verifica después la sincronización en kDrive.</small></div><div class="field backup-api ${c.backupMode==='api'?'':'hide'}"><label for="driveId">Identificador de kDrive</label><input id="driveId" name="driveId" inputmode="numeric" value="${esc(c.driveId)}" placeholder="123456"><small>El número que aparece después de /drive/ en kDrive.</small></div><div class="field backup-api ${c.backupMode==='api'?'':'hide'}"><label for="driveFolder">Carpeta en el espacio privado</label><input id="driveFolder" name="driveFolder" value="${esc(c.driveFolder)}" placeholder="Amapola/Copias"><small>Se crea si no existe. Sin barra inicial.</small></div></div><p class="help-text">Elige el destino y pulsa Guardar cambios antes de crear la copia. No necesitas cambiar ninguna fecha ni editar una clase.</p><div class="form-error" id="settings-error" role="alert"></div></div></section></form><section class="panel"><div class="panel-header"><h2>Crear o recuperar una copia</h2></div><div class="panel-body"><div class="field ${c.backupMode==='api'?'':'hide'}"><label for="api-token">Token API de Infomaniak</label><input id="api-token" type="password" autocomplete="off" placeholder="Se utiliza una sola vez y no se guarda"><small>Crea un token con permiso de escritura en kDrive. No introduzcas tu contraseña de cuenta.</small></div><div class="backup-actions"><button class="btn primary" data-action="backup-send">${icon(c.backupMode==='download'?'download':'cloud')}${c.backupMode==='download'?'Descargar copia':c.backupMode==='api'?'Enviar a kDrive':'Copiar a carpeta kDrive'}</button>${c.backupMode!=='download'?`<button class="btn" data-action="backup-local">${icon('download')} Descargar copia local</button>`:''}<label for="restore-file" class="btn file-label">${icon('repeat')} Restaurar una copia</label><input id="restore-file" type="file" accept=".amapola" class="file-input"></div><ol class="backup-instructions"><li>Para guardar: configura el destino y pulsa <strong>Descargar copia</strong>. Conserva el archivo .amapola también en un USB u otro lugar fuera de este PC.</li><li>Para otro PC: extrae la aplicación, abre Amapola y usa <strong>Restaurar una copia</strong>. Selecciona el archivo .amapola y escribe RESTAURAR. Se reemplazarán los datos de ese PC.</li></ol><p class="small-text muted">Las copias incluyen alumnos, contactos en conversación, notas y enlaces, planificaciones, historial, estados de clase, pagos y métodos, sesiones eliminadas, bloques Ocupada y configuración. No tienen contraseña propia: guárdalas en un lugar privado. El token API no se incluye.</p><div class="info-label" style="margin-top:22px">Datos en este ordenador</div><div class="storage-path">${esc(S.dataDir)}</div></div><div class="panel-header" style="border-top:1px solid var(--line)"><h3>Copias locales recientes</h3><span class="small-text muted">${backups.files.length} disponibles</span></div>${backups.files.length?`<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Tamaño</th><th></th></tr></thead><tbody>${backups.files.slice(0,10).map(b=>`<tr><td>${esc(new Date(b.modifiedAt).toLocaleString('es-CO'))}</td><td><span class="badge">${b.filename.includes('-auto-')?'Automática':b.filename.includes('-antes-de-')?'Antes de un cambio':'Manual'}</span></td><td>${num(b.size/1024)} KB</td><td><a class="text-button" href="/api/backups/file/${encodeURIComponent(b.filename)}" download>Descargar</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="panel-body small-text muted">Las primeras copias aparecerán después de guardar tus datos.</div>'}</section></div></div>`;
}
async function render() {
  const ticket=++S.renderId, hash=location.hash.slice(1)||'calendario', [page,id]=hash.split('/');
  const names={calendario:'Calendario',alumnos:'Alumnos',clases:'Clases',planificacion:'Planificación',informes:'Informes',ajustes:'Mi información'};
  if(!names[page]){location.hash='calendario';return;}
  $$('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===page));$('#page-name').textContent=names[page];document.title=`${names[page]} · Amapola`;
  const oldScroll=$('.calendar-scroll')?.scrollTop;
  try {
    let html;
    if(page==='calendario'){const [rows,report,blocks]=await Promise.all([api(`/api/occurrences?from=${S.week}&to=${plusDays(S.week,6)}`),api(`/api/reports?week=${S.week}`),api(`/api/busy-blocks?from=${S.week}&to=${plusDays(S.week,6)}`)]);if(ticket!==S.renderId)return;html=renderCalendar(rows,report,blocks);}
    if(page==='alumnos'&&!id)html=renderStudents();
    if(page==='alumnos'&&id){const s=studentBy(id);if(!s){location.hash='alumnos';return;}const history=await api(`/api/students/${encodeURIComponent(id)}/history`);if(ticket!==S.renderId)return;html=renderStudent(s,history);}
    if(page==='clases'){const query=new URLSearchParams({...S.classFilters,period:S.classPeriod,page:S.classPage});const data=await api(`/api/classes?${query}`);if(ticket!==S.renderId)return;html=renderClasses(data);}
    if(page==='planificacion'){const rows=await api(`/api/occurrences?from=${S.week}&to=${plusDays(S.week,6)}`);if(ticket!==S.renderId)return;html=renderPlanning(rows);}
    if(page==='informes'){const report=await api(`/api/reports?week=${S.week}`);if(ticket!==S.renderId)return;html=renderReports(report);}
    if(page==='ajustes'){const backups=await api('/api/backups');if(ticket!==S.renderId)return;html=renderSettings(backups);}
    disposeCalendar();$('#main').innerHTML=html;fillStudentTable();
    if($('#student-search'))$('#student-search').addEventListener('input',ev=>{S.search=ev.target.value;fillStudentTable();});
    if($('#student-channel'))$('#student-channel').addEventListener('change',ev=>{S.channel=ev.target.value;fillStudentTable();});
    if($('#student-active'))$('#student-active').addEventListener('change',ev=>{S.active=ev.target.value;render();});
    if($('#settings-form'))$('#settings-form').addEventListener('submit',saveSettings);
    if($('#class-filters'))$('#class-filters').addEventListener('submit',ev=>{ev.preventDefault();const filters=formData(ev.target);if(filters.from&&filters.to&&filters.from>filters.to){toast('La fecha final debe ser posterior al inicio.',true);return;}S.classFilters=filters;S.classPage=1;render();});
    if($('#backupMode'))$('#backupMode').addEventListener('change',ev=>{$$('.backup-api').forEach(e=>e.classList.toggle('hide',ev.target.value!=='api'));$$('.backup-folder').forEach(e=>e.classList.toggle('hide',ev.target.value!=='folder'));});
    if($('#restore-file'))$('#restore-file').addEventListener('change',ev=>{const file=ev.target.files[0];if(file)previewRestore(file);});
    if($('.calendar-scroll')){
      $('.calendar-scroll').scrollTop=oldScroll??7.5*60*calendarScale;
      disposeCalendar=attachCalendarGestures($('.calendar-body'),{rows:[...S.rows,...S.busyBlocks],onCreate:seed=>calendarCreateModal(seed),onChange:(row,change)=>row.kind==='busy'?busyModal(row.id,change):chooseScope(row,{...row,...change})});
    }
  } catch(e){if(ticket===S.renderId){disposeCalendar();$('#main').innerHTML=empty('No se pudo abrir esta vista',esc(e.message),page==='clases'?'<button class="btn" data-action="class-clear">Restablecer filtros</button>':'<button class="btn" data-action="retry">Reintentar</button>');toast(e.message,true);}}
}
function modal(title,subtitle,body,footer,submit) {
  const dialog=$('#dialog');
  $('#dialog-content').innerHTML=`<form id="modal-form"><div class="dialog-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Cerrar">${icon('close')}</button></div><div class="dialog-body">${body}<div id="modal-error" class="form-error" role="alert"></div></div><div class="dialog-footer">${footer}</div></form>`;
  dialog.setAttribute('aria-labelledby','dialog-title');
  $('#modal-form').addEventListener('submit',async ev=>{ev.preventDefault();const button=$('#modal-form button[type=submit]');if(button)button.disabled=true;$('#modal-error').textContent='';try{await submit(ev.target);}catch(e){if($('#modal-error'))$('#modal-error').textContent=e.message;else toast(e.message,true);}finally{if(button)button.disabled=false;}});
  if(!dialog.open)dialog.showModal();
}
const cancelBtn='<button class="btn" type="button" data-action="close-dialog">Cancelar</button>';
const submitBtn=label=>`<button type="submit" class="btn primary">${label}</button>`;
const formData=form=>Object.fromEntries(new FormData(form));
function conflictMarkup(result, accepted=false) {
  if(!result.total)return `<p class="overlap-clear">${icon('check')} Sin solapamientos${result.recurring?' en la planificación':''}.</p>`;
  return `<div class="overlap-notice"><strong>${icon('info')} Cuidado: este horario coincide con ${result.total} ${result.total===1?'actividad':'actividades'}.</strong><ul>${result.conflicts.map(r=>`<li><strong>${esc(r.kind==='busy'?`Ocupada: ${r.title}`:`Clase con ${r.studentName}`)}</strong><span>${fmtDate(r.date,{day:'numeric',month:'short',year:'numeric'})} · ${r.time} - ${end(r)}${r.kind==='busy'?'':` · ${esc(r.title)}`}</span></li>`).join('')}</ul>${result.total>result.conflicts.length?`<p>Se muestran las primeras ${result.conflicts.length} coincidencias.</p>`:''}${result.recurring?'<p>Se comprueban todas las repeticiones de la planificación.</p>':''}<label class="checkbox-field"><input type="checkbox" name="overlapAccepted" ${accepted?'checked':''}>Quiero guardar aunque haya solapamientos.</label></div>`;
}
function setupConflicts(kind,id,readValue) {
  const form=$('#modal-form');if(!form?.elements)return;
  const region=document.createElement('div');region.className='overlap-region';region.setAttribute('role','status');region.setAttribute('aria-live','polite');
  $('#modal-error').before(region);
  let timer, serial=0, lastKey='', lastSignature='';
  async function check(force=false) {
    const value=readValue(form),key=JSON.stringify(value);
    const accepted=!!form.elements.overlapAccepted?.checked&&key===lastKey;
    const ticket=++serial;
    const result=await api('/api/conflicts','POST',{kind,id,value});
    if(ticket!==serial||!form.isConnected)return false;
    const signature=JSON.stringify(result);
    const confirmed=accepted&&lastSignature===signature;
    lastKey=key;lastSignature=signature;
    region.innerHTML=conflictMarkup(result,confirmed);
    if(force&&result.total&&!confirmed)throw new Error('Revisa las coincidencias y marca la confirmación para guardar este horario.');
    return true;
  }
  form.checkConflicts=()=>{clearTimeout(timer);return check(true);};
  const changed=ev=>{
    if(ev?.target?.name==='overlapAccepted')return;
    clearTimeout(timer);serial++;lastKey='';
    region.textContent='Comprobando disponibilidad…';
    timer=setTimeout(async()=>{
      if(!form.isConnected)return;
      try{if(!form.checkValidity()){region.textContent='Completa la fecha y el horario para comprobar la disponibilidad.';return;}await check();}
      catch(error){if(form.isConnected)region.textContent=error.message;}
    },250);
  };
  form.addEventListener('input',changed);form.addEventListener('change',changed);changed();
}
async function confirmConflicts(form) {
  if(!form.checkConflicts||!await form.checkConflicts())throw new Error('El horario cambió durante la comprobación. Revisa los datos y vuelve a guardar.');
}
function scheduleDraft(form,p,id) {
  const v=formData(form);v.studentId=id?p.studentId:form.elements.studentId.value;
  v.duration=Number(v.duration);v.weekday=Number(v.weekday);v.price=parsePrice(v.price);validateSlot(v);v.active=id?form.elements.active.checked:true;
  if(v.recurrence==='once'){v.weekday=dayOf(v.startDate);v.endDate='';}
  delete v.overlapAccepted;return v;
}
function sessionDraft(form,row) { const v=formData(form);v.studentId=row.studentId;v.duration=Number(v.duration);v.price=parsePrice(v.price);validateSlot(v);delete v.overlapAccepted;return v; }
function busyDraft(form) { const v=formData(form);v.duration=Number(v.duration);validateSlot(v);delete v.overlapAccepted;return v; }
function studentModal(id) {
  const s=id?studentBy(id):{firstName:'',lastName:'',channel:'whatsapp',phone:'',email:'',messenger:'',notes:'',color:palette[S.students.length%palette.length],active:1,stage:S.active==='prospect'?'prospect':'student'};
  modal(id?'Editar alumno':'Un nuevo alumno','Guarda también los contactos que todavía están decidiendo si tomar clases.',`<div class="field-grid">${inputField('firstName','Nombre *',s.firstName,'text','required maxlength="100" autocomplete="given-name"')}${inputField('lastName','Apellidos',s.lastName,'text','maxlength="150" autocomplete="family-name"')}${selectField('channel','Canal de comunicación preferido',s.channel,Object.entries(channelNames))}${inputField('phone','Teléfono / WhatsApp',s.phone,'tel','maxlength="60" autocomplete="tel"','Para abrir WhatsApp, incluye + y el código de país (por ejemplo +57).')}${inputField('email','Email',s.email,'email','maxlength="254" autocomplete="email"')}${inputField('messenger','Nombre o enlace de Messenger',s.messenger,'text','maxlength="200"')}${selectField('studentState','Estado de seguimiento',studentStatus(s),Object.entries(studentStatusNames))}${textField('notes','Notas y enlaces de seguimiento',s.notes)}<div class="field full"><label for="color">Color en el calendario</label><div class="color-choices">${palette.map(c=>`<button type="button" class="color-choice ${s.color===c?'selected':''}" data-color="${c}" style="--student:${c}" aria-label="Elegir color ${c}"></button>`).join('')}<input type="color" id="color" name="color" value="${s.color}" aria-label="Color personalizado"></div></div></div><p class="help-text">En conversación: contacto potencial pendiente de seguimiento. Activo: alumno que toma clases. Inactivo: alumno que ya no toma clases. Solo los activos muestran futuras clases recurrentes; el historial se conserva. Pega enlaces completos de Messenger, Instagram u otros chats; los enlaces de las notas se pueden abrir desde la ficha.</p>`,cancelBtn+submitBtn(id?'Guardar cambios':'Crear alumno'),async form=>{
    const v=formData(form);v.stage=v.studentState==='prospect'?'prospect':'student';v.active=v.studentState==='active';delete v.studentState;
    const row=await api(id?`/api/students/${id}`:'/api/students',id?'PUT':'POST',v);$('#dialog').close();await refresh();if(!id){S.studentTab='planning';location.hash=`alumnos/${row.id}`;}await render();toast(row.stage==='prospect'?'Contacto guardado en En conversación.':id?'Alumno actualizado.':'Alumno creado. Ahora puedes planificar sus clases.');
  });
  $$('[data-color]',$('#dialog')).forEach(b=>b.addEventListener('click',()=>{$('#color').value=b.dataset.color;$$('[data-color]').forEach(c=>c.classList.toggle('selected',c===b));}));
  $('#color').addEventListener('input',()=>$$('[data-color]').forEach(c=>c.classList.toggle('selected',c.dataset.color===$('#color').value)));
}
function scheduleModal(id,studentId,seed={}) {
  const active=S.students.filter(s=>s.active);
  if(!active.length&&!id){toast('Primero crea o activa un alumno.');studentModal();return;}
  const p=id?S.schedules.find(s=>s.id===id):{studentId:studentId||active[0]?.id,title:'Clase particular',weekday:dayOf(seed.date||S.today),time:seed.time||'09:00',duration:seed.duration||60,price:0,modality:'online',recurrence:'weekly',startDate:seed.date||S.today,endDate:'',notes:'',active:1};
  if(!p)return;
  const start=id&&p.startDate<S.today?S.today:p.startDate;
  modal(id?'Editar planificación':'Planificar una clase',id?'Se conservan las clases pasadas y las sesiones modificadas individualmente.':'Un horario claro, una semana más ligera.',`<div class="field-grid">${selectField('studentId','Alumno *',p.studentId,(id?S.students:active).map(s=>[s.id,fullname(s)]),id?'disabled':'required')}${inputField('title','Nombre de la clase *',p.title,'text','required maxlength="150"')}${selectField('recurrence','Repetición',p.recurrence,[['weekly','Cada semana'],['once','No repetir · una sola sesión']])}${selectField('weekday','Día de la semana',p.weekday,days.map((d,i)=>[i,d]))}${inputField('startDate',id?'Aplicar a partir del *':'Fecha de inicio *',start,'date',`required ${id?`min="${S.today}"`:''} max="2100-12-31"`)}${inputField('endDate','Fecha de fin (opcional)',p.endDate,'date','max="2100-12-31"')}${inputField('time','Hora de inicio *',p.time,'time','required step="900"')}${inputField('duration','Duración en minutos *',p.duration,'number','required min="15" max="720" step="15"')}${inputField('price',`Tarifa por sesión (${S.settings.currency}) *`,priceInput(p.price),'text','required inputmode="decimal"','Importe total de la clase; no es una tarifa por hora.')}${selectField('modality','Modalidad',p.modality,[['online','En línea · ordenador'],['home','Presencial · en mi espacio'],['travel','A domicilio · me desplazo']])}${textField('notes','Notas de la planificación',p.notes,'maxlength="4000"')}${id?`<label class="checkbox-field"><input type="checkbox" name="active" ${p.active?'checked':''}>Planificación activa</label>`:''}</div><p class="help-text">En una repetición semanal, la primera clase será el día elegido a partir de la fecha de inicio.</p>`,cancelBtn+submitBtn(id?'Guardar planificación':'Crear planificación'),async form=>{
    const v=scheduleDraft(form,p,id);
    await confirmConflicts(form);
    await api(id?`/api/schedules/${id}`:'/api/schedules',id?'PUT':'POST',v);$('#dialog').close();await refresh();await render();toast('Planificación guardada.');
  });
  const toggle=()=>{const once=$('#recurrence').value==='once';$('#weekday').disabled=once;$('#endDate').disabled=once;};$('#recurrence').addEventListener('change',toggle);toggle();
  setupConflicts('schedule',id,form=>scheduleDraft(form,p,id));
}
function sessionModal(id) {
  const r=findSession(id);if(!r)return;
  modal('Detalles de la clase',esc(r.studentName||fullname(studentBy(r.studentId))),`<div class="field-grid">${inputField('title','Nombre de la clase',r.title,'text','required maxlength="150"')}${selectField('status','Estado de clase',r.status,Object.entries(classStatusNames))}${inputField('date','Fecha',r.date,'date','required min="2000-01-01" max="2100-12-31"')}${inputField('time','Hora de inicio',r.time,'time','required step="900"')}${inputField('duration','Duración (minutos, de 15 en 15)',r.duration,'number','required min="15" max="720" step="15"')}${inputField('price',`Tarifa de esta sesión (${S.settings.currency})`,priceInput(r.price),'text','required inputmode="decimal"')}${selectField('modality','Modalidad',r.modality,Object.entries(modalityNames))}<div></div>${selectField('paymentStatus','Estado de pago',r.paymentStatus||'unpaid',[['unpaid','Sin pagar'],['paid','Pagada']])}${selectField('paymentMethod','Método de pago',r.paymentMethod||'',Object.entries(paymentMethodNames))}${textField('notes','Notas de la sesión',r.notes,'maxlength="4000"')}</div><p class="help-text">Si cambias el horario, la duración o los detalles, podrás elegir el alcance antes de guardar. El pago y el estado de clase se registran siempre por sesión. El precio no se recalcula al cambiar la duración.</p>`,`<button type="button" class="btn danger" data-action="delete-session" data-id="${esc(id)}">${icon('trash')} Eliminar esta sesión</button>`+cancelBtn+submitBtn('Guardar cambios'),async form=>{
    const v=sessionDraft(form,r);
    if(v.paymentStatus==='paid'&&!v.paymentMethod)throw new Error('Selecciona el método de pago.');
    const changed=['title','date','time','duration','price','modality','notes'].some(key=>v[key]!==r[key]);
    if(changed){chooseScope(r,v);return;}
    await confirmConflicts(form);
    await api(`/api/sessions/${encodeURIComponent(id)}`,'PUT',v);$('#dialog').close();await refresh();await render();toast('Clase actualizada.');
  });
  setupConflicts('session',id,form=>sessionDraft(form,r));
}
function chooseScope(row,draft) {
  const rule=S.schedules.find(s=>s.id===row.scheduleId),clock=classClock();
  const started=row.date<clock.today||(row.date===clock.today&&row.time<clock.time);
  const targetPast=draft.date<clock.today||(draft.date===clock.today&&draft.time<clock.time);
  const following=rule?.active&&rule.recurrence==='weekly'&&row.originalDate>=clock.today&&!started&&!targetPast;
  modal('¿A qué clases se aplica el cambio?',esc(row.studentName||fullname(studentBy(row.studentId))),`<div class="change-summary"><strong>${fmtDate(draft.date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${draft.time} – ${end(draft)} · ${draft.duration} minutos</span></div><fieldset class="scope-choices"><legend>Aplicar el cambio a</legend><label><input type="radio" name="scope" value="session" checked><span><strong>Solo esta sesión</strong><small>Las demás clases mantienen su planificación.</small></span></label><label class="${following?'':'unavailable'}"><input type="radio" name="scope" value="following" ${following?'':'disabled'}><span><strong>Esta y las siguientes de la planificación</strong><small>${following?'Se actualiza el horario semanal a partir de esta clase. El historial y las excepciones individuales se conservan.':'Disponible para clases recurrentes que todavía no han comenzado y no se mueven al pasado.'}</small></span></label></fieldset><p class="help-text">El importe por sesión se conserva al mover o ajustar la duración. Los pagos existentes se mantienen y nunca se aplican automáticamente a otras clases.</p>`,cancelBtn+submitBtn('Confirmar cambio'),async form=>{
    validateSlot(draft);
    await confirmConflicts(form);
    await api(`/api/sessions/${encodeURIComponent(row.id)}/change`,'PUT',{...draft,scope:form.elements.scope.value});
    $('#dialog').close();await refresh();await render();toast('Cambio guardado.');
  });
  setupConflicts('session',row.id,form=>({...draft,scope:form.elements.scope.value}));
}
function paymentModal(id) {
  const row=findSession(id);if(!row)return;
  modal('Registrar pago',`${esc(row.studentName||fullname(studentBy(row.studentId)))} · ${fmtDate(row.date)} · ${row.time}`,`<p class="payment-amount">${money(row.price)}</p><div class="field-grid">${selectField('paymentStatus','Estado de pago',row.paymentStatus||'unpaid',[['unpaid','Sin pagar'],['paid','Pagada']])}${selectField('paymentMethod','Método de pago',row.paymentMethod||'',Object.entries(paymentMethodNames))}</div><p class="help-text">Este pago corresponde únicamente a esta sesión. También puedes registrar un pago anticipado de una clase futura.</p>`,cancelBtn+submitBtn('Guardar pago'),async form=>{
    const v=formData(form);if(v.paymentStatus==='paid'&&!v.paymentMethod)throw new Error('Selecciona el método de pago.');
    await api(`/api/sessions/${encodeURIComponent(id)}/payment`,'PUT',v);$('#dialog').close();await refresh();await render();toast('Pago actualizado.');
  });
}

function calendarCreateModal(seed) {
  S.calendarSeed=seed;
  modal('¿Qué quieres añadir?',`${fmtDate(seed.date,{weekday:'long',day:'numeric',month:'long'})} · ${seed.time} – ${end(seed)}`,`<div class="calendar-create-choices"><button type="button" class="create-choice" data-action="calendar-create-class">${icon('calendar')}<strong>Clase</strong><span>Una sesión o una planificación semanal con un alumno.</span></button><button type="button" class="create-choice busy-choice" data-action="calendar-create-busy">${icon('clock')}<strong>Ocupada</strong><span>Reservar este horario para una pausa, una cita o un compromiso personal.</span></button></div>`,cancelBtn,async()=>{});
}
function busyModal(id,seed={}) {
  const old=id?S.busyBlocks.find(b=>b.id===id):{title:'Ocupada',date:S.today,time:'09:00',duration:60,notes:''};
  if(!old)return;
  const b={...old,...seed};
  modal(id?'Editar bloqueo de disponibilidad':'Marcar como ocupada','Este bloque es un recordatorio; no tiene alumno, tarifa ni pago.',`<div class="field-grid">${inputField('title','Título',b.title,'text','required maxlength="150"')}${inputField('date','Fecha',b.date,'date','required min="2000-01-01" max="2100-12-31"')}${inputField('time','Hora de inicio',b.time,'time','required step="900"')}${inputField('duration','Duración (minutos)',b.duration,'number','required min="15" max="720" step="15"')}${textField('notes','Notas',b.notes,'maxlength="4000"')}</div><p class="help-text">Se muestra en gris claro en las vistas Semana y Agenda. Puedes moverlo y ajustar su duración desde el calendario.</p>`,(id?`<button type="button" class="btn danger" data-action="delete-busy" data-id="${id}">${icon('trash')} Eliminar</button>`:'')+cancelBtn+submitBtn('Guardar bloqueo'),async form=>{
    const v=busyDraft(form);
    await confirmConflicts(form);
    await api(id?`/api/busy-blocks/${encodeURIComponent(id)}`:'/api/busy-blocks',id?'PUT':'POST',v);
    $('#dialog').close();await refresh();await render();toast('Bloque de disponibilidad guardado.');
  });
  setupConflicts('busy',id,busyDraft);
}
function deleteBusy(id) {
  confirmAction('¿Eliminar este bloqueo?','Se eliminará este recordatorio de indisponibilidad. Se crea antes una copia de seguridad.','Eliminar bloqueo',async()=>{
    await api(`/api/busy-blocks/${encodeURIComponent(id)}`,'DELETE',{confirm:true});await refresh();await render();toast('Bloque eliminado.');
  },true);
}

function confirmAction(title,message,label,callback,danger=false) {
  modal(title,'',`<p class="small-text">${message}</p>`,cancelBtn+`<button type="submit" class="btn ${danger?'danger':'primary'}">${label}</button>`,async()=>{await callback();$('#dialog').close();});
}
function deleteSession(id) {
  const row=findSession(id);if(!row)return;
  const name=esc(row.studentName||fullname(studentBy(row.studentId)));
  confirmAction('¿Eliminar solo esta sesión?',`Se eliminará la clase de <strong>${name}</strong> del ${fmtDate(row.date)} a las ${row.time}. Las demás sesiones y la planificación se conservan.${row.paymentStatus==='paid'?'<br><br>Esta clase tiene un pago registrado; también dejará de aparecer en los totales de pago.':''}<br><br>Se guarda una copia de seguridad antes de eliminar.`,'Eliminar esta sesión',async()=>{
    await api(`/api/sessions/${encodeURIComponent(id)}`,'DELETE',{confirm:true});await refresh();await render();toast('Sesión eliminada. Las demás clases se conservan.');
  },true);
}
function deleteStudent(id) {
  const s=studentBy(id);confirmAction('¿Eliminar este alumno?',`Se eliminarán <strong>${esc(fullname(s))}</strong>, sus planificaciones y todo su historial. Esta acción no se puede deshacer desde la ficha. Se creará una copia de seguridad antes de eliminarlo.<br><br>Si quieres conservar el historial, puedes desactivar al alumno desde «Editar alumno».`,'Eliminar alumno',async()=>{await api(`/api/students/${id}`,'DELETE',{confirm:true});await refresh();location.hash='alumnos';await render();toast('Alumno eliminado.');},true);
}
function deleteSchedule(id) {confirmAction('¿Eliminar esta planificación?','Se eliminarán las próximas sesiones no realizadas de este horario. Las sesiones pasadas y las ya realizadas se conservan en el historial. Se creará una copia de seguridad antes del cambio.','Eliminar planificación',async()=>{await api(`/api/schedules/${id}`,'DELETE',{confirm:true});await refresh();await render();toast('Planificación eliminada.');},true);}
async function saveSettings(ev) {
  ev.preventDefault();const form=ev.target,v=formData(form);const button=$('button[form="settings-form"]');button.disabled=true;
  try {
    if(v.currency!==S.settings.currency&&S.schedules.length){const accepted=await new Promise(resolve=>{modal('Cambiar la moneda','Las tarifas no se convierten automáticamente.',`<p class="small-text">Todos los importes pasarán a mostrarse en ${esc(v.currency)} conservando sus valores numéricos. Revisa tus tarifas después del cambio.</p>`,cancelBtn+submitBtn('Cambiar moneda'),async()=>{$('#dialog').close();resolve(true);});$('#dialog').addEventListener('close',()=>resolve(false),{once:true});});if(!accepted)return;}
    await api('/api/settings','PUT',v);await refresh();await render();toast('Configuración guardada.');
  }catch(e){if($('#settings-error'))$('#settings-error').textContent=e.message;toast(e.message,true);}finally{button.disabled=false;}
}
function download(filename){const a=document.createElement('a');a.href=`/api/backups/file/${encodeURIComponent(filename)}`;a.download=filename;document.body.append(a);a.click();a.remove();}
async function createBackup(local=false,button) {
  button.disabled=true;const original=button.innerHTML;button.textContent='Creando copia…';
  const token=$('#api-token')?.value||'';if($('#api-token'))$('#api-token').value='';
  try{const result=await api(local?'/api/backups/local':'/api/backups','POST',local?{}:{token});if(local||S.settings.backupMode==='download')download(result.filename);toast(result.message||'Copia lista para descargar.');await render();}catch(e){toast(e.message,true);}finally{button.disabled=false;button.innerHTML=original;}
}
async function previewRestore(file) {
  try{
    if(file.size>16*1024*1024)throw new Error('La copia supera el límite de 16 MB comprimidos.');
    const summary=await api('/api/restore/preview','POST',file,{'Content-Type':'application/octet-stream'});
    modal('Restaurar una copia','Se reemplazarán los datos actuales.',`<div class="notice warning">${icon('info')}<span>La copia contiene ${summary.students} alumnos, ${summary.schedules} planificaciones y ${summary.sessions} sesiones guardadas y ${summary.busyBlocks||0} bloqueos de disponibilidad. Las futuras sesiones recurrentes se regeneran a partir de la planificación.</span></div><p class="small-text">Se guardará una copia de los datos actuales antes de restaurar.</p>${inputField('confirmation','Escribe RESTAURAR para confirmar','','text','required autocomplete="off"')}`,cancelBtn+submitBtn('Restaurar datos'),async form=>{if(form.elements.confirmation.value!=='RESTAURAR')throw new Error('Escribe RESTAURAR exactamente.');await api('/api/restore','POST',file,{'Content-Type':'application/octet-stream','X-Amapola-Confirm':'RESTAURAR'});$('#dialog').close();await refresh();await render();toast('Datos restaurados.');});
  }catch(e){toast(e.message,true);}
}
document.addEventListener('click',async ev=>{
  const themeChoice=ev.target.closest('[data-theme-choice]');if(themeChoice){applyTheme(themeChoice.dataset.themeChoice);return;}
  const scroll=ev.target.closest('[data-scroll]');if(scroll){ev.preventDefault();document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:'smooth'});return;}
  const b=ev.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action,id=b.dataset.id;
  try{
    if(action==='close-dialog')$('#dialog').close();
    if(action==='payment')paymentModal(id);
    if(action==='class-status')await cycleClassStatus(id,b);
    if(action==='delete-session')deleteSession(id);
    if(action==='new-busy')busyModal();if(action==='edit-busy')busyModal(id);if(action==='delete-busy')deleteBusy(id);
    if(action==='calendar-create-class')scheduleModal(null,null,S.calendarSeed);if(action==='calendar-create-busy')busyModal(null,S.calendarSeed);
    if(action==='class-period'){S.classPeriod=b.dataset.period;S.classPage=1;await render();}
    if(action==='class-clear'){S.classFilters={from:'',to:'',student:'',payment:'all',method:'',status:''};S.classPage=1;await render();}
    if(action==='class-prev'||action==='class-next'){S.classPage+=action==='class-prev'?-1:1;await render();}
    if(action==='student-filter'){S.active=b.dataset.status;await render();}
    if(action==='new-student')studentModal();if(action==='edit-student')studentModal(id);if(action==='delete-student')deleteStudent(id);
    if(action==='new-schedule')scheduleModal(null,b.dataset.student);if(action==='edit-schedule')scheduleModal(id);if(action==='delete-schedule')deleteSchedule(id);if(action==='edit-session')sessionModal(id);
    if(action==='prev-week'||action==='next-week'||action==='today'){S.week=action==='today'?weekOf(S.today):plusDays(S.week,action==='prev-week'?-7:7);S.planDay=null;await render();}
    if(action==='calendar-week'||action==='calendar-agenda'){S.calendarMode=action==='calendar-week'?'week':'agenda';await render();}
    if(action==='plan-day'||action==='plan-all'){S.planDay=action==='plan-all'?null:Number(b.dataset.day);await render();}
    if(action==='student-planning'||action==='student-history'){S.studentTab=action==='student-planning'?'planning':'history';await render();}
    if(action==='report-current'||action==='report-next'){S.reportTab=action==='report-current'?'current':'next';await render();}
    if(action==='backup-send'||action==='backup-local')await createBackup(action==='backup-local',b);
    if(action==='retry'){await refresh();await render();}
  }catch(e){toast(e.message,true);}
});
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('.agenda-item,.calendar-event')){ev.preventDefault();ev.target.click();}});
$('#theme-toggle').addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
$('#shutdown').addEventListener('click',()=>confirmAction('¿Cerrar Amapola?','Se guardará una última copia local y el programa se cerrará. Para volver, abre el acceso directo de Amapola.','Cerrar aplicación',async()=>{await api('/api/shutdown','POST',{});$('#main').innerHTML=empty('Hasta tu próxima clase','Amapola está cerrada. Puedes cerrar esta pestaña.');toast('Aplicación cerrada.');}));
window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#alumnos/'))S.studentTab='planning';render();});
window.addEventListener('focus',async()=>{if(S.csrf){try{const old=S.today;await refresh();if(old!==S.today)await render();}catch{}}});
applyTheme(theme);
refresh().then(render).catch(e=>{$('#main').innerHTML=empty('No se pudo conectar',esc(e.message),'<button class="btn" data-action="retry">Reintentar</button>');});

// Refresh due-payment colors when a class ends while the calendar stays open.
setInterval(()=>{
  const clock=classClock();
  $$('[data-action="payment"]').forEach(button=>{
    const row=findSession(button.dataset.id);if(!row)return;
    const state=paymentState(row,clock.today,clock.time);
    if(state===button.dataset.paymentState)return;
    const holder=document.createElement('div');holder.innerHTML=paymentPill(row,button.classList.contains('compact'));button.replaceWith(holder.firstElementChild);
  });
},60000);
