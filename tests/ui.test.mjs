import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { paymentState, hasEnded } from '../app/public/class-utils.mjs';
import { attachCalendarGestures } from '../app/public/calendar-interactions.mjs';

function uiDefinitions() {
  const source=readFileSync(new URL('../app/public/app.js',import.meta.url),'utf8');
  return source.slice(source.indexOf('/* Amapola'),source.indexOf("document.addEventListener('click'"));
}
test('prospect filters, contact buttons and linked notes render safely and retain inactive separation',()=>{
  const elements={};
  const context=vm.createContext({URL,paymentState,hasEnded,window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>null},
    document:{querySelector:key=>elements[key]??=({value:'',addEventListener(){},querySelectorAll:()=>[]})}});
  vm.runInContext(uiDefinitions()+`
    const prospect={id:'p1',firstName:'Contacto <nuevo>',lastName:'',stage:'prospect',active:0,color:'#bc587a',channel:'whatsapp',phone:'+57 300 123 4567',email:'contacto@example.test',messenger:'https://m.me/contacto',notes:'Chat: https://example.test/chat?a=1&b=2 <script>alert(1)</script> javascript:alert(1)'};
    const inactive={...prospect,id:'i1',stage:'student',firstName:'Inactiva',notes:''};
    Object.assign(S,{students:[prospect,inactive],active:'prospect',today:'2026-10-21'});
    globalThis.tabs=renderStudents();fillStudentTable();
    globalThis.filtered=document.querySelector('#students-table').innerHTML;
    globalThis.profile=renderStudent(prospect,[]);
    globalThis.contacts=contactLinks(prospect);
    globalThis.unsafe=contactLinks({...prospect,messenger:'javascript:alert(1)',notes:'<img src=x onerror=alert(1)>'});
    S.active='inactive';fillStudentTable();globalThis.inactive=document.querySelector('#students-table').innerHTML;
    globalThis.forms=[];modal=(title,subtitle,body,footer)=>forms.push({title,body,footer});
    document.querySelectorAll=()=>[];studentModal('p1');
  `,context);
  assert.match(context.tabs,/data-status="prospect"/);assert.match(context.filtered,/Contacto &lt;nuevo&gt;/);assert.doesNotMatch(context.filtered,/Inactiva/);
  assert.match(context.inactive,/Inactiva/);assert.doesNotMatch(context.inactive,/Contacto &lt;nuevo&gt;/);
  assert.match(context.contacts,/https:\/\/wa.me\/573001234567/);assert.match(context.contacts,/mailto:contacto%40example.test/);
  assert.match(context.contacts,/href="https:\/\/m.me\/contacto"/);
  assert.match(context.profile,/href="https:\/\/example.test\/chat\?a=1&amp;b=2"/);
  assert.match(context.profile,/&lt;script&gt;/);assert.doesNotMatch(context.profile,/<script>|href="javascript:/);
  assert.doesNotMatch(context.unsafe,/javascript:|onerror=/);assert.match(context.profile,/Activar como alumno/);
  assert.match(context.forms[0].body,/name="studentState"/);assert.match(context.forms[0].body,/<option value="prospect" selected>/);
});

