function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function getTodayForDateInput(date = new Date()): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}
