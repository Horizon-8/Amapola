import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarMoment, attachCalendarClock } from '../app/public/calendar-clock.mjs';

test('the current-time marker uses the workspace timezone, exact minutes and daylight-saving time', () => {
  const instant = new Date('2026-10-30T02:03:30Z');
  assert.deepEqual(calendarMoment('America/Bogota', instant), {today:'2026-10-29',time:'21:03',minutes:1263.5});
  assert.deepEqual(calendarMoment('Europe/Paris', instant), {today:'2026-10-30',time:'03:03',minutes:183.5});
  assert.equal(calendarMoment('America/Toronto', new Date('2026-11-01T05:45:00Z')).time, '01:45');
  assert.equal(calendarMoment('America/Toronto', new Date('2026-11-01T06:15:00Z')).time, '01:15');
  assert.deepEqual(calendarMoment('UTC', new Date('2026-10-30T00:00:00Z')), {today:'2026-10-30',time:'00:00',minutes:0});
});

function target() {
  const listeners = new Map();
  return {
    addEventListener(type, listener, {signal} = {}) {
      const entries = listeners.get(type) || new Set();
      entries.add(listener); listeners.set(type, entries);
      signal?.addEventListener('abort', () => entries.delete(listener), {once:true});
    },
    emit(type) { for (const listener of listeners.get(type) || []) listener(); },
  };
}
function element(date) {
  const classes = new Set();
  return {dataset:{date},style:{},attributes:{},parentElement:null,
    classList:{toggle(name, value) { if (value) classes.add(name); else classes.delete(name); },contains:name=>classes.has(name)},
    setAttribute(name, value) { this.attributes[name] = value; },
    append(child) { child.parentElement = this; },
    remove() { this.parentElement = null; },
  };
}

test('the clock advances without refresh, catches up after sleep and cleans up on leaving the calendar', () => {
  let tick, timerCleared = false, instant = new Date('2026-10-30T14:03:30Z');
  const marker = element(), lanes = ['2026-10-29','2026-10-30','2026-10-31'].map(element), headers = lanes.map(lane=>element(lane.dataset.date));
  const win = Object.assign(target(), {AbortController,
    setInterval(fn, delay) { assert.equal(delay,30000); tick=fn; return 17; },
    clearInterval(id) { assert.equal(id,17); timerCleared=true; },
  });
  const doc = Object.assign(target(), {defaultView:win,hidden:false,createElement:()=>marker});
  const root = {ownerDocument:doc,dataset:{scale:'0.8'},querySelectorAll:()=>lanes,closest:()=>({querySelectorAll:()=>headers})};
  const days = [];
  const dispose = attachCalendarClock(root, {timeZone:'UTC',now:()=>instant,onDayChange:day=>days.push(day)});
  assert.equal(marker.parentElement,lanes[1]);
  assert.equal(Number.parseFloat(marker.style.top),843.5*0.8);
  assert.equal(marker.attributes['aria-label'],'Ahora: 14:03');
  instant=new Date('2026-10-30T14:04:00Z');tick();
  assert.equal(Number.parseFloat(marker.style.top),844*0.8);
  instant=new Date('2026-10-30T20:37:00Z');doc.emit('visibilitychange');
  assert.equal(Number.parseFloat(marker.style.top),1237*0.8);
  instant=new Date('2026-10-30T20:39:00Z');win.emit('focus');
  assert.equal(marker.attributes['aria-label'],'Ahora: 20:39');
  instant=new Date('2026-10-31T00:00:00Z');tick();
  assert.equal(marker.parentElement,lanes[2]);assert.equal(marker.style.top,'0px');
  assert.equal(headers[1].classList.contains('today'),false);assert.equal(headers[2].classList.contains('today'),true);
  assert.deepEqual(days,['2026-10-30','2026-10-31']);
  instant=new Date('2026-11-01T00:01:00Z');tick();
  assert.equal(marker.parentElement,null);assert.ok(lanes.every(lane=>!lane.classList.contains('today')));
  instant=new Date('2026-10-30T10:00:00Z');win.emit('pageshow');assert.equal(marker.parentElement,lanes[1]);
  dispose();assert.equal(timerCleared,true);assert.equal(marker.parentElement,null);
  instant=new Date('2026-10-30T11:00:00Z');win.emit('focus');doc.emit('visibilitychange');win.emit('pageshow');
  assert.equal(marker.parentElement,null);
});
