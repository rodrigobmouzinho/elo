function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

export function formatLocalDateTimeInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "";

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}

export function formatLocalDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "";

  return [date.getFullYear(), "-", pad(date.getMonth() + 1), "-", pad(date.getDate())].join("");
}

export function toIsoFromLocalDateTimeInput(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function toIsoFromLocalDateInput(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toISOString();
}
