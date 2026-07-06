export const PROGRAM_TITLES: Record<string, string> = {
  'prog-beginner': 'Знакомство с глиной',
  'prog-wheel': 'Работа на круге',
}

export const STUDIO_PHONE = '+7 (812) 555-12-34'

export function formatSlotDate(iso: string) {
  const date = new Date(iso)
  return {
    weekdayLabel: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''),
    dateLabel: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    timeLabel: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

export function pluralKits(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return ''
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а'
  return 'ов'
}

export function programTitle(programId: string) {
  return PROGRAM_TITLES[programId] ?? 'Мастер-класс'
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Подтверждена',
  cancelled_by_client: 'Отменено вами',
  cancelled_by_studio: 'Отменено мастерской',
  completed: 'Завершено',
  no_show: 'Неявка',
}



