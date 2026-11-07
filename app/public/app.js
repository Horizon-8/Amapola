let attachCalendarGestures, attachCalendarClock, paymentState, hasEnded, createAssetsUI, createCalendarUI, createStudentsUI, createClassesUI, createPlanningUI, createGoogleUI, createSettingsUI, createFormsUI, installCloseGuard;
try {
  const response = await fetch('/api/health', { signal: AbortSignal.timeout(10000) });
  const health = await response.json();
  if (!response.ok || health.app !== 'amapola' || health.version !== '0.8.1') throw new Error('Hay una versión anterior de Amapola abierta. Abre de nuevo Amapola.exe para reiniciarla y cargar la actualización.');
  ({ attachCalendarGestures } = await import('./calendar-interactions.mjs'));
  ({ attachCalendarClock } = await import('./calendar-clock.mjs'));
  ({ paymentState, hasEnded } = await import('./class-utils.mjs'));
  ({ createAssetsUI } = await import('./ui/assets.mjs'));
  ({ createCalendarUI } = await import('./ui/calendar.mjs'));
  ({ createStudentsUI } = await import('./ui/students.mjs'));
  ({ createClassesUI } = await import('./ui/classes.mjs'));
  ({ createPlanningUI } = await import('./ui/planning.mjs'));
  ({ createGoogleUI } = await import('./ui/google.mjs'));
  ({ createSettingsUI } = await import('./ui/settings.mjs'));
  ({ createFormsUI } = await import('./ui/forms.mjs'));
  ({ installCloseGuard } = await import('./ui/close-guard.mjs'));
} catch (error) {
  const target = document.getElementById('main');
  const panel = document.createElement('div'); panel.className = 'empty-state';
  const title = document.createElement('h3'); title.textContent = 'No se pudo iniciar Amapola';
  const message = document.createElement('p'); message.textContent = error.message.startsWith('Hay una versión anterior') ? error.message : 'No se pudieron cargar los archivos de la aplicación. Abre Amapola.exe desde la carpeta del proyecto y vuelve a cargar esta pestaña.';
  const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Volver a cargar'; retry.addEventListener('click', () => location.reload());
  panel.append(title, message, retry); target.replaceChildren(panel);
  document.getElementById('startup-screen')?.remove();
  document.querySelectorAll('[data-opening-inert]').forEach(element=>element.inert=false);
  throw error;
}
/* Amapola — no business data is stored in the browser. Only appearance is local. */
const { icon } = createAssetsUI();

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
S.busyBlocks=[];S.calendarConnectionCheck=0;S.startupHandled=false;S.opening=true;
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

