export function getLocalDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function getNextLocalMidnight(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next;
}

export function getMillisecondsUntilNextLocalMidnight(date = new Date()) {
  return Math.max(getNextLocalMidnight(date).getTime() - date.getTime(), 1000);
}

export function formatLocalTimestamp(value: string | Date) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
