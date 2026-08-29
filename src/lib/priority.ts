import type { Priority } from '../types'

export const PRIORITIES: Priority[] = ['low', 'medium', 'high']

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
}

/** وزن عددی هر سطح اولویت برای مقایسه و امتیازدهی در پیشنهاد هوشمند */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  low: 1,
  medium: 2,
  high: 3,
}