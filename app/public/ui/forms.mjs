// Forms views and actions. Dependencies are supplied by app.js.
export function createFormsUI(context) {
  const { $, cancelBtn, end, esc, fmtDate, icon } = context;
  const api = (...args) => context.api(...args);
  const confirmAction = (...args) => context.confirmAction(...args);
  const confirmConflicts = (...args) => context.confirmConflicts(...args);
  const conflictMarkup = (...args) => context.conflictMarkup(...args);
  const inputField = (...args) => context.inputField(...args);
  const modal = (...args) => context.modal(...args);
  const selectField = (...args) => context.selectField(...args);
  const setupConflicts = (...args) => context.setupConflicts(...args);
  const textField = (...args) => context.textField(...args);
  const toast = (...args) => context.toast(...args);

  function _inputField(name,label,value='',type='text',extra='',help='') { return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>${help?`<small>${help}</small>`:''}</div>`; }

  function _selectField(name,label,value,options,extra='') { return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}" ${extra}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`; }

  function _textField(name,label,value='',extra='') { return `<div class="field full"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" maxlength="6000" ${extra}>${esc(value)}</textarea></div>`; }

  function _modal(title,subtitle,body,footer,submit) {
    const dialog=$('#dialog');
    $('#dialog-content').innerHTML=`<form id="modal-form"><div class="dialog-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Cerrar">${icon('close')}</button></div><div class="dialog-body">${body}<div id="modal-error" class="form-error" role="alert"></div></div><div class="dialog-footer">${footer}</div></form>`;
    dialog.setAttribute('aria-labelledby','dialog-title');
    $('#modal-form').addEventListener('submit',async ev=>{ev.preventDefault();const button=$('#modal-form button[type=submit]');if(button)button.disabled=true;$('#modal-error').textContent='';try{await submit(ev.target);}catch(e){if($('#modal-error'))$('#modal-error').textContent=e.message;else toast(e.message,true);}finally{if(button)button.disabled=false;}});
    if(!dialog.open)dialog.showModal();
  }

  function _conflictMarkup(result, accepted=false) {
    if(!result.total)return `<p class="overlap-clear">${icon('check')} Sin solapamientos${result.recurring?' en la planificación':''}.</p>`;
    return `<div class="overlap-notice"><strong>${icon('info')} Cuidado: este horario coincide con ${result.total} ${result.total===1?'actividad':'actividades'}.</strong><ul>${result.conflicts.map(r=>`<li><strong>${esc(r.kind==='busy'?`Ocupada: ${r.title}`:`Clase con ${r.studentName}`)}</strong><span>${fmtDate(r.date,{day:'numeric',month:'short',year:'numeric'})} · ${r.time} - ${end(r)}${r.kind==='busy'?'':` · ${esc(r.title)}`}</span></li>`).join('')}</ul>${result.total>result.conflicts.length?`<p>Se muestran las primeras ${result.conflicts.length} coincidencias.</p>`:''}${result.recurring?'<p>Se comprueban todas las repeticiones de la planificación.</p>':''}<label class="checkbox-field"><input type="checkbox" name="overlapAccepted" ${accepted?'checked':''}>Quiero guardar aunque haya solapamientos.</label></div>`;
  }

  function _setupConflicts(kind,id,readValue) {
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

  async function _confirmConflicts(form) {
    if(!form.checkConflicts||!await form.checkConflicts())throw new Error('El horario cambió durante la comprobación. Revisa los datos y vuelve a guardar.');
  }

  function _confirmAction(title,message,label,callback,danger=false) {
    modal(title,'',`<p class="small-text">${message}</p>`,cancelBtn+`<button type="submit" class="btn ${danger?'danger':'primary'}">${label}</button>`,async()=>{await callback();$('#dialog').close();});
  }

  return { inputField: _inputField, selectField: _selectField, textField: _textField, modal: _modal, conflictMarkup: _conflictMarkup, setupConflicts: _setupConflicts, confirmConflicts: _confirmConflicts, confirmAction: _confirmAction };
}
