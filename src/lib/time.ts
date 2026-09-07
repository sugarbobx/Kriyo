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

export function formatLocalTimestamp(value: string | Date, intlLocale = 'fr-FR') {
  return new Date(value).toLocaleString(intlLocale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
