// Типы данных для реализованных фич (US-002, US-003, US-004).
// Источник полей — 01-analysis/3-design/data-model.md.
//
// Client/Program/Master/Rating сюда осознанно не включены — они появятся,
// когда по аналогии будут реализовываться следующие фичи (профиль, оценка
// мастера и т.д.). Смотри data-model.md за полным списком сущностей.

export type SlotStatus = 'scheduled' | 'cancelled_by_studio' | 'completed'

export interface Slot {
  id: string
  program_id: string
  master_id: string
  start_at: string // ISO 8601
  total_seats: number
  free_seats: number
  total_rental_kits: number
  free_rental_kits: number
  price: number
  status: SlotStatus
  cancellation_reason?: string
  address: string
}

export type BookingStatus =
  | 'confirmed'
  | 'cancelled_by_client'
  | 'cancelled_by_studio'
  | 'completed'
  | 'no_show'

export type BookingTab = 'upcoming' | 'past' | 'cancelled'

export interface Booking {
  id: string
  client_id: string
  slot_id: string
  own_tools: boolean
  status: BookingStatus
  created_at: string
  cancellation_deadline_at: string
  cancelled_at?: string
  cancellation_reason?: string
}

/** Бронь с данными слота — ответ GET /bookings для отображения в списке. */
export interface BookingWithSlot extends Booking {
  slot: Slot
}

/** Обёртка списковых ответов — все списковые эндпоинты контракта пагинированы. */
export interface Paginated<T> {
  items: T[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}