test('live warnings require explicit consent, recheck on save and invalidate consent after a change',async()=>{
  let response={conflicts:[{id:'b1',kind:'busy',date:'2026-11-01',time:'10:00',duration:60,title:'Cita <privada>'}],total:1,recurring:false};
  const handlers={},region={setAttribute(){},textContent:'',_html:'',set innerHTML(value){this._html=value;form.elements.overlapAccepted={checked:value.includes('name="overlapAccepted" checked')};},get innerHTML(){return this._html;}};
  const form={elements:{},isConnected:true,value:{date:'2026-11-01',time:'10:00',duration:60},checkValidity:()=>true,addEventListener:(type,fn)=>handlers[type]=fn};
  const context=vm.createContext({URL,paymentState,hasEnded,setTimeout:()=>1,clearTimeout(){},window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>null},
    document:{querySelector:key=>key==='#modal-form'?form:{before(){}},createElement:()=>region}});
  vm.runInContext(uiDefinitions()+`api=async()=>globalThis.response();setupConflicts('busy',null,form=>({...form.value}));`,Object.assign(context,{response:()=>response}));
  await assert.rejects(form.checkConflicts(),/Revisa las coincidencias/);
  assert.match(region.innerHTML,/Cita &lt;privada&gt;/);assert.match(region.innerHTML,/10:00 - 11:00/);
  form.elements.overlapAccepted.checked=true;
  assert.equal(await form.checkConflicts(),true);
  form.value.time='10:15';handlers.input({target:{name:'time'}});
  await assert.rejects(form.checkConflicts(),/Revisa las coincidencias/);
  form.elements.overlapAccepted.checked=true;
  response={...response,total:2,conflicts:[...response.conflicts,{...response.conflicts[0],id:'b2',title:'Nueva actividad'}]};
  await assert.rejects(form.checkConflicts(),/Revisa las coincidencias/);
  response={conflicts:[],total:0,recurring:true};assert.equal(await form.checkConflicts(),true);assert.match(region.innerHTML,/Sin solapamientos/);
});
test('one-click class status advances the three states and never opens the class or payment form',async()=>{
  const context=vm.createContext({paymentState,hasEnded,window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>null},document:{querySelector:()=>({textContent:'',className:''})}});
  vm.runInContext(uiDefinitions()+`
    S.students=[{id:'s1',firstName:'Ana',lastName:''}];
    S.rows=[{id:'r1',studentId:'s1',date:'2026-11-01',time:'10:00',duration:60,status:'planned',paymentStatus:'paid',paymentMethod:'cash'}];
    globalThis.calls=[];globalThis.button={disabled:false,isConnected:true};
    api=async(route,method,value)=>{calls.push({route,method,value});if(route==='/api/conflicts')return {total:0,conflicts:[]};S.rows[0].status=value.status;return S.rows[0];};
    refresh=async()=>{};render=async()=>{};toast=()=>{};modal=()=>{throw Error('Unexpected modal');};
    globalThis.cycle=()=>cycleClassStatus('r1',button);
  `,context);
  const first=context.cycle();await context.cycle();await first;
  assert.equal(context.calls.length,1);assert.equal(context.calls[0].value.status,'confirmed');
  await context.cycle();assert.equal(context.calls[1].value.status,'cancelled');
  await context.cycle();assert.equal(context.calls[2].route,'/api/conflicts');assert.equal(context.calls[3].value.status,'planned');
  assert.equal(vm.runInContext('S.rows[0].paymentStatus',context),'paid');
  assert.equal(vm.runInContext('S.rows[0].paymentMethod',context),'cash');
  assert.equal(context.button.disabled,false);
});

