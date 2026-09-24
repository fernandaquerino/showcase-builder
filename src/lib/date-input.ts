export function getTodayForDateInput(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
