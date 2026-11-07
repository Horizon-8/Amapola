// Calendar views and actions. Dependencies are supplied by app.js.
export function createCalendarUI(context) {
  const { S, avatar, calendarScale, empty, end, esc, fmtDate, heading, icon, min, modalityBadge, modalityIcon, modalityNames, money, newClass, num, plusDays, range, shortDays, studentBy } = context;
  const agenda = (...args) => context.agenda(...args);
  const calendarGrid = (...args) => context.calendarGrid(...args);
  const calendarRowVisible = (...args) => context.calendarRowVisible(...args);
  const calendarSyncControls = (...args) => context.calendarSyncControls(...args);
  const calendarVisibilityControls = (...args) => context.calendarVisibilityControls(...args);
  const classStatusPill = (...args) => context.classStatusPill(...args);
  const googleInboxPanel = (...args) => context.googleInboxPanel(...args);
  const layoutEvents = (...args) => context.layoutEvents(...args);
  const legend = (...args) => context.legend(...args);
  const paymentPill = (...args) => context.paymentPill(...args);
  const renderCalendar = (...args) => context.renderCalendar(...args);
  const statusBadge = (...args) => context.statusBadge(...args);
  const summary = (...args) => context.summary(...args);
  const weekControls = (...args) => context.weekControls(...args);

  function _weekControls(){return `<div class="calendar-controls"><button class="icon-button" data-action="prev-week" aria-label="Semana anterior">${icon('left')}</button><span class="calendar-range">${range(S.week)}</span><button class="icon-button" data-action="next-week" aria-label="Semana siguiente">${icon('right')}</button><button class="btn small" data-action="today">Hoy</button></div>`;}

  function _summary(report){return `<div class="stats"><div class="stat-card featured"><div class="stat-top"><span class="stat-icon">${icon('calendar')}</span>Esta semana</div><div class="stat-value">${report.current.count} <span style="font:14px 'Segoe UI',sans-serif">clases</span></div><div class="stat-caption">${num(report.current.hours)} horas para compartir conocimiento</div></div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${icon('money')}</span>Ingresos estimados</div><div class="stat-value">${money(report.current.total)}</div><div class="stat-caption">Según las clases de la semana seleccionada</div></div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${icon('users')}</span>Alumnos activos</div><div class="stat-value">${S.students.filter(s=>s.active).length}</div><div class="stat-caption"><a class="rose" href="#alumnos">Cada alumno, un camino diferente ${icon('right')}</a></div></div></div>`;}

  function _layoutEvents(events) {
    const result=[]; let group=[], boundary=-1;
    function flush(){if(!group.length)return;const lanes=[];for(const row of group){let lane=lanes.findIndex(v=>v<=min(row.time));if(lane<0)lane=lanes.length;lanes[lane]=min(row.time)+row.duration;row.lane=lane;}for(const row of group)result.push({...row,lanes:lanes.length});group=[];boundary=-1;}
    for(const original of [...events].sort((a,b)=>min(a.time)-min(b.time))){const row={...original};if(min(row.time)>=boundary)flush();group.push(row);boundary=Math.max(boundary,min(row.time)+row.duration);}flush();return result;
  }

  function _calendarGrid(rows) {
    const scale=calendarScale,height=1440*scale;
    const headers=Array.from({length:7},(_,i)=>{const d=plusDays(S.week,i);return `<div class="calendar-day ${d===S.today?'today':''}" data-date="${d}"><span>${shortDays[i]}</span><strong class="day-number">${Number(d.slice(-2))}</strong>${rows.filter(r=>r.date===d&&r.allDay).length?`<span class="google-all-day" title="${esc(rows.filter(r=>r.date===d&&r.allDay).map(r=>r.title).join(' · '))}">Busy · ${esc(rows.filter(r=>r.date===d&&r.allDay).map(r=>r.title).join(' · '))}</span>`:''}</div>`;}).join('');
    const labels=Array.from({length:24},(_,i)=>`<span class="hour-label" style="top:${i*60*scale}px">${String(i).padStart(2,'0')}:00</span>`).join('');
    const lines=Array.from({length:96},(_,i)=>`<span class="calendar-grid-line ${i%4===0?'hour':i%2===0?'half':'quarter'}" style="top:${i*15*scale}px"></span>`).join('');
    const lanes=Array.from({length:7},(_,i)=>{
      const date=plusDays(S.week,i),events=layoutEvents(rows.filter(r=>r.date===date));
      return `<div class="day-lane ${date===S.today?'today':''} ${i>4?'weekend':''}" data-date="${date}" style="height:${height}px">${events.map(r=>{
        const busy=r.kind==='busy',inline=r.duration<60;
        return `<div role="button" tabindex="0" class="calendar-event ${busy?'busy-event':r.status} ${r.source==='google'?'google-busy':''} ${r.needsAssignment?'google-pending':''} ${inline?'inline-event':''} ${r.duration<=15?'short-event':''}" data-action="${r.source==='google'?'google-event':busy?'edit-busy':'edit-session'}" data-read-only="${!!r.readOnly}" data-id="${esc(r.id)}" style="--student:${busy?'#a9b0bc':esc(r.color)};top:${min(r.time)*scale}px;height:${r.duration*scale}px;left:calc(${r.lane*100/r.lanes}% + 3px);width:calc(${100/r.lanes}% - 6px);z-index:${r.lane+2}" title="${busy?`Ocupada · ${esc(r.title)}`:`${esc(r.studentName)} · ${esc(r.title)} · ${modalityNames[r.modality]}`} · ${r.time}–${end(r)}" aria-label="${busy?`Ocupada: ${esc(r.title)}`:esc(r.studentName)}, ${r.time}. Arrastra para mover o pulsa para editar.">${r.readOnly?'':'<span class="resize-handle start" data-resize="start" title="Ajustar inicio"></span>'}<div class="event-top">${busy?`<span class="modality-icon busy" aria-hidden="true">${icon('clock')}</span>`:modalityIcon(r)}<span class="event-time">${r.time}${!inline&&r.duration>=90?` – ${end(r)}`:''}</span>${inline?`<span class="event-inline-name">${esc(busy?r.title:r.studentName)}</span>`:''}${busy?'':`<span class="event-actions">${classStatusPill(r,true)}${paymentPill(r,true)}</span>`}</div>${!inline?`<span class="event-name">${esc(busy?r.title:r.studentName)}</span>`:''}${r.duration>=90?`<span class="event-sub">${r.needsAssignment?'Google · Completar clase':r.source==='google'?'Busy · '+esc(r.calendarName):busy?'No disponible para clases':esc(r.title)}</span>`:''}${r.readOnly?'':'<span class="resize-handle finish" data-resize="end" title="Ajustar fin"></span>'}</div>`;
      }).join('')}</div>`;
    }).join('');
    return `<div class="calendar-scroll"><div class="calendar"><div class="calendar-days"><div></div>${headers}</div><div class="calendar-body" data-scale="${scale}"><div class="time-labels" style="height:${height}px">${labels}</div>${lanes}<div class="calendar-grid-lines" aria-hidden="true">${lines}</div></div></div></div>`;
  }

  function _legend(rows) {
    const ids=[...new Set(rows.filter(r=>r.kind!=='busy').map(r=>r.studentId))];
    return `<div class="calendar-legend">${ids.slice(0,7).map(id=>{const s=studentBy(id);return `<a class="legend-item" href="#alumnos/${id}"><span class="color-dot" style="--student:${esc(s.color)}"></span>${esc(s.firstName)}</a>`;}).join('')}<span class="legend-spacer"></span>${Object.entries(modalityNames).map(([k,v])=>`<span class="legend-item">${modalityIcon({modality:k})}${v}</span>`).join('')}<span class="legend-item"><span class="modality-icon busy">${icon('clock')}</span>Ocupada</span></div>`;
  }

  function _agenda(rows) {
    if(!rows.length)return empty('Una semana por escribir','Añade una clase o un bloqueo de disponibilidad para organizar tu semana.',newClass());
    return [...new Set(rows.map(r=>r.date))].map(date=>`<div class="agenda-day">${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}</div>${rows.filter(r=>r.date===date).map(r=>r.kind==='busy'?`<div class="agenda-item busy-agenda ${r.source==='google'?'google-busy':''} ${r.needsAssignment?'google-pending':''}" role="button" tabindex="0" data-action="${r.source==='google'?'google-event':'edit-busy'}" data-id="${esc(r.id)}"><div class="agenda-time">${r.time}<div class="student-secondary">${end(r)}</div></div><span class="modality-icon busy">${icon('clock')}</span><div class="agenda-info"><div class="student-name">${esc(r.title)}</div><div class="student-secondary">${r.needsAssignment?'Google · Completar clase':r.source==='google'?'Busy · '+esc(r.calendarName):'Ocupada · No disponible para clases'}</div></div><span class="badge">${r.duration} min</span>${icon('right')}</div>`:`<div class="agenda-item" role="button" tabindex="0" data-action="edit-session" data-id="${esc(r.id)}"><div class="agenda-time">${r.time}<div class="student-secondary">${end(r)}</div></div>${avatar(studentBy(r.studentId))}<div class="agenda-info"><div class="student-name">${esc(r.studentName)}</div><div class="student-secondary">${esc(r.title)} · ${r.duration} min</div></div>${modalityBadge(r)}${statusBadge(r)}${paymentPill(r)}<span class="price">${money(r.price)}</span>${icon('right')}</div>`).join('')}`).join('');
  }

  function _renderCalendar(rows,report,blocks=[]) {
    S.rows=rows;S.busyBlocks=blocks;
    const events=[...rows,...blocks].filter(calendarRowVisible).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return '<div class="calendar-page">'+heading('TU TIEMPO, CON INTENCIÓN','Calendario','Crea y organiza tus clases en intervalos de 15 minutos.',`<div class="button-row"><button class="btn busy-button" data-action="new-busy">${icon('clock')} Ocupada</button>${newClass()}</div>`)+summary(report)+googleInboxPanel()+`<section class="panel calendar-panel"><div class="panel-header calendar-toolbar">${weekControls()}<div class="calendar-tools">${calendarSyncControls()}${calendarVisibilityControls()}</div><div class="view-toggle" aria-label="Vista del calendario"><button class="${S.calendarMode==='week'?'active':''}" aria-pressed="${S.calendarMode==='week'}" data-action="calendar-week">${icon('calendar')} Semana</button><button class="${S.calendarMode==='agenda'?'active':''}" aria-pressed="${S.calendarMode==='agenda'}" data-action="calendar-agenda">${icon('plan')} Agenda</button></div></div>${S.calendarMode==='week'?calendarGrid(events):agenda(events)}${legend(events)}<div class="payment-legend"><span><span class="payment-dot paid">$</span> Pagada</span><span><span class="payment-dot overdue">$</span> Vencida sin pagar</span><span><span class="payment-dot pending">$</span> Pendiente / sin cobro</span></div></section><p class="calendar-mobile-hint">Desliza horizontalmente para ver todos los días. También puedes usar la vista Agenda.</p><p class="inline-help">${icon('info')} Pulsa o arrastra un espacio vacío para crear una clase o marcarte ocupada. Arrastra los bloques para moverlos y sus bordes para ajustar su duración. Los bloqueos grises son recordatorios de indisponibilidad y no generan ingresos.</p></div>`;
  }

  return { weekControls: _weekControls, summary: _summary, layoutEvents: _layoutEvents, calendarGrid: _calendarGrid, legend: _legend, agenda: _agenda, renderCalendar: _renderCalendar };
}
