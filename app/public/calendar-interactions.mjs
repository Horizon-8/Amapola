import { toMinutes, toClock, clamp, selectionRange, moveRange, resizeRange } from './class-utils.mjs';

// Pointer capture keeps a drag continuous across events, columns and scrolls.
// Only the preview is changed until the user confirms the scope in the dialog.
export function attachCalendarGestures(root, { rows, onCreate, onChange }) {
  if (!root) return () => {};
  const controller = new AbortController(), signal = controller.signal;
  const lanes = [...root.querySelectorAll('.day-lane')];
  const scroll = root.closest('.calendar-scroll');
  const scale = Number(root.dataset.scale);
  let drag = null, preview = null, frame = 0, suppressUntil = 0;
  const minuteAt = (lane, y) => clamp((y - lane.getBoundingClientRect().top) / scale, 0, 1439);
  const laneAt = (x, y) => lanes.find(lane => { const r = lane.getBoundingClientRect(); return x >= r.left && x < r.right && y >= r.top && y <= r.bottom; });
  function cleanup() {
    cancelAnimationFrame(frame); frame = 0;
    preview?.remove(); preview = null;
    drag?.element?.classList.remove('drag-source');
    if (drag && root.hasPointerCapture(drag.pointerId)) root.releasePointerCapture(drag.pointerId);
    drag = null;
    document.body.classList.remove('calendar-dragging');
  }
  function paint() {
    if (!drag?.moved || !drag.valid) { preview?.remove(); preview = null; return; }
    if (!preview) { preview = document.createElement('div'); preview.className = 'calendar-preview'; }
    drag.lane.append(preview);
    preview.style.top = `${drag.range.start * scale}px`;
    preview.style.height = `${drag.range.duration * scale - 2}px`;
    preview.textContent = `${toClock(drag.range.start)} – ${toClock(drag.range.start + drag.range.duration)}`;
  }
  function update(x, y) {
    if (!drag) return;
    drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.initialX, y - drag.initialY) < 5) return;
    drag.moved = true;
    drag.element?.classList.add('drag-source');
    document.body.classList.add('calendar-dragging');
    const under = laneAt(x, y), visible = scroll.getBoundingClientRect();
    const headerBottom = scroll.querySelector('.calendar-days').getBoundingClientRect().bottom;
    drag.valid = !!under && y >= headerBottom && y <= visible.bottom;
    if (!drag.valid) { paint(); return; }
    if (drag.kind === 'create') {
      drag.lane = drag.initialLane;
      drag.range = selectionRange(drag.anchor, minuteAt(drag.initialLane, y));
    } else if (drag.kind === 'move') {
      drag.lane = under;
      drag.range = moveRange(toMinutes(drag.row.time), drag.row.duration, minuteAt(under, y) - drag.anchor);
    } else {
      drag.lane = drag.initialLane;
      drag.range = resizeRange(toMinutes(drag.row.time), drag.row.duration, drag.edge, minuteAt(drag.initialLane, y) - drag.anchor);
    }
    paint();
  }
  function autoScroll() {
    if (!drag) return;
    if (drag.moved) {
      const r = scroll.getBoundingClientRect();
      if (drag.x >= r.left && drag.x <= r.right) {
        const top = scroll.querySelector('.calendar-days').getBoundingClientRect().bottom;
        const amount = drag.y < top + 35 ? -12 : drag.y > r.bottom - 35 ? 12 : 0;
        if (amount) { scroll.scrollTop += amount; update(drag.x, drag.y); }
      }
    }
    frame = requestAnimationFrame(autoScroll);
  }
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag || event.target.closest('[data-action="payment"],[data-action="class-status"]')) return;
    const lane = event.target.closest('.day-lane'); if (!lane) return;
    const element = event.target.closest('.calendar-event');
    const row = element && rows.find(r => r.id === element.dataset.id);
    const edge = event.target.closest('[data-resize]')?.dataset.resize;
    const anchor = minuteAt(lane, event.clientY);
    drag = { pointerId: event.pointerId, initialX: event.clientX, initialY: event.clientY, x: event.clientX, y: event.clientY,
      element, row, initialLane: lane, lane, anchor, edge, kind: row ? (edge ? 'resize' : 'move') : 'create',
      moved: false, valid: true, range: row ? { start: toMinutes(row.time), duration: row.duration } : { start: Math.floor(anchor / 15) * 15, duration: Math.min(60, 1440 - Math.floor(anchor / 15) * 15) } };
    root.setPointerCapture(event.pointerId);
    event.preventDefault();
    frame = requestAnimationFrame(autoScroll);
  }, { signal });
  root.addEventListener('pointermove', event => { if (drag && event.pointerId === drag.pointerId) update(event.clientX, event.clientY); }, { signal });
  root.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const result = drag, date = result.lane.dataset.date;
    if (result.moved || result.kind === 'create' || result.edge) suppressUntil = performance.now() + 500;
    cleanup();
    if (!result.valid) return;
    if (result.kind === 'create') onCreate({ date, time: toClock(result.range.start), duration: result.range.duration });
    else if (result.moved && (date !== result.row.date || toClock(result.range.start) !== result.row.time || result.range.duration !== result.row.duration)) onChange(result.row, { date, time: toClock(result.range.start), duration: result.range.duration });
    else if (!result.moved && !result.edge) {
      // Capture retargets the native click to the grid. Restore the expected
      // single-click action explicitly, without also opening it after a drag.
      suppressUntil = performance.now() + 500;
      result.element.click();
    }
  }, { signal });
  root.addEventListener('click', event => {
    if (event.isTrusted && performance.now() < suppressUntil) { event.preventDefault(); event.stopPropagation(); }
  }, { capture: true, signal });
  root.addEventListener('pointercancel', cleanup, { signal });
  root.addEventListener('lostpointercapture', () => { if (drag) cleanup(); }, { signal });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) { suppressUntil = performance.now() + 500; cleanup(); } }, { signal });
  return () => { cleanup(); controller.abort(); };
}
