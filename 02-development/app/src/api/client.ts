// Единая точка входа к API. Экран вызывает только функции отсюда, а не
// mockAdapter напрямую — так при появлении реального бэкенда достаточно
// поменять реализацию request() (или выключить USE_MOCK), не трогая экраны.
//
// Реализовано для фич US-002 (запись), US-003 (мои записи), US-004 (отмена).
// Остальные методы (профиль, оценка и т.д.) добавляются по тому же принципу.
//
// Пути и формы ответов — 01-analysis/4-api/api-contract.md.
// TODO(реальный бэкенд): заменить mockRequest на настоящий fetch() с
// Bearer-токеном (NFR-07), когда бэкенд станет доступен по сети.

import { mockRequest } from './mockAdapter'
import type { Booking, BookingTab, BookingWithSlot, Paginated, Slot } from '../types/domain'

const USE_MOCK = true

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (USE_MOCK) {
    return mockRequest<T>(method, path, body)
  }
  throw new Error('Реальный API ещё не подключён')
}

export const api = {
  // GET /slots — FR-B1
  getSlots: () => request<Paginated<Slot>>('GET', '/slots'),

  // POST /bookings — FR-C1..FR-C5
  createBooking: (slot_id: string, own_tools: boolean) =>
    request<Booking>('POST', '/bookings', { slot_id, own_tools }),

  // GET /bookings — FR-D1
  getBookings: (status: BookingTab) =>
    request<Paginated<BookingWithSlot>>('GET', `/bookings?status=${status}`),

  // POST /bookings/{id}/cancel — FR-D2..FR-D4
  cancelBooking: (id: string) => request<Booking>('POST', `/bookings/${id}/cancel`),
}

/** Ошибка API с кодом — обработка веток см. api-contract.md ("Обработка ошибок"). */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
