export function elapsedSince(start: string, now = Date.now()) {
  const timestamp = Date.parse(start);
  if (!Number.isFinite(timestamp)) throw new Error('Invalid start date');
  const seconds = Math.floor(Math.max(0, now - timestamp) / 1000);
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}
export function elapsedDays(start: string, now = Date.now()) { return elapsedSince(start, now).days; }
