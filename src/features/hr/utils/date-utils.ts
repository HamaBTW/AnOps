/**
 * Pure HR date and calculation utility functions
 */

export function calculateBusinessDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return Math.max(1, count);
}

export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateNetSalary(
  baseSalary: number,
  unpaidLeaveDays: number,
  workingDaysInMonth = 22
) {
  const dailyRate = Math.round((baseSalary / workingDaysInMonth) * 100) / 100;
  const deduction = Math.round((dailyRate * unpaidLeaveDays) * 100) / 100;
  const netSalary = Math.max(0, Math.round((baseSalary - deduction) * 100) / 100);

  return {
    dailyRate,
    deduction,
    netSalary,
  };
}
