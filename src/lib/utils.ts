import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMonthRange(yearMonth: string): { start: string; nextMonthStart: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const nextMonthStart = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start: `${yearMonth}-01`, nextMonthStart }
}

export function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
}
