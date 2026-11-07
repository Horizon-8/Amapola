// Classes views and actions. Dependencies are supplied by app.js.
export function createClassesUI(context) {
  const { $, S, avatar, cancelBtn, classStatusNames, empty, end, esc, fmtDate, formData, fullname, heading, icon, min, modalityBadge, modalityNames, money, newClass, nextClassStatus, paymentLabels, paymentMethodNames, paymentState, priceInput, studentBy, submitBtn } = context;
  const api = (...args) => context.api(...args);
  const chooseScope = (...args) => context.chooseScope(...args);
  const classClock = (...args) => context.classClock(...args);
  const classStatusPill = (...args) => context.classStatusPill(...args);
  const classTable = (...args) => context.classTable(...args);
  const confirmAction = (...args) => context.confirmAction(...args);
  const confirmConflicts = (...args) => context.confirmConflicts(...args);
  const conflictMarkup = (...args) => context.conflictMarkup(...args);
  const cycleClassStatus = (...args) => context.cycleClassStatus(...args);
  const deleteSession = (...args) => context.deleteSession(...args);
  const findSession = (...args) => context.findSession(...args);
  const googleClassOrigin = (...args) => context.googleClassOrigin(...args);
  const inputField = (...args) => context.inputField(...args);
  const modal = (...args) => context.modal(...args);
  const parsePrice = (...args) => context.parsePrice(...args);
  const paymentModal = (...args) => context.paymentModal(...args);
  const paymentPill = (...args) => context.paymentPill(...args);
  const refresh = (...args) => context.refresh(...args);
  const render = (...args) => context.render(...args);
  const renderClasses = (...args) => context.renderClasses(...args);
  const selectField = (...args) => context.selectField(...args);
  const sessionDraft = (...args) => context.sessionDraft(...args);
  const sessionModal = (...args) => context.sessionModal(...args);
  const setupConflicts = (...args) => context.setupConflicts(...args);
  const statusBadge = (...args) => context.statusBadge(...args);
  const textField = (...args) => context.textField(...args);
  const toast = (...args) => context.toast(...args);
  const validateSlot = (...args) => context.validateSlot(...args);

  function _statusBadge(row) {
    return classStatusPill(row);
  }

  function _classStatusPill(row,compact=false) {
    const status=row.status||'planned',label=classStatusNames[status],next=classStatusNames[nextClassStatus(status)];
    const symbol=status==='planned'?'question':status==='cancelled'?'cancel':status==='completed'?'checks':'check';
    return `<button type="button" class="class-status ${status} ${compact?'compact':''}" data-action="class-status" data-id="${esc(row.id)}" data-class-status="${status}" aria-label="Clase de ${esc(row.studentName||fullname(studentBy(row.studentId)))}: ${label}. Cambiar a ${next}" title="${label}. Clic: ${next}. Cambia solo esta sesión."><span class="pill-icon" aria-hidden="true">${icon(symbol)}</span>${compact?'':`<span>${label}</span>`}</button>`;
  }

  async function _cycleClassStatus(id,button) {
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

  function _classClock() {
    const date=new Date(),timeZone=S.settings.timezone;
    return {today:new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),time:new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)};
  }

  function _paymentPill(row,compact=false) {
    const clock=classClock(),state=paymentState(row,clock.today,clock.time),label=paymentLabels[state];
    return `<button type="button" class="payment-pill ${state} ${compact?'compact':''}" data-action="payment" data-id="${esc(row.id)}" data-payment-state="${state}" aria-label="Pago de ${esc(row.studentName||fullname(studentBy(row.studentId)))}: ${label}. Registrar pago" title="${label} · ${paymentMethodNames[row.paymentMethod||'']}"><span class="pill-icon" aria-hidden="true">${icon('dollar')}</span>${compact?'':`<span>${label}</span>`}</button>`;
  }

  function _findSession(id) { return [...(S.rows||[]),...(S.history||[])].find(r=>r.id===id); }

  function _validateSlot(v) {
    if(!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(v.time)||!Number.isInteger(v.duration)||v.duration<15||v.duration>720||v.duration%15) throw new Error('El inicio y la duración deben ser múltiplos de 15 minutos.');
    if(min(v.time)+v.duration>1440)throw new Error('La clase debe terminar el mismo día.');
  }

  function _classTable(rows) {
    if(!rows.length)return empty('No hay clases en esta selección','Cambia el periodo o los filtros para consultar otras clases.');
    return `<div class="table-scroll"><table><thead><tr><th>Fecha y hora</th><th>Alumno / clase</th><th>Modalidad</th><th>Estado de clase</th><th>Pago</th><th>Método de pago</th><th>Tarifa</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.date,{day:'numeric',month:'short',year:'numeric'})}<div class="student-secondary">${r.time} – ${end(r)} · ${r.duration} min</div></td><td><a class="student-cell" href="#alumnos/${r.studentId}">${avatar(studentBy(r.studentId))}<div><div class="student-name">${esc(r.studentName||fullname(studentBy(r.studentId)))}</div><div class="student-secondary">${esc(r.title)}</div></div></a></td><td>${modalityBadge(r)}</td><td>${statusBadge(r)}</td><td>${paymentPill(r)}</td><td>${esc(paymentMethodNames[r.paymentMethod||''])}</td><td>${money(r.price)}</td><td><div class="row-actions"><button class="icon-button" data-action="edit-session" data-id="${esc(r.id)}" aria-label="Editar clase del ${r.date}">${icon('edit')}</button><button class="icon-button delete-class" data-action="delete-session" data-id="${esc(r.id)}" aria-label="Eliminar solo esta clase del ${r.date}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }

  function _renderClasses(data) {
    S.rows=data.rows;S.classPage=data.page;
    const f=S.classFilters;
    return heading('HISTORIAL Y SEGUIMIENTO DE PAGOS','Clases','Todas tus clases y sus pagos, sin tener que abrir cada alumno.',newClass())+
      `<div class="tabs">${[['past','Clases pasadas'],['future','Próximas clases'],['all','Todas']].map(([key,label])=>`<button class="tab ${S.classPeriod===key?'active':''}" data-action="class-period" data-period="${key}">${label}</button>`).join('')}</div>`+
      `<section class="panel"><form id="class-filters" class="class-filters">${inputField('from','Desde',f.from,'date','min="2000-01-01" max="2100-12-31"')}${inputField('to','Hasta',f.to,'date','min="2000-01-01" max="2100-12-31"')}${selectField('student','Alumno',f.student,[['','Todos los alumnos'],...S.students.map(s=>[s.id,fullname(s)])])}${selectField('payment','Pago',f.payment,[['all','Todos los pagos'],['paid','Pagadas'],['unpaid','Sin pagar'],['overdue','Vencidas sin pagar'],['pending','Pendientes futuras']])}${selectField('method','Método',f.method,[['','Todos los métodos'],...Object.entries(paymentMethodNames).filter(([key])=>key)])}${selectField('status','Estado de clase',f.status,[['','Todos los estados'],...Object.entries(classStatusNames)])}<div class="button-row"><button class="btn primary" type="submit">Aplicar filtros</button><button class="btn" type="button" data-action="class-clear">Limpiar</button></div></form></section>`+
      `<div class="stats payment-totals"><div class="stat-card"><div class="stat-top">Pagado</div><div class="stat-value">${money(data.totals.paid)}</div></div><div class="stat-card"><div class="stat-top">Vencido sin pagar</div><div class="stat-value">${money(data.totals.overdue)}</div></div><div class="stat-card"><div class="stat-top">Pendiente futuro</div><div class="stat-value">${money(data.totals.pending)}</div></div></div>`+
      `<section class="panel"><div class="panel-header"><h2>${data.total} clases</h2><span class="small-text muted">Totales de toda la selección · ${S.classPeriod==='past'?'Histórico completo':`Próximas hasta ${fmtDate(data.futureUntil,{day:'numeric',month:'short',year:'numeric'})}`}</span></div>${classTable(data.rows)}<div class="panel-header pagination"><button class="btn small" data-action="class-prev" ${data.page<=1?'disabled':''}>${icon('left')} Anterior</button><span class="muted small-text">Página ${data.page} de ${data.pages} · 50 por página</span><button class="btn small" data-action="class-next" ${data.page>=data.pages?'disabled':''}>Siguiente ${icon('right')}</button></div></section><p class="inline-help">Pulsa la pastilla $ para registrar el pago. Blanco: pendiente; verde: pagada; rojo: la clase terminó y sigue sin pagar. Las canceladas sin pago y las gratuitas no generan deuda.</p>`;
  }

  function _sessionDraft(form,row) { const v=formData(form);v.studentId=row.studentId;v.duration=Number(v.duration);v.price=parsePrice(v.price);validateSlot(v);delete v.overlapAccepted;return v; }

  function _sessionModal(id) {
    const r=findSession(id);if(!r)return;
    modal('Detalles de la clase',esc(r.studentName||fullname(studentBy(r.studentId))),`${googleClassOrigin(r)}<div class="field-grid">${inputField('title','Nombre de la clase',r.title,'text','required maxlength="150"')}${selectField('status','Estado de clase',r.status,Object.entries(classStatusNames))}${inputField('date','Fecha',r.date,'date','required min="2000-01-01" max="2100-12-31"')}${inputField('time','Hora de inicio',r.time,'time','required step="900"')}${inputField('duration','Duración (minutos, de 15 en 15)',r.duration,'number','required min="15" max="720" step="15"')}${inputField('price',`Tarifa de esta sesión (${S.settings.currency})`,priceInput(r.price),'text','required inputmode="decimal"')}${selectField('modality','Modalidad',r.modality,Object.entries(modalityNames))}<div></div>${selectField('paymentStatus','Estado de pago',r.paymentStatus||'unpaid',[['unpaid','Sin pagar'],['paid','Pagada']])}${selectField('paymentMethod','Método de pago',r.paymentMethod||'',Object.entries(paymentMethodNames))}${textField('notes','Notas de la sesión',r.notes,'maxlength="4000"')}</div><p class="help-text">Si cambias el horario, la duración o los detalles, podrás elegir el alcance antes de guardar. El pago y el estado de clase se registran siempre por sesión. El precio no se recalcula al cambiar la duración.</p>`,`<button type="button" class="btn danger" data-action="delete-session" data-id="${esc(id)}">${icon('trash')} Eliminar esta sesión</button>`+cancelBtn+submitBtn('Guardar cambios'),async form=>{
      const v=sessionDraft(form,r);
      if(v.paymentStatus==='paid'&&!v.paymentMethod)throw new Error('Selecciona el método de pago.');
      const changed=['title','date','time','duration','price','modality','notes'].some(key=>v[key]!==r[key]);
      if(changed){chooseScope(r,v);return;}
      await confirmConflicts(form);
      await api(`/api/sessions/${encodeURIComponent(id)}`,'PUT',v);$('#dialog').close();await refresh();await render();toast('Clase actualizada.');
    });
    setupConflicts('session',id,form=>sessionDraft(form,r));
  }

  function _chooseScope(row,draft) {
    const rule=S.schedules.find(s=>s.id===row.scheduleId),clock=classClock();
    const started=row.date<clock.today||(row.date===clock.today&&row.time<clock.time);
    const targetPast=draft.date<clock.today||(draft.date===clock.today&&draft.time<clock.time);
    const following=rule?.active&&['weekly','biweekly'].includes(rule.recurrence)&&row.originalDate>=clock.today&&!started&&!targetPast;
    modal('¿A qué clases se aplica el cambio?',esc(row.studentName||fullname(studentBy(row.studentId))),`<div class="change-summary"><strong>${fmtDate(draft.date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${draft.time} – ${end(draft)} · ${draft.duration} minutos</span></div><fieldset class="scope-choices"><legend>Aplicar el cambio a</legend><label><input type="radio" name="scope" value="session" checked><span><strong>Solo esta sesión</strong><small>Las demás clases mantienen su planificación.</small></span></label><label class="${following?'':'unavailable'}"><input type="radio" name="scope" value="following" ${following?'':'disabled'}><span><strong>Esta y las siguientes de la planificación</strong><small>${following?'Se actualiza el horario de la planificación a partir de esta clase. El historial y las excepciones individuales se conservan.':'Disponible para clases recurrentes que todavía no han comenzado y no se mueven al pasado.'}</small></span></label></fieldset><p class="help-text">El importe por sesión se conserva al mover o ajustar la duración. Los pagos existentes se mantienen y nunca se aplican automáticamente a otras clases.</p>`,cancelBtn+submitBtn('Confirmar cambio'),async form=>{
      validateSlot(draft);
      await confirmConflicts(form);
      await api(`/api/sessions/${encodeURIComponent(row.id)}/change`,'PUT',{...draft,scope:form.elements.scope.value});
      $('#dialog').close();await refresh();await render();toast('Cambio guardado.');
    });
    setupConflicts('session',row.id,form=>({...draft,scope:form.elements.scope.value}));
  }

  function _paymentModal(id) {
    const row=findSession(id);if(!row)return;
    modal('Registrar pago',`${esc(row.studentName||fullname(studentBy(row.studentId)))} · ${fmtDate(row.date)} · ${row.time}`,`<p class="payment-amount">${money(row.price)}</p><div class="field-grid">${selectField('paymentStatus','Estado de pago',row.paymentStatus||'unpaid',[['unpaid','Sin pagar'],['paid','Pagada']])}${selectField('paymentMethod','Método de pago',row.paymentMethod||'',Object.entries(paymentMethodNames))}</div><p class="help-text">Este pago corresponde únicamente a esta sesión. También puedes registrar un pago anticipado de una clase futura.</p>`,cancelBtn+submitBtn('Guardar pago'),async form=>{
      const v=formData(form);if(v.paymentStatus==='paid'&&!v.paymentMethod)throw new Error('Selecciona el método de pago.');
      await api(`/api/sessions/${encodeURIComponent(id)}/payment`,'PUT',v);$('#dialog').close();await refresh();await render();toast('Pago actualizado.');
    });
  }

  function _deleteSession(id) {
    const row=findSession(id);if(!row)return;
    const name=esc(row.studentName||fullname(studentBy(row.studentId)));
    confirmAction('¿Eliminar solo esta sesión?',`Se eliminará la clase de <strong>${name}</strong> del ${fmtDate(row.date)} a las ${row.time}. Las demás sesiones y la planificación se conservan.${row.paymentStatus==='paid'?'<br><br>Esta clase tiene un pago registrado; también dejará de aparecer en los totales de pago.':''}<br><br>Se guarda una copia de seguridad antes de eliminar.`,'Eliminar esta sesión',async()=>{
      await api(`/api/sessions/${encodeURIComponent(id)}`,'DELETE',{confirm:true});await refresh();await render();toast('Sesión eliminada. Las demás clases se conservan.');
    },true);
  }

  return { statusBadge: _statusBadge, classStatusPill: _classStatusPill, cycleClassStatus: _cycleClassStatus, classClock: _classClock, paymentPill: _paymentPill, findSession: _findSession, validateSlot: _validateSlot, classTable: _classTable, renderClasses: _renderClasses, sessionDraft: _sessionDraft, sessionModal: _sessionModal, chooseScope: _chooseScope, paymentModal: _paymentModal, deleteSession: _deleteSession };
}