const priceInput = cents => (cents/100).toFixed(2);
function parsePrice(value) { if (!/^\d{1,10}([.,]\d{1,2})?$/.test(value)) throw new Error('Indica una tarifa positiva con un máximo de dos decimales.'); const [a,b=''] = value.replace(',','.').split('.'); return Number(a)*100+Number(b.padEnd(2,'0')); }
function toast(message, error=false) { const el=$('#toast'); el.textContent=message; el.className=`show${error?' error':''}`; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.className='',error?6500:4000); }
async function api(route, method='GET', data, headers={}) {
  let res;
  try { res=await fetch(route,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json','X-Amapola-Token':S.csrf}:{}),...headers},...(data===undefined?{}:{body:data instanceof File?data:JSON.stringify(data)})}); }
  catch { throw new Error('No se puede conectar con Amapola. Vuelve a abrirla desde su acceso directo.'); }
  const result=await res.json().catch(()=>({error:'Respuesta no válida. Recarga la página.'}));
  if (!res.ok) throw new Error(result.error||'No se pudo completar la operación.');
  if(method!=='GET'&&/^\/api\/(students|schedules|sessions|busy-blocks)(\/|$)/.test(route)&&!S.google?.connected&&!S.googleWarned){S.googleWarned=true;setTimeout(()=>toast('Cambio guardado en este PC. Google no está conectado; conecta la cuenta para sincronizar.',true),350);}
  return result;
}
async function refresh() { const v=await api('/api/bootstrap'); Object.assign(S,v); if(!S.week)S.week=weekOf(S.today); updateShell(); }
function updateShell() {
  const nav=[['calendario','calendar','Calendario'],['alumnos','users','Alumnos'],['clases','clock','Clases'],['planificacion','plan','Planificación'],['informes','chart','Informes']];
  $('#navigation').innerHTML=nav.map(([route,ico,label])=>`<a href="#${route}" class="nav-item" data-nav="${route}" title="${label}">${icon(ico)}<span class="nav-label">${label}</span>${route==='alumnos'?`<span class="count">${S.students.filter(s=>s.active).length}</span>`:''}</a>`).join('');
  $('#settings-link').className='nav-item'; $('#settings-link').dataset.nav='ajustes'; $('#settings-link').title='Mi información'; $('#settings-link').innerHTML=`${icon('settings')}<span class="nav-label">Mi información</span>`;
  $('#shutdown').innerHTML=`${icon('power')}<span class="nav-label">Cerrar aplicación</span>`;$('#shutdown').title='Cerrar aplicación';
  $('#business-name').textContent=S.settings.business||'Mis clases';$('#profile-avatar').textContent=(S.settings.name||'A')[0].toUpperCase();
  applyTheme(theme);googleSyncStatus();
}
const heading=(eyebrow,title,sub,action='')=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${action}</div>`;
const newClass=studentId=>`<button class="btn primary" data-action="new-schedule" ${studentId?`data-student="${studentId}"`:''}>${icon('plus')} Nueva clase</button>`;
const empty=(title,sub,action='')=>`<div class="empty-state"><span aria-hidden="true">✿</span><h3>${title}</h3><p>${sub}</p>${action}</div>`;
const modalityIcon=row=>`<span class="modality-icon ${row.modality}" title="${modalityNames[row.modality]}" aria-hidden="true">${icon(row.modality)}</span>`;
const modalityBadge=row=>`<span class="badge modality-badge ${row.modality}">${modalityIcon(row)}${modalityNames[row.modality]}</span>`;

const classStatusNames={planned:'Por confirmar',confirmed:'Confirmada',completed:'Realizada',cancelled:'Cancelada'};
const nextClassStatus=status=>status==='planned'?'confirmed':status==='confirmed'||status==='completed'?'cancelled':'planned';

const paymentMethodNames = {'':'Sin especificar',cash:'Efectivo',transfer:'Transferencia bancaria',card:'Tarjeta',nequi:'Nequi',daviplata:'DaviPlata',paypal:'PayPal',other:'Otro'};
const paymentLabels = {paid:'Pagada',overdue:'Vencida sin pagar',pending:'Pendiente',nocharge:'Sin cobro'};

async function render() {
  const ticket=++S.renderId, hash=location.hash.slice(1)||'calendario', [page,id]=hash.split('/');
  const names={calendario:'Calendario',alumnos:'Alumnos',clases:'Clases',planificacion:'Planificación',informes:'Informes',ajustes:'Mi información'};
  if(!names[page]){location.hash='calendario';return;}
  $$('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===page));$('#page-name').textContent=names[page];document.title=`${names[page]} · Amapola`;
  const agendaMenuOpen=$('#calendar-agendas')?.open;
  const oldScroll=$('.calendar-scroll')?.scrollTop,enteringCalendar=page==='calendario'&&S.currentPage!=='calendario';
  try {
    let html;
    if(page==='calendario'){const [rows,report,blocks]=await Promise.all([api(`/api/occurrences?from=${S.week}&to=${plusDays(S.week,6)}`),api(`/api/reports?week=${S.week}`),api(`/api/busy-blocks?from=${S.week}&to=${plusDays(S.week,6)}`)]);if(ticket!==S.renderId)return;html=renderCalendar(rows,report,blocks);}
    if(page==='alumnos'&&!id)html=renderStudents();
    if(page==='alumnos'&&id){const s=studentBy(id);if(!s){location.hash='alumnos';return;}const history=await api(`/api/students/${encodeURIComponent(id)}/history`);if(ticket!==S.renderId)return;html=renderStudent(s,history);}
    if(page==='clases'){const query=new URLSearchParams({...S.classFilters,period:S.classPeriod,page:S.classPage});const data=await api(`/api/classes?${query}`);if(ticket!==S.renderId)return;html=renderClasses(data);}
    if(page==='planificacion'){const rows=await api(`/api/occurrences?from=${S.week}&to=${plusDays(S.week,6)}`);if(ticket!==S.renderId)return;html=renderPlanning(rows);}
    if(page==='informes'){const report=await api(`/api/reports?week=${S.week}`);if(ticket!==S.renderId)return;html=renderReports(report);}
    if(page==='ajustes'){const backups=await api('/api/backups');if(ticket!==S.renderId)return;html=renderSettings(backups);}
    disposeCalendar();$('#main').innerHTML=html;fillStudentTable();S.googleRenderedRevision=S.google?.revision;S.currentPage=page;googleSyncStatus();if(enteringCalendar&&S.startupHandled)void checkCalendarEntry();
    const agendaMenu=$('#calendar-agendas');if(agendaMenu)agendaMenu.open=!!agendaMenuOpen;
    $$('[data-calendar-visibility]').forEach(input=>input.addEventListener('change',async()=>{const hidden=new Set(S.google?.hiddenCalendarIds||[]);if(input.checked)hidden.delete(input.dataset.calendarVisibility);else hidden.add(input.dataset.calendarVisibility);const fields=$$('[data-calendar-visibility]');fields.forEach(field=>field.disabled=true);try{S.google=await api('/api/google/visibility','PUT',{hiddenIds:[...hidden]});await render();}catch(error){input.checked=!input.checked;toast(error.message,true);}finally{fields.forEach(field=>field.disabled=false);}}));
    if(page==='ajustes')$('#main').insertAdjacentHTML('beforeend',googleSettings());
    if($('#google-client'))$('#google-client').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('Archivo de conexión demasiado grande.');const client=JSON.parse(await file.text());await api('/api/google/client','POST',client);await refresh();await render();toast('Conexión preparada. Pulsa Conectar Google.');}catch(error){toast(error.message,true);}});
    if($('#google-calendars-form'))$('#google-calendars-form').addEventListener('submit',async ev=>{ev.preventDefault();try{const ids=[...new FormData(ev.target).getAll('calendar')];await api('/api/google/calendars','PUT',{ids});await refresh();await render();toast('Selección guardada. Pulsa Actualizar para recibir los agendas.');}catch(error){toast(error.message,true);}});
    if($('#student-search'))$('#student-search').addEventListener('input',ev=>{S.search=ev.target.value;fillStudentTable();});
    if($('#student-channel'))$('#student-channel').addEventListener('change',ev=>{S.channel=ev.target.value;fillStudentTable();});
    if($('#student-active'))$('#student-active').addEventListener('change',ev=>{S.active=ev.target.value;render();});
    if($('#settings-form'))$('#settings-form').addEventListener('submit',saveSettings);
    if($('#class-filters'))$('#class-filters').addEventListener('submit',ev=>{ev.preventDefault();const filters=formData(ev.target);if(filters.from&&filters.to&&filters.from>filters.to){toast('La fecha final debe ser posterior al inicio.',true);return;}S.classFilters=filters;S.classPage=1;render();});
    if($('#backupMode'))$('#backupMode').addEventListener('change',ev=>{$$('.backup-api').forEach(e=>e.classList.toggle('hide',ev.target.value!=='api'));$$('.backup-folder').forEach(e=>e.classList.toggle('hide',ev.target.value!=='folder'));});
    if($('#restore-file'))$('#restore-file').addEventListener('change',ev=>{const file=ev.target.files[0];if(file)previewRestore(file);});
    if($('.calendar-scroll')){
      const body=$('.calendar-body'),scroll=$('.calendar-scroll');
      const disposeGestures=attachCalendarGestures(body,{rows:[...S.rows,...S.busyBlocks],onCreate:seed=>calendarCreateModal(seed),onChange:(row,change)=>row.source==='google'?googleEventModal(row.id):row.kind==='busy'?busyModal(row.id,change):chooseScope(row,{...row,...change})});
      disposeCalendar=disposeGestures;
      const disposeClock=attachCalendarClock(body,{timeZone:S.settings.timezone,onDayChange:today=>{S.today=today;}});
      disposeCalendar=()=>{disposeGestures();disposeClock();};
      const clock=classClock(),hasToday=!!$(`.day-lane[data-date="${clock.today}"]`,body);
      scroll.scrollTop=oldScroll??(hasToday?Math.max(0,min(clock.time)*calendarScale-scroll.clientHeight/3):7.5*60*calendarScale);
    }
  } catch(e){if(ticket===S.renderId){disposeCalendar();$('#main').innerHTML=empty('No se pudo abrir esta vista',esc(e.message),page==='clases'?'<button class="btn" data-action="class-clear">Restablecer filtros</button>':'<button class="btn" data-action="retry">Reintentar</button>');toast(e.message,true);}}
}

const cancelBtn='<button class="btn" type="button" data-action="close-dialog">Cancelar</button>';
const submitBtn=label=>`<button type="submit" class="btn primary">${label}</button>`;
const formData=form=>Object.fromEntries(new FormData(form));

// One shared state, with late-bound actions to avoid circular imports.
let closeGuard;
const uiContext = {
  get theme() { return theme; },
  get closeGuard() { return closeGuard; },
  get $() { return $; },
  get $$() { return $$; },
  get S() { return S; },
  get agenda() { return agenda; },
  get api() { return api; },
  get avatar() { return avatar; },
  get busyDraft() { return busyDraft; },
  get busyModal() { return busyModal; },
  get calendarConnectionWarning() { return calendarConnectionWarning; },
  get calendarCreateModal() { return calendarCreateModal; },
  get calendarGrid() { return calendarGrid; },
  get calendarRowVisible() { return calendarRowVisible; },
  get calendarScale() { return calendarScale; },
  get calendarSyncControls() { return calendarSyncControls; },
  get calendarVisibilityControls() { return calendarVisibilityControls; },
  get cancelBtn() { return cancelBtn; },
  get channelBadge() { return channelBadge; },
  get channelNames() { return channelNames; },
  get checkCalendarEntry() { return checkCalendarEntry; },
  get chooseScope() { return chooseScope; },
  get classClock() { return classClock; },
  get classStatusNames() { return classStatusNames; },
  get classStatusPill() { return classStatusPill; },
  get classTable() { return classTable; },
  get confirmAction() { return confirmAction; },
  get confirmConflicts() { return confirmConflicts; },
  get conflictMarkup() { return conflictMarkup; },
  get contactLinks() { return contactLinks; },
  get createBackup() { return createBackup; },
  get cycleClassStatus() { return cycleClassStatus; },
  get dayOf() { return dayOf; },
  get days() { return days; },
  get deleteBusy() { return deleteBusy; },
  get deleteSchedule() { return deleteSchedule; },
  get deleteSession() { return deleteSession; },
  get deleteStudent() { return deleteStudent; },
  get disposeCalendar() { return disposeCalendar; },
  get download() { return download; },
  get empty() { return empty; },
  get end() { return end; },
  get esc() { return esc; },
  get fillStudentTable() { return fillStudentTable; },
  get findSession() { return findSession; },
  get fmtDate() { return fmtDate; },
  get formData() { return formData; },
  get fullname() { return fullname; },
  get googleClassOrigin() { return googleClassOrigin; },
  get googleCompleteModal() { return googleCompleteModal; },
  get googleEventModal() { return googleEventModal; },
  get googleInboxPanel() { return googleInboxPanel; },
  get googleSettings() { return googleSettings; },
  get googleSyncStatus() { return googleSyncStatus; },
  get heading() { return heading; },
  get icon() { return icon; },
  get inputField() { return inputField; },
  get layoutEvents() { return layoutEvents; },
  get legend() { return legend; },
  get linkedNotes() { return linkedNotes; },
  get loadGoogleCalendars() { return loadGoogleCalendars; },
  get min() { return min; },
  get modal() { return modal; },
  get modalityBadge() { return modalityBadge; },
  get modalityIcon() { return modalityIcon; },
  get modalityNames() { return modalityNames; },
  get money() { return money; },
  get newClass() { return newClass; },
  get nextClassStatus() { return nextClassStatus; },
  get noteLinks() { return noteLinks; },
  get num() { return num; },
  get openApplication() { return openApplication; },
  get palette() { return palette; },
  get parsePrice() { return parsePrice; },
  get paymentLabels() { return paymentLabels; },
  get paymentMethodNames() { return paymentMethodNames; },
  get paymentModal() { return paymentModal; },
  get paymentPill() { return paymentPill; },
  get paymentState() { return paymentState; },
  get plusDays() { return plusDays; },
  get previewRestore() { return previewRestore; },
  get priceInput() { return priceInput; },
  get range() { return range; },
  get refresh() { return refresh; },
  get render() { return render; },
  get renderCalendar() { return renderCalendar; },
  get renderClasses() { return renderClasses; },
  get renderPlanning() { return renderPlanning; },
  get renderReports() { return renderReports; },
  get renderSettings() { return renderSettings; },
  get renderStudent() { return renderStudent; },
  get renderStudents() { return renderStudents; },
  get runGoogleSync() { return runGoogleSync; },
  get saveSettings() { return saveSettings; },
  get scheduleDraft() { return scheduleDraft; },
  get scheduleModal() { return scheduleModal; },
  get scheduleTable() { return scheduleTable; },
  get selectField() { return selectField; },
  get sessionDraft() { return sessionDraft; },
  get sessionModal() { return sessionModal; },
  get setupConflicts() { return setupConflicts; },
  get shortDays() { return shortDays; },
  get shutdownLocalApp() { return shutdownLocalApp; },
  get shutdownPrompt() { return shutdownPrompt; },
  get statusBadge() { return statusBadge; },
  get studentBadge() { return studentBadge; },
  get studentBy() { return studentBy; },
  get studentModal() { return studentModal; },
  get studentStatus() { return studentStatus; },
  get studentStatusNames() { return studentStatusNames; },
  get submitBtn() { return submitBtn; },
  get summary() { return summary; },
  get syncOverlay() { return syncOverlay; },
  get textField() { return textField; },
  get toast() { return toast; },
  get validateSlot() { return validateSlot; },
  get webLink() { return webLink; },
  get weekControls() { return weekControls; }
};

let { weekControls, summary, layoutEvents, calendarGrid, legend, agenda, renderCalendar } = createCalendarUI(uiContext);
let { webLink, noteLinks, linkedNotes, contactLinks, renderStudents, fillStudentTable, scheduleTable, renderStudent, studentModal, deleteStudent } = createStudentsUI(uiContext);
let { statusBadge, classStatusPill, cycleClassStatus, classClock, paymentPill, findSession, validateSlot, classTable, renderClasses, sessionDraft, sessionModal, chooseScope, paymentModal, deleteSession } = createClassesUI(uiContext);
let { renderPlanning, renderReports, scheduleDraft, scheduleModal, deleteSchedule, busyDraft, busyModal, deleteBusy, calendarCreateModal } = createPlanningUI(uiContext);
let { syncOverlay, runGoogleSync, calendarConnectionWarning, checkCalendarEntry, openApplication, shutdownLocalApp, shutdownPrompt, calendarVisibilityControls, calendarRowVisible, googleClassOrigin, googleSyncStatus, calendarSyncControls, googleInboxPanel, googleSettings, loadGoogleCalendars, googleEventModal, googleCompleteModal } = createGoogleUI(uiContext);
let { renderSettings, saveSettings, download, createBackup, previewRestore } = createSettingsUI(uiContext);
let { inputField, selectField, textField, modal, conflictMarkup, setupConflicts, confirmConflicts, confirmAction } = createFormsUI(uiContext);

document.addEventListener('click',async ev=>{
  const agendaMenu=$('#calendar-agendas');if(agendaMenu?.open&&!agendaMenu.contains(ev.target))agendaMenu.open=false;
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
    if(action==='google-settings'){if($('#dialog').open)$('#dialog').close();location.hash='ajustes';return;}
    if(action==='google-connect'){const result=await api('/api/google/connect','POST',{});closeGuard.approveNavigation();location.href=result.url;return;}
    if(['google-sync','google-pull','google-push'].includes(action)){await runGoogleSync(action==='google-push'?'push':'pull');if($('#dialog').open)$('#dialog').close();return;}
    if(action==='google-close-without'){await shutdownLocalApp();$('#dialog').close();return;}
    if(action==='google-calendars'){await loadGoogleCalendars();return;}
    if(action==='google-disconnect'){confirmAction('¿Desconectar Google?','Los eventos Google y los datos locales se conservan. Los próximos cambios quedarán pendientes hasta volver a conectar.','Desconectar',async()=>{await api('/api/google/disconnect','POST',{});S.googleCalendars=[];await refresh();await render();});return;}
    if(action==='google-resume'){await api('/api/google/resume','POST',{});await refresh();await render();return;}
    if(action==='google-complete'){googleCompleteModal(b.dataset.id);return;}
    if(action==='google-event'){googleEventModal(b.dataset.id);return;}
    if(action==='calendar-week'||action==='calendar-agenda'){S.calendarMode=action==='calendar-week'?'week':'agenda';await render();}
    if(action==='plan-day'||action==='plan-all'){S.planDay=action==='plan-all'?null:Number(b.dataset.day);await render();}
    if(action==='student-planning'||action==='student-history'){S.studentTab=action==='student-planning'?'planning':'history';await render();}
    if(action==='report-current'||action==='report-next'){S.reportTab=action==='report-current'?'current':'next';await render();}
    if(action==='backup-send'||action==='backup-local')await createBackup(action==='backup-local',b);
    if(action==='retry'){await refresh();await render();}
  }catch(e){toast(e.message,true);}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const menu=$('#calendar-agendas');if(menu?.open){menu.open=false;$('summary',menu)?.focus();}}if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('.agenda-item,.calendar-event')){ev.preventDefault();ev.target.click();}});
$('#theme-toggle').addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
$('#shutdown').addEventListener('click',shutdownPrompt);
closeGuard = installCloseGuard(window);
$('#google-progress').addEventListener('cancel',event=>event.preventDefault());
window.addEventListener('hashchange',()=>{if(S.opening)return;if(!location.hash.startsWith('#alumnos/'))S.studentTab='planning';render();});
window.addEventListener('focus',async()=>{if(S.csrf&&!S.opening){try{const old=S.today;await refresh();if(old!==S.today)await render();}catch{}}});
applyTheme(theme);
void openApplication();

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

// Poll the local process, not Google directly. Calendar writes run only in the sync service.
let googlePolling=false;
setInterval(async()=>{
  if(googlePolling||document.hidden||!S.csrf||S.opening)return;
  googlePolling=true;
  try {
    const previous=S.google?.state,next=await api('/api/google/status');S.google=next;googleSyncStatus();syncOverlay(next);
    if(next.state==='synced')S.googleWarned=false;
    if(['offline','error'].includes(next.state)&&previous!==next.state)toast(next.message,true);
    if(next.revision!==S.googleRenderedRevision&&next.state!=='syncing'&&!$('#dialog').open){await refresh();await render();}
  }catch{}finally{googlePolling=false;}
},4000);
