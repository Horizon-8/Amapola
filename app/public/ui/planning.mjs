// Planning views and actions. Dependencies are supplied by app.js.
export function createPlanningUI(context) {
  const { $, S, avatar, cancelBtn, dayOf, days, empty, end, esc, fmtDate, formData, fullname, heading, icon, money, newClass, num, plusDays, priceInput, range, shortDays, studentBy, submitBtn } = context;
  const agenda = (...args) => context.agenda(...args);
  const api = (...args) => context.api(...args);
  const busyDraft = (...args) => context.busyDraft(...args);
  const busyModal = (...args) => context.busyModal(...args);
  const calendarCreateModal = (...args) => context.calendarCreateModal(...args);
  const confirmAction = (...args) => context.confirmAction(...args);
  const confirmConflicts = (...args) => context.confirmConflicts(...args);
  const deleteBusy = (...args) => context.deleteBusy(...args);
  const deleteSchedule = (...args) => context.deleteSchedule(...args);
  const inputField = (...args) => context.inputField(...args);
  const modal = (...args) => context.modal(...args);
  const parsePrice = (...args) => context.parsePrice(...args);
  const refresh = (...args) => context.refresh(...args);
  const render = (...args) => context.render(...args);
  const renderPlanning = (...args) => context.renderPlanning(...args);
  const renderReports = (...args) => context.renderReports(...args);
  const scheduleDraft = (...args) => context.scheduleDraft(...args);
  const scheduleModal = (...args) => context.scheduleModal(...args);
  const scheduleTable = (...args) => context.scheduleTable(...args);
  const selectField = (...args) => context.selectField(...args);
  const setupConflicts = (...args) => context.setupConflicts(...args);
  const studentModal = (...args) => context.studentModal(...args);
  const textField = (...args) => context.textField(...args);
  const toast = (...args) => context.toast(...args);
  const validateSlot = (...args) => context.validateSlot(...args);
  const weekControls = (...args) => context.weekControls(...args);

  function _renderPlanning(rows) {
    S.rows=rows;const visible=S.planDay===null?rows:rows.filter(r=>dayOf(r.date)===S.planDay);
    return heading('UNA BUENA SEMANA EMPIEZA AQUÍ','Planificación','Organiza los horarios y deja que las repeticiones hagan el resto.',newClass())+`<section class="panel"><div class="panel-header"><h2>Agenda de la semana</h2>${weekControls()}</div><div class="panel-body" style="padding-bottom:0"><div class="week-summary">${days.map((d,i)=>`<button class="week-chip ${S.planDay===i?'active':''}" data-action="plan-day" data-day="${i}"><span>${shortDays[i]}</span><strong>${rows.filter(r=>dayOf(r.date)===i&&r.status!=='cancelled').length}</strong><span>clases</span></button>`).join('')}</div>${S.planDay!==null?'<button class="text-button small-text" data-action="plan-all">Mostrar toda la semana</button>':''}</div>${agenda(visible)}</section><section class="panel"><div class="panel-header"><div><h2>Todas las planificaciones</h2><p class="subtitle small-text">Edita aquí la repetición. Los cambios conservan el historial.</p></div><span class="badge">${S.schedules.length} horarios</span></div>${scheduleTable([...S.schedules].sort((a,b)=>a.weekday-b.weekday||a.time.localeCompare(b.time)))}</section>`;
  }

  function _renderReports(report) {
    const data=report[S.reportTab],max=Math.max(1,...data.students.map(s=>s.total));
    return heading('UNA MIRADA A TU ACTIVIDAD','Informes','Una previsión sencilla de tus clases e ingresos.',weekControls())+`<div class="report-cards">${[['current','Semana seleccionada'],['next','Semana siguiente']].map(([key,label])=>{const r=report[key];return `<section class="report-card ${key==='current'?'highlight':''}"><div class="eyebrow">${label}</div><h2>${range(r.start)}</h2><div class="report-total">${money(r.total)}</div><div class="report-meta"><span>${icon('calendar')}${r.count} clases</span><span>${icon('clock')}${num(r.hours)} horas</span><span>${r.cancelled} canceladas</span></div></section>`;}).join('')}</div><div class="tabs"><button class="tab ${S.reportTab==='current'?'active':''}" data-action="report-current">Semana seleccionada</button><button class="tab ${S.reportTab==='next'?'active':''}" data-action="report-next">Semana siguiente</button></div><section class="panel"><div class="panel-header"><h2>Ingresos estimados por alumno</h2><span class="muted small-text">${range(data.start)}</span></div>${data.students.length?`<div class="table-scroll"><table><thead><tr><th>Alumno</th><th>Clases</th><th>Horas</th><th>Distribución</th><th>Total estimado</th></tr></thead><tbody>${data.students.sort((a,b)=>b.total-a.total).map(s=>`<tr><td><a class="student-cell" href="#alumnos/${s.id}">${avatar(studentBy(s.id))}<span class="student-name">${esc(s.name)}</span></a></td><td>${s.count}</td><td>${num(s.minutes/60)}</td><td><div class="bar-track"><div class="bar-fill" style="--student:${s.color};width:${s.total/max*100}%"></div></div></td><td><strong>${money(s.total)}</strong></td></tr>`).join('')}</tbody></table></div>`:empty('Todavía no hay ingresos previstos','Añade clases con su tarifa para ver aquí la previsión semanal.')}</section><div class="notice">${icon('info')}<div>Los importes son una estimación: suman la tarifa por sesión de las clases programadas y realizadas. Las canceladas no se incluyen. No representan pagos recibidos.</div></div>`;
  }

  function _scheduleDraft(form,p,id) {
    const v=formData(form);v.studentId=id?p.studentId:form.elements.studentId.value;
    v.duration=Number(v.duration);v.weekday=Number(v.weekday);v.price=parsePrice(v.price);validateSlot(v);v.active=id?form.elements.active.checked:true;
    if(v.recurrence==='once'){v.weekday=dayOf(v.startDate);v.endDate='';}
    delete v.overlapAccepted;return v;
  }

  function _busyDraft(form) { const v=formData(form);v.duration=Number(v.duration);validateSlot(v);delete v.overlapAccepted;return v; }

  function _scheduleModal(id,studentId,seed={}) {
    const active=S.students.filter(s=>s.active);
    if(!active.length&&!id){toast('Primero crea o activa un alumno.');studentModal();return;}
    const p=id?S.schedules.find(s=>s.id===id):{studentId:studentId||active[0]?.id,title:'Clase particular',weekday:dayOf(seed.date||S.today),time:seed.time||'09:00',duration:seed.duration||60,price:studentBy(studentId||active[0]?.id)?.defaultPrice??0,modality:'online',recurrence:'weekly',startDate:seed.date||S.today,endDate:'',notes:'',active:1};
    if(!p)return;
    const anchor=plusDays(p.startDate,(p.weekday-dayOf(p.startDate)+7)%7);
    const nextFortnight=plusDays(anchor,Math.max(0,Math.ceil((Date.parse(S.today)-Date.parse(anchor))/86400000/14))*14);
    const start=id&&p.startDate<S.today?(p.recurrence==='biweekly'?nextFortnight:S.today):p.startDate;
    modal(id?'Editar planificación':'Planificar una clase',id?'Se conservan las clases pasadas y las sesiones modificadas individualmente.':'Un horario claro, una semana más ligera.',`<div class="field-grid">${selectField('studentId','Alumno *',p.studentId,(id?S.students:active).map(s=>[s.id,fullname(s)]),id?'disabled':'required')}${inputField('title','Nombre de la clase *',p.title,'text','required maxlength="150"')}${selectField('recurrence','Repetición',p.recurrence,[['weekly','Cada semana'],['biweekly','Cada dos semanas'],['once','No repetir · una sola sesión']])}${selectField('weekday','Día de la semana',p.weekday,days.map((d,i)=>[i,d]))}${inputField('startDate',id?'Aplicar a partir del *':'Fecha de inicio *',start,'date',`required ${id?`min="${S.today}"`:''} max="2100-12-31"`)}${inputField('endDate','Fecha de fin (opcional)',p.endDate,'date','max="2100-12-31"')}${inputField('time','Hora de inicio *',p.time,'time','required step="900"')}${inputField('duration','Duración en minutos *',p.duration,'number','required min="15" max="720" step="15"')}${inputField('price',`Tarifa por sesión (${S.settings.currency}) *`,priceInput(p.price),'text','required inputmode=decimal'+(id?'':' data-student-default=true'),'Importe total de la clase; no es una tarifa por hora.')}${selectField('modality','Modalidad',p.modality,[['online','En línea · ordenador'],['home','Presencial · en mi espacio'],['travel','A domicilio · me desplazo']])}${textField('notes','Notas de la planificación',p.notes,'maxlength="4000"')}${id?`<label class="checkbox-field"><input type="checkbox" name="active" ${p.active?'checked':''}>Planificación activa</label>`:''}</div><p class="help-text">La primera clase será el día elegido a partir de la fecha de inicio. Cada dos semanas mantiene intervalos de 14 días desde esa primera clase.</p>`,cancelBtn+submitBtn(id?'Guardar planificación':'Crear planificación'),async form=>{
      const v=scheduleDraft(form,p,id);
      await confirmConflicts(form);
      await api(id?`/api/schedules/${id}`:'/api/schedules',id?'PUT':'POST',v);$('#dialog').close();await refresh();await render();toast('Planificación guardada.');
    });
    const toggle=()=>{const once=$('#recurrence').value==='once';$('#weekday').disabled=once;$('#endDate').disabled=once;};$('#recurrence').addEventListener('change',toggle);toggle();
    setupConflicts('schedule',id,form=>scheduleDraft(form,p,id));
  }

  function _calendarCreateModal(seed) {
    S.calendarSeed=seed;
    modal('¿Qué quieres añadir?',`${fmtDate(seed.date,{weekday:'long',day:'numeric',month:'long'})} · ${seed.time} – ${end(seed)}`,`<div class="calendar-create-choices"><button type="button" class="create-choice" data-action="calendar-create-class">${icon('calendar')}<strong>Clase</strong><span>Una sesión o una planificación semanal con un alumno.</span></button><button type="button" class="create-choice busy-choice" data-action="calendar-create-busy">${icon('clock')}<strong>Ocupada</strong><span>Reservar este horario para una pausa, una cita o un compromiso personal.</span></button></div>`,cancelBtn,async()=>{});
  }

  function _busyModal(id,seed={}) {
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

  function _deleteBusy(id) {
    confirmAction('¿Eliminar este bloqueo?','Se eliminará este recordatorio de indisponibilidad. Se crea antes una copia de seguridad.','Eliminar bloqueo',async()=>{
      await api(`/api/busy-blocks/${encodeURIComponent(id)}`,'DELETE',{confirm:true});await refresh();await render();toast('Bloque eliminado.');
    },true);
  }

  function _deleteSchedule(id) {confirmAction('¿Eliminar esta planificación?','Se eliminarán las próximas sesiones no realizadas de este horario. Las sesiones pasadas y las ya realizadas se conservan en el historial. Se creará una copia de seguridad antes del cambio.','Eliminar planificación',async()=>{await api(`/api/schedules/${id}`,'DELETE',{confirm:true});await refresh();await render();toast('Planificación eliminada.');},true);}

  return { renderPlanning: _renderPlanning, renderReports: _renderReports, scheduleDraft: _scheduleDraft, busyDraft: _busyDraft, scheduleModal: _scheduleModal, calendarCreateModal: _calendarCreateModal, busyModal: _busyModal, deleteBusy: _deleteBusy, deleteSchedule: _deleteSchedule };
}
