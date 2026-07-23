export function isToday(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function formatLogDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getDaysAgo(dateString: string): number {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(today.getTime() - d.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
