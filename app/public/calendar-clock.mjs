// Calendar hours follow the workspace timezone, independently of the PC timezone.
export function calendarMoment(timeZone, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return {
    today: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60,
  };
}

export function attachCalendarClock(root, { timeZone, onDayChange = () => {}, now = () => new Date() }) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const controller = new win.AbortController();
  const lanes = [...root.querySelectorAll('.day-lane')];
  const headers = [...root.closest('.calendar').querySelectorAll('.calendar-day[data-date]')];
  const scale = Number(root.dataset.scale);
  const marker = doc.createElement('div');
  marker.className = 'calendar-now-indicator';
  marker.setAttribute('role', 'img');
  let lastDay;
  const update = () => {
    const clock = calendarMoment(timeZone, now());
    if (clock.today !== lastDay) {
      lastDay = clock.today;
      for (const element of [...lanes, ...headers]) element.classList.toggle('today', element.dataset.date === clock.today);
      onDayChange(clock.today);
    }
    const lane = lanes.find(element => element.dataset.date === clock.today);
    if (!lane) { marker.remove(); return; }
    if (marker.parentElement !== lane) lane.append(marker);
    marker.style.top = `${clock.minutes * scale}px`;
    marker.setAttribute('aria-label', `Ahora: ${clock.time}`);
  };
  update();
  // Re-read the wall clock so sleep, background throttling and clock changes do not accumulate drift.
  const timer = win.setInterval(update, 30000);
  const options = { signal: controller.signal };
  win.addEventListener('focus', update, options);
  win.addEventListener('pageshow', update, options);
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) update(); }, options);
  return () => { win.clearInterval(timer); controller.abort(); marker.remove(); };
}
