// Google views and actions. Dependencies are supplied by app.js.
export function createGoogleUI(context) {
  const { $, $$, S, cancelBtn, empty, end, esc, fmtDate, formData, fullname, icon, modalityNames, priceInput, submitBtn } = context;
  const disposeCalendar = (...args) => context.disposeCalendar(...args);
  const api = (...args) => context.api(...args);
  const calendarConnectionWarning = (...args) => context.calendarConnectionWarning(...args);
  const calendarRowVisible = (...args) => context.calendarRowVisible(...args);
  const calendarSyncControls = (...args) => context.calendarSyncControls(...args);
  const calendarVisibilityControls = (...args) => context.calendarVisibilityControls(...args);
  const checkCalendarEntry = (...args) => context.checkCalendarEntry(...args);
  const googleClassOrigin = (...args) => context.googleClassOrigin(...args);
  const googleCompleteModal = (...args) => context.googleCompleteModal(...args);
  const googleEventModal = (...args) => context.googleEventModal(...args);
  const googleInboxPanel = (...args) => context.googleInboxPanel(...args);
  const googleSettings = (...args) => context.googleSettings(...args);
  const googleSyncStatus = (...args) => context.googleSyncStatus(...args);
  const inputField = (...args) => context.inputField(...args);
  const loadGoogleCalendars = (...args) => context.loadGoogleCalendars(...args);
  const modal = (...args) => context.modal(...args);
  const openApplication = (...args) => context.openApplication(...args);
  const parsePrice = (...args) => context.parsePrice(...args);
  const refresh = (...args) => context.refresh(...args);
  const render = (...args) => context.render(...args);
  const runGoogleSync = (...args) => context.runGoogleSync(...args);
  const selectField = (...args) => context.selectField(...args);
  const shutdownLocalApp = (...args) => context.shutdownLocalApp(...args);
  const shutdownPrompt = (...args) => context.shutdownPrompt(...args);
  const syncOverlay = (...args) => context.syncOverlay(...args);
  const textField = (...args) => context.textField(...args);
  const toast = (...args) => context.toast(...args);
  const validateSlot = (...args) => context.validateSlot(...args);
  const webLink = (...args) => context.webLink(...args);

  function _syncOverlay(status) {
    if(S.opening){const message=$('#startup-message');if(message&&status?.state==='syncing')message.textContent=status.operation?.stage||status.message||'Recibiendo de Google…';return;}
    const dialog=$('#google-progress');if(!dialog)return;
    if(status?.state==='syncing'){
      const op=status.operation||{};
      $('#google-progress-title').textContent=op.direction==='push'?'Enviando a Google':'Recibiendo de Google';
      $('#google-progress-message').textContent=op.stage||status.message||'Sincronización en curso…';
      $('#google-progress-count').textContent=op.total?`${op.done} / ${op.total}`:'';
      if(!dialog.open)dialog.showModal();
    }else if(dialog.open&&!S.googleSyncPromise)dialog.close();
  }

  async function _runGoogleSync(direction) {
    if(S.googleSyncPromise)return S.googleSyncPromise;
    const task=(async()=>{
      syncOverlay({state:'syncing',operation:{direction,stage:'Conectando con Google…'}});
      try {
        let status=await api('/api/google/sync','POST',{direction}),operation=status.operation?.id;
        if(!operation)throw Error(status.message||'No se pudo iniciar la sincronización.');
        S.google=status;googleSyncStatus();syncOverlay(status);
        while(status.state==='syncing'){
          await new Promise(resolve=>setTimeout(resolve,400));status=await api('/api/google/status');
          if(status.operation?.id!==operation)throw Error('No se puede confirmar este intercambio. Vuelve a intentarlo.');
          S.google=status;googleSyncStatus();syncOverlay(status);
        }
        if(status.operation?.ok!==true)throw Error(status.operation?.error||status.message||'El intercambio no terminó.');
        await refresh();await render();toast(direction==='pull'?'Google recibido.':'Agenda Amapola enviada a Google.');
      }finally{const dialog=$('#google-progress');if(dialog?.open)dialog.close();}
    })();
    S.googleSyncPromise=task;
    try{return await task;}finally{S.googleSyncPromise=null;}
  }

  function _calendarConnectionWarning(message) {
    modal('Agendas no actualizados','Puedes seguir trabajando con los datos guardados en este PC.',`<div class="notice warning">${esc(message||'No hay conexión con Google. Los agendas no se han actualizado.')}</div><p class="help-text">Los cambios locales se conservan. Actualiza cuando vuelva la conexión.</p>`,
      '<button class="btn" type="button" data-action="close-dialog">Continuar sin actualizar</button>'+(S.google?.connected&&!S.google?.paused?'<button class="btn primary" type="button" data-action="google-pull">Reintentar recepción</button>':'<button class="btn primary" type="button" data-action="google-settings">Revisar conexión</button>'),async()=>{});
  }

  async function _checkCalendarEntry() {
    if(!S.google?.configured||S.googleSyncPromise)return;
    const entry=++S.calendarConnectionCheck;
    try{
      const status=await api('/api/google/check','POST',{});S.google=status;googleSyncStatus();
      if(entry!==S.calendarConnectionCheck||(location.hash&&location.hash!=='#calendario'))return;
      if(status.online===false&&!$('#dialog').open)calendarConnectionWarning(status.connectionIssue||status.message);
    }catch(error){if(entry===S.calendarConnectionCheck&&(!location.hash||location.hash==='#calendario')&&!$('#dialog').open)calendarConnectionWarning(error.message);}
  }

  async function _openApplication() {
    S.opening=true;
    const animation=new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1700));
    let warning='',ready=false;
    try{
      await refresh();
      const g=S.google||{};
      if(g.connected&&!g.paused){try{await runGoogleSync('pull');}catch(error){warning=error.message;}}
      else if(g.configured&&!g.connected)warning='Google no está conectado. Los agendas no se han actualizado.';
      await render();ready=true;
    }catch(error){$('#main').innerHTML=empty('No se pudo conectar',esc(error.message),'<button class="btn" data-action="retry">Reintentar</button>');}
    finally{
      await animation;
      const screen=$('#startup-screen');if(screen)screen.hidden=true;
      $$('[data-opening-inert]').forEach(element=>element.inert=false);
      S.opening=false;S.startupHandled=true;
    }
    if(ready&&warning)calendarConnectionWarning(warning);
    else if(ready&&S.google?.paused)toast('Google está en pausa después de la restauración. Revisa la conexión en Mi información.',true);
  }

  async function _shutdownLocalApp() {
    await api('/api/shutdown','POST',{});context.closeGuard?.disable();disposeCalendar();$('#main').innerHTML=empty('Hasta tu próxima clase','Amapola está cerrada. Puedes cerrar esta pestaña.');toast('Aplicación cerrada.');
  }

  function _shutdownPrompt() {
    const canSend=S.google?.connected&&!S.google?.paused;
    modal('¿Enviar a Google antes de cerrar?',canSend?'Los cambios locales se guardan en este PC.':'Google no está conectado o está en pausa.',
      '<p>Puedes enviar el agenda Amapola a Google antes de cerrar, o cerrar conservando los cambios locales pendientes.</p>',
      cancelBtn+'<button class="btn" type="button" data-action="google-close-without">Cerrar sin enviar</button>'+(canSend?submitBtn('Enviar y cerrar'):''),async()=>{await runGoogleSync('push');await shutdownLocalApp();$('#dialog').close();});
  }

  function _calendarVisibilityControls() {
    const g=S.google||{},hidden=new Set(g.hiddenCalendarIds||[]),choices=[{id:'$amapola',title:'Amapola · cursos'},{id:'$local-busy',title:'Ocupada · local'}];
    for(const calendar of g.calendars||[])if(calendar.id!==g.calendarId&&(g.sourceIds===null||g.sourceIds?.includes(calendar.id)))choices.push(calendar);
    return `<details class="calendar-agendas" id="calendar-agendas"><summary title="Elegir los agendas visibles">${icon('calendar')}<span>Agendas</span><span class="agenda-count">${choices.filter(c=>!hidden.has(c.id)).length}/${choices.length}</span><span class="agenda-chevron" aria-hidden="true">⌄</span></summary><fieldset class="calendar-visibility"><legend>Agendas visibles</legend>${choices.map(c=>`<label><input type="checkbox" data-calendar-visibility="${esc(c.id)}" ${hidden.has(c.id)?'':'checked'}><span>${esc(c.title)}</span></label>`).join('')}<small>Ocultar no desactiva la sincronización ni los avisos de solapamiento.</small></fieldset></details>`;
  }

  function _calendarRowVisible(row) {
    const g=S.google||{},hidden=new Set(g.hiddenCalendarIds||[]);
    return row.kind!=='busy'?!hidden.has('$amapola'):row.source!=='google'?!hidden.has('$local-busy'):!hidden.has(row.calendarId)&&!(row.calendarId===g.calendarId&&hidden.has('$amapola'));
  }

  function _googleClassOrigin(row) {
    const link=S.google?.classLinks?.find(l=>l.sessionId===row.id||l.key===row.id||row.scheduleId&&l.key===`${row.scheduleId}@${row.originalDate}`);
    return `<div class="notice"><div><strong>Agenda: ${esc(link?.calendarName||'Amapola')}</strong><div class="small-text">${link?.linked?(link.gone?'El evento fue eliminado en Google. Enviar lo volverá a crear.':'Clase vinculada a Google.'):'Clase local pendiente de enviar a Google.'}</div></div></div>`;
  }

  function _googleSyncStatus() {
    const g=S.google||{state:'disconnected'},labels={disconnected:'Google sin conectar',paused:'Google en pausa',syncing:'Sincronizando…',pending:'Cambios por enviar',received:'Datos Google recibidos',sent:'Amapola enviada a Google',synced:'Google sincronizado',offline:'Google sin conexión',error:'Error de sincronización',review:'Google: revisar'};
    $$('[data-google-direction]').forEach(button=>{button.disabled=!g.connected||g.state==='syncing'||g.state==='paused';const pull=button.dataset.googleDirection==='pull';button.classList.toggle('google-ok',!!(pull?g.lastPull&&!g.lastPullError:g.lastPush&&!g.lastPushError));button.classList.toggle('google-failed',!!(pull?g.lastPullError:g.lastPushError));});
    const target=$('#google-sync-control');if(!target)return;
    const html=`<span class="sync-state ${esc(g.state)}" role="status">${icon(g.state==='synced'?'check':g.state==='syncing'?'repeat':'cloud')}${labels[g.state]||labels.disconnected}</span><button class="btn small" data-action="${g.connected?'google-sync':'google-settings'}" ${g.state==='syncing'?'disabled':''} title="${esc(g.message||'Configurar Google Calendar')}" aria-label="${g.connected?'Actualizar desde Google':'Configurar Google Calendar'}">${icon('repeat')}<span>${g.connected?'Actualizar':'Configurar'}</span></button>`;
    if(target.innerHTML!==html)target.innerHTML=html;
  }

  function _calendarSyncControls() {
    const g=S.google||{},disabled=!g.connected||g.state==='syncing'||g.state==='paused';
    const stamp=direction=>{const date=direction==='pull'?g.lastPull:g.lastPush;return date?new Date(date).toLocaleString('es'):'Todavía sin confirmar';};
    return `<div class="calendar-sync-controls" aria-label="Sincronización Google"><button class="btn google-receive ${g.lastPull&&!g.lastPullError?'google-ok':''}" data-action="google-pull" data-google-direction="pull" ${disabled?'disabled':''} title="Google → Amapola · Próximos 30 días. Google reemplaza los cursos vinculados; los nuevos locales se conservan. Última recepción: ${esc(stamp('pull'))}">${icon('download')} Actualizar desde Google</button><button class="btn google-send ${g.lastPush&&!g.lastPushError?'google-ok':''}" data-action="google-push" data-google-direction="push" ${disabled?'disabled':''} title="Amapola → Google · Envía directamente las clases locales, sin recibir cambios. Último envío: ${esc(stamp('push'))}${g.pending?' · Cambios locales pendientes':''}">${icon('cloud')} Enviar a Google</button></div>`;
  }

  function _googleInboxPanel() {
    const g=S.google||{},inbox=(g.inbox||[]).filter(r=>calendarRowVisible({...r,kind:'busy',source:'google'})),reviews=g.reviews||[];
    if(!inbox.length&&!reviews.length)return '';
    return `<section class="google-inbox panel"><div class="panel-header"><h2>Google · Por completar / revisar</h2><span class="badge">${inbox.length+reviews.length}</span></div><div class="panel-body">${inbox.map(r=>`<div class="google-inbox-item"><div><strong>${esc(r.title)}</strong><div class="student-secondary">${esc(r.calendarName)}${r.date?' · '+fmtDate(r.date)+' · '+r.time:''} · Falta alumno y tarifa</div></div><button class="btn small primary" data-action="google-complete" data-id="${esc(r.id)}">Completar clase</button></div>`).join('')}${reviews.map(r=>`<div class="google-inbox-item"><div><strong>${esc(r.title)}</strong><div class="student-secondary">${esc(r.message)}</div></div>${r.conflict?`<div class="button-row"><button class="btn small" data-action="google-resolve" data-key="${esc(r.key)}" data-choice="google">Conservar Google</button><button class="btn small danger" data-action="google-resolve" data-key="${esc(r.key)}" data-choice="amapola">Aplicar eliminación Amapola</button></div>`:''}</div>`).join('')}</div></section>`;
  }

  function _googleSettings() {
    const g=S.google||{},calendars=S.googleCalendars||[];
    return `<section class="panel settings-section" id="google-section"><div class="panel-header"><div><h2>Sincronización con Google Calendar</h2><p class="subtitle small-text">Próximos 30 días. Recibir y enviar son acciones independientes.</p></div>${icon('cloud')}</div><div class="panel-body"><p class="small-text">Amapola escribe únicamente en su agenda <strong>Amapola</strong>. Los demás agendas se leen como bloques <strong>Busy</strong> grises y rayados. Para crear una clase desde el móvil, usa el agenda Amapola. En otro agenda, escribe Amapola al principio de su descripción.</p><div class="notice"><div><strong>${esc(g.message||'Google sin conectar')}</strong>${g.account?`<div>${esc(g.account)}</div>`:''}${g.lastPull?`<div class="small-text">Última recepción: ${esc(new Date(g.lastPull).toLocaleString('es'))}</div>`:''}${g.lastPush?`<div class="small-text">Último envío: ${esc(new Date(g.lastPush).toLocaleString('es'))}</div>`:''}</div></div><div class="button-row"><label class="btn file-label" for="google-client">${g.configured?'Cambiar archivo de conexión':'Importar conexión Google (.json)'}</label><input id="google-client" type="file" class="file-input" accept=".json,application/json"><button class="btn primary" data-action="google-connect" ${!g.configured?'disabled':''}>${g.connected?'Reconectar Google':'Conectar Google'}</button>${g.connected?`<button class="btn" data-action="google-sync" ${g.state==='syncing'?'disabled':''}>Sincronizar ahora</button><button class="btn" data-action="google-calendars">Cargar agendas</button><button class="btn" data-action="google-disconnect">Desconectar</button>`:''}${g.state==='paused'?'<button class="btn primary" data-action="google-resume">Reanudar sincronización</button>':''}</div><p class="help-text">${g.configured?'Conecta tu cuenta y elige los agendas.':'La primera conexión requiere un cliente Google de tipo Aplicación de escritorio. Consulta GOOGLE-CALENDAR.md en la carpeta de Amapola.'} La autorización queda protegida en este PC y no se incluye en las copias de datos.</p>${S.googleCalendarError?`<p class="form-error">${esc(S.googleCalendarError)}</p>`:''}${calendars.length?`<form id="google-calendars-form"><fieldset class="google-calendar-list"><legend>Agendas de Google que se reciben en Amapola</legend>${calendars.map(c=>`<label class="checkbox-field"><input type="checkbox" name="calendar" value="${esc(c.id)}" ${c.id===g.calendarId?'checked disabled':g.sourceIds===null||g.sourceIds?.includes(c.id)?'checked':''}><span>${esc(c.title)}${c.id===g.calendarId?' · Clases Amapola (siempre sincronizado)':c.primary?' · Principal':''}</span></label>`).join('')}</fieldset><button class="btn primary" type="submit">Guardar selección de agendas</button><p class="help-text">Todos los agendas accesibles están seleccionados inicialmente. Los nuevos agendas también se leen mientras no guardes una selección personalizada.</p></form>`:''}<p class="help-text">Al abrir se recibe Google durante la bienvenida, si está conectado y no está en pausa. Después, los intercambios son manuales: Actualizar recibe y Enviar aplica Amapola a Google. En Calendario puedes ocultar agendas sin dejar de recibirlos ni desactivar sus avisos de solapamiento. Sin Internet, los cambios quedan guardados localmente. Una eliminación confirmada en Google cancela la clase aquí y conserva su pago e historial. Eliminar una clase en Amapola elimina su evento en Google después de sincronizar.</p></div></section>`;
  }

  async function _loadGoogleCalendars() {
    try {S.googleCalendars=(await api('/api/google/calendars')).calendars;S.googleCalendarError='';}
    catch(error){S.googleCalendarError=error.message;}
    await refresh();await render();
  }

  function _googleEventModal(id) {
    const row=S.busyBlocks.find(r=>r.id===id);if(!row)return;
    if(row.needsAssignment){googleCompleteModal(row.googleRecord);return;}
    const link=webLink(row.googleUrl);
    modal('Busy · Google Calendar',esc(row.title),`<p class="small-text"><strong>Agenda Google: ${esc(row.calendarName)}</strong> · ${fmtDate(row.date)} · ${row.time} – ${end(row)}</p><p class="help-text">Este evento se modifica desde Google Calendar. Pulsa Actualizar para recuperar los últimos cambios.</p>`,cancelBtn+(link?`<a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir Google Calendar</a>`:''),async()=>{});
  }

  function _googleCompleteModal(id) {
    const row=S.google?.inbox?.find(r=>r.id===id);if(!row)return;
    const active=S.students.filter(s=>s.active&&s.stage!=='prospect');
    if(!active.length){modal('Completar clase Google','Primero añade o activa un alumno.','<p>La clase seguirá pendiente; no se perderá.</p>',cancelBtn+'<button class="btn primary" type="button" data-action="new-student">Nuevo alumno</button>',async()=>{});return;}
    modal('Completar clase de Google','Sesión puntual · Sin planificación recurrente',`<div class="field-grid">${selectField('studentId','Alumno *',active[0].id,active.map(s=>[s.id,fullname(s)]),'required')}${inputField('title','Título',row.title,'text','required maxlength="150"')}${inputField('date','Fecha',row.date||S.today,'date','required min="2000-01-01" max="2100-12-31"')}${inputField('time','Hora',row.time||'09:00','time','required step="900"')}${inputField('duration','Duración (minutos)',row.duration||60,'number','required min="15" max="720" step="15"')}${inputField('price',`Tarifa (${S.settings.currency})`,priceInput(active[0].defaultPrice??0),'text','required inputmode=decimal data-student-default=true')}${selectField('modality','Modalidad','online',Object.entries(modalityNames))}${textField('notes','Notas','','maxlength="4000"')}</div>${row.foreign?'<div class="notice warning">El evento original pertenece a otro agenda y se conserva allí. Se creará un evento vinculado en el agenda Amapola; en Google verás ambos. Puedes crear los próximos cursos directamente en el agenda Amapola.</div>':''}<p class="help-text">Asocia el alumno y comprueba el horario en intervalos de 15 minutos. El pago se registra después desde Amapola.</p>`,cancelBtn+submitBtn('Crear y vincular clase'),async form=>{const v=formData(form);v.duration=Number(v.duration);v.price=parsePrice(v.price);validateSlot(v);await api('/api/google/inbox/'+encodeURIComponent(id),'POST',v);$('#dialog').close();await refresh();await render();toast('Clase asociada. Pulsa Enviar para mandar sus datos a Google.');});
  }

  return { syncOverlay: _syncOverlay, runGoogleSync: _runGoogleSync, calendarConnectionWarning: _calendarConnectionWarning, checkCalendarEntry: _checkCalendarEntry, openApplication: _openApplication, shutdownLocalApp: _shutdownLocalApp, shutdownPrompt: _shutdownPrompt, calendarVisibilityControls: _calendarVisibilityControls, calendarRowVisible: _calendarRowVisible, googleClassOrigin: _googleClassOrigin, googleSyncStatus: _googleSyncStatus, calendarSyncControls: _calendarSyncControls, googleInboxPanel: _googleInboxPanel, googleSettings: _googleSettings, loadGoogleCalendars: _loadGoogleCalendars, googleEventModal: _googleEventModal, googleCompleteModal: _googleCompleteModal };
}
