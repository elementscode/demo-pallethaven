/** "Sep 30, 11:24 AM", or "Sep 30, 2025, 11:24 AM" outside the current year. */
export function formatWhen(date: Date | null): string {
  if (!date) {
    return "";
  }

  let sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(date: Date | null): string {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
