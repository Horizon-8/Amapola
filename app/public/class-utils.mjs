export const toMinutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const toClock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const snapQuarter = minutes => Math.round(minutes / 15) * 15;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function hasEnded(row, today, time) {
  return row.date < today || (row.date === today && toMinutes(row.time) + row.duration <= toMinutes(time));
}
export function paymentState(row, today, time) {
  if (row.paymentStatus === 'paid') return 'paid';
  if (row.status === 'cancelled' || row.price === 0) return 'nocharge';
  return hasEnded(row, today, time) ? 'overdue' : 'pending';
}
export function selectionRange(anchor, current) {
  const first = clamp(Math.floor(anchor / 15) * 15, 0, 1425);
  const last = clamp(Math.floor(current / 15) * 15, 0, 1425);
  return { start: Math.min(first, last), duration: Math.min(720, Math.abs(last - first) + 15) };
}
export function moveRange(start, duration, delta) {
  duration = clamp(snapQuarter(duration), 15, 720);
  return { start: clamp(snapQuarter(start + delta), 0, 1440 - duration), duration };
}
export function resizeRange(start, duration, edge, delta) {
  const end = clamp(snapQuarter(start + duration), 15, 1440);
  if (edge === 'start') {
    const next = clamp(snapQuarter(start + delta), Math.max(0, end - 720), end - 15);
    return { start: next, duration: end - next };
  }
  start = clamp(snapQuarter(start), 0, 1425);
  return { start, duration: clamp(snapQuarter(duration + delta), 15, Math.min(720, 1440 - start)) };
}