test('calendar, ledger, profile and creation forms render payment controls and quarter-hour fields',()=>{
  const source=readFileSync(new URL('../app/public/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const definitions=source.slice(source.indexOf('/* Amapola'),source.indexOf("document.addEventListener('click'"));
  const elements={};
  const context=vm.createContext({paymentState,hasEnded,window:{matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:()=>null},
    document:{querySelector:key=>elements[key]??=( {value:'weekly',disabled:false,addEventListener(){}} )}});
  vm.runInContext(definitions+`
    const clock=classClock();S.today=clock.today;
    const student={id:'s1',firstName:'Ana <prueba>',lastName:'Pérez',color:'#bc587a',active:1,channel:'whatsapp',notes:'',phone:'',email:'',messenger:''};
    const date=plusDays(S.today,3);Object.assign(S,{students:[student],schedules:[],week:weekOf(date),studentTab:'history'});
    const row={id:'r1',studentId:'s1',studentName:fullname(student),color:student.color,date,time:'08:15',duration:45,title:'Español',modality:'online',price:2500000,status:'planned',paymentStatus:'paid',paymentMethod:'cash'};
    const busy={id:'busy1',kind:'busy',date,time:'12:00',duration:60,title:'Almuerzo',notes:''};
    const report={current:{count:1,hours:0.75,total:row.price}};
    globalThis.rendered={calendar:renderCalendar([row],report,[busy]),profile:renderStudent(student,[row]),ledger:renderClasses({rows:[row],page:1,pages:1,total:1,totals:{paid:row.price,overdue:0,pending:0},futureUntil:date})};
    S.calendarMode='agenda';globalThis.busyAgenda=renderCalendar([row],report,[busy]);S.calendarMode='week';
    globalThis.modalityHTML=Object.keys(modalityNames).map(modality=>modalityBadge({modality})).join('');
    globalThis.shortClasses=[15,30,45].map(duration=>calendarGrid([{...row,duration}]))
    globalThis.channelHTML=Object.keys(channelNames).map(channel=>channelBadge({...student,channel})).join('');
    globalThis.statusHTML=[{...student,active:1},{...student,active:0},{...student,stage:'prospect',active:0}].map(studentBadge).join('');
    globalThis.classStates=['planned','confirmed','cancelled','completed'].map(status=>classStatusPill({...row,status},true));
    globalThis.dialogues=[];
    modal=(title,subtitle,body,footer)=>dialogues.push({title,body,footer});
    scheduleModal(null,'s1',{date,time:'08:15',duration:45});
    sessionModal('r1');
    paymentModal('r1');
    chooseScope(row,{...row,time:'09:00'});
    calendarCreateModal({date,time:'11:15',duration:30});
    busyModal(null,{date,time:'11:15',duration:30});
  `,context);
  assert.match(context.rendered.calendar,/data-resize="start"/);assert.match(context.rendered.calendar,/data-resize="end"/);
  assert.match(context.rendered.calendar,/payment-pill paid compact/);assert.match(context.rendered.calendar,/Ana &lt;prueba&gt;/);
  assert.match(context.rendered.profile,/Método de pago/);assert.match(context.rendered.ledger,/Efectivo/);
  assert.match(context.rendered.ledger,/id="class-filters"/);
  assert.match(context.dialogues[0].body,/value="08:15"/);assert.match(context.dialogues[0].body,/value="45"/);
  assert.match(context.dialogues[0].body,/step="900"/);assert.match(context.dialogues[0].body,/step="15"/);
  assert.match(context.dialogues[1].body,/name="paymentStatus"/);
  assert.match(context.dialogues[2].body,/name="paymentMethod"/);
  assert.match(context.dialogues[3].body,/Solo esta sesión/);
  assert.match(context.rendered.calendar,/data-action="edit-busy"/);assert.match(context.rendered.calendar,/Almuerzo/);
  assert.match(context.busyAgenda,/busy-agenda/);
  assert.equal((context.rendered.calendar.match(/class="calendar-grid-line /g)||[]).length,96);
  assert.match(context.rendered.calendar,/data-scale="0.8"/);
  for(let i=0;i<96;i++)assert.ok(context.rendered.calendar.includes(`style="top:${i*12}px"></span>`));
  for(const html of context.shortClasses){
    assert.match(html,/<span class="event-time">08:15<\/span><span class="event-inline-name">Ana &lt;prueba&gt; Pérez<\/span><span class="event-actions"><button/);
    assert.match(html,/data-action="class-status"/);assert.match(html,/class-status planned compact/);
    assert.match(html,/data-resize="start"/);assert.match(html,/data-resize="end"/);
  }
  for(const channel of ['whatsapp','messenger','instagram'])assert.ok(context.channelHTML.includes(`channel-badge ${channel}`));
  for(const state of ['active','inactive','prospect'])assert.ok(context.statusHTML.includes(`student-status ${state}`));
  assert.match(context.classStates[0],/aria-hidden="true">\?<\/span>/);
  assert.match(context.classStates[1],/class-status confirmed compact/);
  assert.match(context.classStates[2],/class-status cancelled compact/);
  assert.match(context.rendered.ledger,/data-action="delete-session"/);
  assert.match(context.dialogues[1].footer,/Eliminar esta sesión/);
  for(const type of ['online','home','travel'])assert.ok(context.modalityHTML.includes(`modality-icon ${type}`));
  assert.match(context.dialogues[4].body,/calendar-create-busy/);
  assert.match(context.dialogues[5].body,/value="11:15"/);assert.match(context.dialogues[5].body,/value="30"/);
});

function fakeTarget() {
  const handlers=new Map();
  return {addEventListener(type,fn,{signal}={}) { if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);signal?.addEventListener('abort',()=>handlers.set(type,handlers.get(type).filter(f=>f!==fn)),{once:true}); },
    emit(type,event) { for(const fn of handlers.get(type)||[])fn(event); }};
}
test('pointer gestures create, move, resize and cancel without persisting during the drag',t=>{
  const previous={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  t.after(()=>Object.assign(globalThis,previous));
  for(const scale of [0.8,1.5]) {
  const y=minute=>100+minute*scale;
  const classes={add(){},remove(){}},doc=fakeTarget();
  globalThis.document=Object.assign(doc,{body:{classList:classes},createElement:()=>({style:{},remove(){}})});
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  const makeLane=(date,left)=>({dataset:{date},getBoundingClientRect:()=>({top:100,bottom:2260,left,right:left+100}),append(){}});
  const lanes=[makeLane('2026-10-21',100),makeLane('2026-10-22',200)];
  const scroll={scrollTop:0,getBoundingClientRect:()=>({left:90,right:310,top:0,bottom:2000}),querySelector:()=>({getBoundingClientRect:()=>({bottom:100})})};
  const root=Object.assign(fakeTarget(),{dataset:{scale:String(scale)},querySelectorAll:()=>lanes,closest:()=>scroll,setPointerCapture(){},hasPointerCapture:()=>false});
  let clicked=0;const element={dataset:{id:'r1'},classList:classes,click(){clicked++;}};
  const row={id:'r1',date:'2026-10-21',time:'08:00',duration:60};
  const blank={closest:selector=>selector==='.day-lane'?lanes[0]:null};
  const block={closest:selector=>selector==='.day-lane'?lanes[0]:selector==='.calendar-event'?element:null};
  const handle={closest:selector=>selector==='[data-resize]'?{dataset:{resize:'end'}}:block.closest(selector)};
  const created=[],changed=[];
  const dispose=attachCalendarGestures(root,{rows:[row],onCreate:seed=>created.push(seed),onChange:(old,change)=>changed.push(change)});
  const event=(target,x,y)=>({target,button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}});
  const statusButton={closest:selector=>selector.includes('class-status')?{}:null};
  root.emit('pointerdown',event(statusButton,120,y(480)));root.emit('pointerup',event(statusButton,120,y(480)));
  assert.equal(clicked,0);assert.equal(created.length,0);assert.equal(changed.length,0);
  root.emit('pointerdown',event(blank,120,y(480)));assert.equal(created.length,0);
  root.emit('pointerup',event(blank,120,y(480)));assert.deepEqual(created[0],{date:'2026-10-21',time:'08:00',duration:60});
  root.emit('pointerdown',event(blank,120,y(480)));root.emit('pointermove',event(blank,120,y(500)));root.emit('pointerup',event(blank,120,y(500)));
  assert.deepEqual(created[1],{date:'2026-10-21',time:'08:00',duration:30});
  root.emit('pointerdown',event(block,120,y(490)));root.emit('pointermove',event(block,220,y(505)));assert.equal(changed.length,0);
  root.emit('pointerup',event(block,220,y(505)));assert.deepEqual(changed[0],{date:'2026-10-22',time:'08:15',duration:60});
  root.emit('pointerdown',event(handle,120,y(538)));root.emit('pointermove',event(handle,120,y(568)));root.emit('pointerup',event(handle,120,y(568)));
  assert.deepEqual(changed[1],{date:'2026-10-21',time:'08:00',duration:90});
  root.emit('pointerdown',event(block,120,y(490)));root.emit('pointermove',event(block,220,y(533)));doc.emit('keydown',{key:'Escape'});root.emit('pointerup',event(block,220,y(533)));
  assert.equal(changed.length,2);
  root.emit('pointerdown',event(block,120,y(490)));root.emit('pointerup',event(block,120,y(490)));assert.equal(clicked,1);
  dispose();
  }
});
