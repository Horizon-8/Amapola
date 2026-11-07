// Students views and actions. Dependencies are supplied by app.js.
export function createStudentsUI(context) {
  const { $, $$, S, avatar, cancelBtn, channelBadge, channelNames, days, empty, end, esc, fmtDate, formData, fullname, heading, icon, modalityBadge, money, newClass, palette, priceInput, studentBadge, studentBy, studentStatus, studentStatusNames, submitBtn } = context;
  const api = (...args) => context.api(...args);
  const parsePrice = (...args) => context.parsePrice(...args);
  const classTable = (...args) => context.classTable(...args);
  const confirmAction = (...args) => context.confirmAction(...args);
  const contactLinks = (...args) => context.contactLinks(...args);
  const deleteStudent = (...args) => context.deleteStudent(...args);
  const fillStudentTable = (...args) => context.fillStudentTable(...args);
  const inputField = (...args) => context.inputField(...args);
  const linkedNotes = (...args) => context.linkedNotes(...args);
  const modal = (...args) => context.modal(...args);
  const noteLinks = (...args) => context.noteLinks(...args);
  const refresh = (...args) => context.refresh(...args);
  const render = (...args) => context.render(...args);
  const renderStudent = (...args) => context.renderStudent(...args);
  const renderStudents = (...args) => context.renderStudents(...args);
  const scheduleTable = (...args) => context.scheduleTable(...args);
  const selectField = (...args) => context.selectField(...args);
  const studentModal = (...args) => context.studentModal(...args);
  const textField = (...args) => context.textField(...args);
  const toast = (...args) => context.toast(...args);
  const webLink = (...args) => context.webLink(...args);

  function _webLink(value) {
    try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password ? u.href : ''; } catch { return ''; }
  }

  function _noteLinks(value) { return (String(value||'').match(/https?:\/\/[^\s<>"']+/gi)||[]).map(v=>v.replace(/[.,;!?]+$/,'')).filter(webLink); }

  function _linkedNotes(value) {
    const source=String(value||''); let result='',offset=0;
    for(const match of source.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
      const url=match[0].replace(/[.,;!?]+$/,'');
      result+=esc(source.slice(offset,match.index));
      result+=webLink(url)?`<a href="${esc(webLink(url))}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`:esc(url);
      offset=match.index+url.length;
    }
    return result+esc(source.slice(offset));
  }

  function _contactLinks(s) {
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

  function _renderStudents() {
    return heading('PERSONAS QUE APRENDEN CONTIGO','Alumnos','Alumnos y contactos con los que estás conversando, en un mismo lugar.',`<button class="btn primary" data-action="new-student">${icon('plus')} Nuevo alumno</button>`)+`<div class="tabs student-status-tabs">${[['all','Todos'],['active','Activos'],['prospect','En conversación'],['inactive','Inactivos']].map(([key,label])=>`<button class="tab ${S.active===key?'active':''}" data-action="student-filter" data-status="${key}">${label} <span class="muted">(${S.students.filter(s=>key==='all'||studentStatus(s)===key).length})</span></button>`).join('')}</div><section class="panel"><div class="toolbar"><div class="search">${icon('search')}<input id="student-search" aria-label="Buscar alumnos" placeholder="Buscar por nombre, correo o teléfono…" value="${esc(S.search)}"></div><div class="button-row"><select id="student-channel" class="filter-select" aria-label="Filtrar por canal"><option value="all">Todos los canales</option>${Object.entries(channelNames).map(([v,l])=>`<option value="${v}" ${S.channel===v?'selected':''}>${l}</option>`).join('')}</select><select id="student-active" class="filter-select" aria-label="Filtrar por estado"><option value="all">Todos los alumnos</option><option value="active" ${S.active==='active'?'selected':''}>Activos</option><option value="prospect" ${S.active==='prospect'?'selected':''}>En conversación</option><option value="inactive" ${S.active==='inactive'?'selected':''}>Inactivos</option></select></div></div><div id="students-table"></div></section><p class="inline-help">Cada alumno tiene su propio color. Lo reconocerás también en el calendario.</p>`;
  }

  function _fillStudentTable() {
    const q=S.search.trim().toLocaleLowerCase('es');
    const rows=S.students.filter(s=>(!q||[s.firstName,s.lastName,s.email,s.phone,s.messenger,s.notes].join(' ').toLocaleLowerCase('es').includes(q))&&(S.channel==='all'||s.channel===S.channel)&&(S.active==='all'||studentStatus(s)===S.active)).sort((a,b)=>fullname(a).localeCompare(fullname(b),'es'));
    const target=$('#students-table');if(!target)return;
    target.innerHTML=rows.length?`<div class="table-scroll"><table><thead><tr><th>Alumno</th><th>Contacto</th><th>Canal preferido</th><th>Planificación</th><th>Estado</th><th><span class="muted">Acciones</span></th></tr></thead><tbody>${rows.map(s=>`<tr><td><a href="#alumnos/${s.id}" class="student-cell">${avatar(s)}<div><div class="student-name">${esc(fullname(s))}</div><div class="student-secondary">Ver ficha del alumno</div></div></a></td><td>${esc(s.phone||'—')}<div class="student-secondary">${esc(s.email)}</div>${contactLinks(s)}</td><td>${channelBadge(s)}</td><td>${S.schedules.filter(p=>p.studentId===s.id&&p.active&&(!p.endDate||p.endDate>=S.today)&&(p.recurrence!=='once'||p.startDate>=S.today)).length} horarios</td><td>${studentBadge(s)}</td><td><button class="icon-button" data-action="edit-student" data-id="${s.id}" aria-label="Editar ${esc(fullname(s))}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`:empty(S.students.length?'No hay coincidencias':'Aquí empieza cada nueva historia',S.students.length?'Prueba otra búsqueda o cambia los filtros.':'Crea la ficha de tu primer alumno y elige un color para identificar sus clases.',`<button class="btn primary" data-action="new-student">${icon('plus')} Nuevo alumno</button>`);
  }

  function _scheduleTable(rows) {
    if(!rows.length)return empty('Todavía no hay horarios','Planifica una clase puntual o un horario que se repita cada semana.');
    return `<div class="table-scroll"><table><thead><tr><th>Clase / alumno</th><th>Día y horario</th><th>Repetición</th><th>Modalidad</th><th>Tarifa / sesión</th><th></th></tr></thead><tbody>${rows.map(p=>{const s=studentBy(p.studentId);return `<tr><td><div class="student-cell"><span class="color-dot" style="--student:${esc(s.color)}"></span><div><div class="student-name">${esc(p.title)}</div><a class="student-secondary" href="#alumnos/${s.id}">${esc(fullname(s))}</a></div></div></td><td>${p.recurrence==='once'?fmtDate(p.startDate):days[p.weekday]}<div class="student-secondary">${p.time} – ${end(p)} · ${p.duration} min</div></td><td><span class="badge">${icon(p.recurrence!=='once'?'repeat':'calendar')}${p.recurrence==='biweekly'?'Cada dos semanas':p.recurrence==='weekly'?'Cada semana':'Una vez'}</span><div class="student-secondary">Desde ${fmtDate(p.startDate)}${p.endDate?` hasta ${fmtDate(p.endDate)}`:''}${!p.active?' · Pausada':''}</div></td><td>${modalityBadge(p)}</td><td>${money(p.price)}</td><td><div class="row-actions"><button class="icon-button" data-action="edit-schedule" data-id="${p.id}" aria-label="Editar planificación de ${esc(fullname(s))}">${icon('edit')}</button><button class="icon-button" data-action="delete-schedule" data-id="${p.id}" aria-label="Eliminar planificación de ${esc(fullname(s))}">${icon('trash')}</button></div></td></tr>`;}).join('')}</tbody></table></div>`;
  }

  function _renderStudent(s,history) {
    const plans=S.schedules.filter(p=>p.studentId===s.id).sort((a,b)=>a.weekday-b.weekday||a.time.localeCompare(b.time));
    S.history=history;S.rows=history;
    return `<a href="#alumnos" class="back-link">${icon('left')} Todos los alumnos</a>`+`<div class="page-heading"><div class="student-hero">${avatar(s,true)}<div><div class="eyebrow">FICHA DEL ALUMNO</div><h1>${esc(fullname(s))}</h1>${studentBadge(s)}</div></div><div class="button-row"><button class="btn" data-action="edit-student" data-id="${s.id}">${icon('edit')} Editar alumno</button><button class="icon-button" data-action="delete-student" data-id="${s.id}" aria-label="Eliminar alumno">${icon('trash')}</button></div></div><div class="detail-grid"><section class="panel"><div class="panel-header"><h2>Información de contacto</h2>${channelBadge(s)}</div><div class="panel-body">${contactLinks(s)}<div class="info-grid"><div><div class="info-label">Teléfono</div><div class="info-value">${esc(s.phone||'Sin especificar')}</div></div><div><div class="info-label">Email</div><div class="info-value">${esc(s.email||'Sin especificar')}</div></div><div><div class="info-label">Messenger</div><div class="info-value">${esc(s.messenger||'Sin especificar')}</div></div><div><div class="info-label">Tarifa habitual por clase</div><div class="info-value">${money(s.defaultPrice??0)}</div></div><div><div class="info-label">Color en el calendario</div><div class="legend-item"><span class="color-dot" style="--student:${esc(s.color)}"></span><span class="small-text">${esc(s.color)}</span></div></div></div></div></section><section class="panel"><div class="panel-header"><h2>Notas generales</h2>${icon('plan')}</div><div class="panel-body"><div class="notes-text">${linkedNotes(s.notes||'Añade aquí objetivos, preferencias o cualquier detalle que quieras recordar.')}</div></div></section></div><div class="tabs"><button class="tab ${S.studentTab==='planning'?'active':''}" data-action="student-planning">Planificación <span class="muted">(${plans.length})</span></button><button class="tab ${S.studentTab==='history'?'active':''}" data-action="student-history">Clases pasadas <span class="muted">(${history.length})</span></button></div>${S.studentTab==='planning'?`<section class="panel"><div class="panel-header"><div><h2>Horarios de ${esc(s.firstName)}</h2><p class="subtitle small-text">Clases puntuales y horarios recurrentes.</p></div>${s.stage==='prospect'?`<button class="btn primary" data-action="edit-student" data-id="${s.id}">Activar como alumno</button>`:newClass(s.id)}</div>${s.stage==='prospect'?'<p class="panel-body muted">Contacto en conversación. Usa sus enlaces para continuar el seguimiento. Cuando confirme las clases, cambia su estado a Activo.</p>':scheduleTable(plans)}</section>`:`<section class="panel"><div class="panel-header"><h2>Historial de clases</h2><span class="muted small-text">Las clases pasadas conservan su tarifa y horario.</span></div>${classTable(history)}</section>`}`;
  }

  function _studentModal(id) {
    const s=id?studentBy(id):{firstName:'',lastName:'',channel:'whatsapp',phone:'',email:'',messenger:'',notes:'',color:palette[S.students.length%palette.length],active:1,stage:S.active==='prospect'?'prospect':'student'};
    modal(id?'Editar alumno':'Un nuevo alumno','Guarda también los contactos que todavía están decidiendo si tomar clases.',`<div class="field-grid">${inputField('firstName','Nombre *',s.firstName,'text','required maxlength="100" autocomplete="given-name"')}${inputField('lastName','Apellidos',s.lastName,'text','maxlength="150" autocomplete="family-name"')}${selectField('channel','Canal de comunicación preferido',s.channel,Object.entries(channelNames))}${inputField('phone','Teléfono / WhatsApp',s.phone,'tel','maxlength="60" autocomplete="tel"','Para abrir WhatsApp, incluye + y el código de país (por ejemplo +57).')}${inputField('email','Email',s.email,'email','maxlength="254" autocomplete="email"')}${inputField('messenger','Nombre o enlace de Messenger',s.messenger,'text','maxlength="200"')}${inputField('defaultPrice',`Tarifa habitual por clase (${S.settings.currency})`,priceInput(s.defaultPrice??0),'text','inputmode=decimal','Se propone al crear una clase y se puede cambiar. No modifica las clases existentes.')}${selectField('studentState','Estado de seguimiento',studentStatus(s),Object.entries(studentStatusNames))}${textField('notes','Notas y enlaces de seguimiento',s.notes)}<div class="field full"><label for="color">Color en el calendario</label><div class="color-choices">${palette.map(c=>`<button type="button" class="color-choice ${s.color===c?'selected':''}" data-color="${c}" style="--student:${c}" aria-label="Elegir color ${c}"></button>`).join('')}<input type="color" id="color" name="color" value="${s.color}" aria-label="Color personalizado"></div></div></div><p class="help-text">En conversación: contacto potencial pendiente de seguimiento. Activo: alumno que toma clases. Inactivo: alumno que ya no toma clases. Solo los activos muestran futuras clases recurrentes; el historial se conserva. Pega enlaces completos de Messenger, Instagram u otros chats; los enlaces de las notas se pueden abrir desde la ficha.</p>`,cancelBtn+submitBtn(id?'Guardar cambios':'Crear alumno'),async form=>{
      const v=formData(form);v.defaultPrice=v.defaultPrice.trim()?parsePrice(v.defaultPrice):0;v.stage=v.studentState==='prospect'?'prospect':'student';v.active=v.studentState==='active';delete v.studentState;
      const row=await api(id?`/api/students/${id}`:'/api/students',id?'PUT':'POST',v);$('#dialog').close();await refresh();if(!id){S.studentTab='planning';location.hash=`alumnos/${row.id}`;}await render();toast(row.stage==='prospect'?'Contacto guardado en En conversación.':id?'Alumno actualizado.':'Alumno creado. Ahora puedes planificar sus clases.');
    });
    $$('[data-color]',$('#dialog')).forEach(b=>b.addEventListener('click',()=>{$('#color').value=b.dataset.color;$$('[data-color]').forEach(c=>c.classList.toggle('selected',c===b));}));
    $('#color').addEventListener('input',()=>$$('[data-color]').forEach(c=>c.classList.toggle('selected',c.dataset.color===$('#color').value)));
  }

  function _deleteStudent(id) {
    const s=studentBy(id);confirmAction('¿Eliminar este alumno?',`Se eliminarán <strong>${esc(fullname(s))}</strong>, sus planificaciones y todo su historial. Esta acción no se puede deshacer desde la ficha. Se creará una copia de seguridad antes de eliminarlo.<br><br>Si quieres conservar el historial, puedes desactivar al alumno desde «Editar alumno».`,'Eliminar alumno',async()=>{await api(`/api/students/${id}`,'DELETE',{confirm:true});await refresh();location.hash='alumnos';await render();toast('Alumno eliminado.');},true);
  }

  return { webLink: _webLink, noteLinks: _noteLinks, linkedNotes: _linkedNotes, contactLinks: _contactLinks, renderStudents: _renderStudents, fillStudentTable: _fillStudentTable, scheduleTable: _scheduleTable, renderStudent: _renderStudent, studentModal: _studentModal, deleteStudent: _deleteStudent };
}
