// Имитация бэкенда: бэкенд по брифу "уже существует", по факту для учебного
// проекта его нет. Этот файл — единственное место, которое знает про фикстуры;
// client.ts и экраны про них не знают.
//
// Реализовано для US-002 (GET /slots, POST /bookings), US-003 (GET /bookings),
// US-004 (POST /bookings/{id}/cancel).
// Пути, коды ошибок и формат ответов — 01-analysis/4-api/api-contract.md.

import type { Booking, BookingTab, BookingWithSlot, Paginated, Slot } from '../types/domain'
import { ApiError } from './client'

import rawSlots from './fixtures/slots.json'
import rawBookings from './fixtures/bookings.json'

const NETWORK_DELAY_MS = 300

// MVP-допущение по порогу отмены — customer-questions.md №1: свободная отмена
// не позднее чем за 2 часа ДО НАЧАЛА занятия (не от момента бронирования!).
const CANCELLATION_WINDOW_HOURS = 2

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString()
}

// BUG-001 fix: раньше порог отмены считался от момента бронирования
// (created_at + 2ч), а не от начала занятия (start_at - 2ч) — см.
// 02-development/bugs/BUG-001-cancellation-deadline.md.
function cancellationDeadline(slotStartAt: string): string {
  const deadlineMs = new Date(slotStartAt).getTime() - CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000
  return new Date(deadlineMs).toISOString()
}

const slots: Slot[] = (rawSlots as any[]).map((s) => ({
  ...s,
  start_at: hoursFromNow(s.start_offset_hours),
}))

const bookings: Booking[] = (rawBookings as any[]).map((b) => ({
  id: b.id,
  client_id: b.client_id,
  slot_id: b.slot_id,
  own_tools: b.own_tools,
  status: b.status,
  created_at: hoursFromNow(b.created_offset_hours),
  cancellation_deadline_at: hoursFromNow(b.cancellation_deadline_offset_hours),
  ...(b.cancelled_offset_hours != null && { cancelled_at: hoursFromNow(b.cancelled_offset_hours) }),
  ...(b.cancellation_reason && { cancellation_reason: b.cancellation_reason }),
}))

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS))
}

function findSlot(slotId: string): Slot | undefined {
  return slots.find((s) => s.id === slotId)
}

function enrichBooking(booking: Booking): BookingWithSlot | null {
  const slot = findSlot(booking.slot_id)
  if (!slot) return null
  return { ...booking, slot }
}

function filterBookings(tab: BookingTab): BookingWithSlot[] {
  const now = new Date().toISOString()
  const items = bookings
    .map(enrichBooking)
    .filter((b): b is BookingWithSlot => b !== null)
    .filter((b) => {
      switch (tab) {
        case 'upcoming':
          return b.status === 'confirmed' && b.slot.start_at >= now
        case 'past':
          return b.status === 'completed' || b.status === 'no_show'
        case 'cancelled':
          return b.status === 'cancelled_by_client' || b.status === 'cancelled_by_studio'
      }
    })
    .sort((a, b) =>
      tab === 'upcoming'
        ? a.slot.start_at.localeCompare(b.slot.start_at)
        : b.slot.start_at.localeCompare(a.slot.start_at),
    )
  return items
}

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  // GET /slots — FR-B1, FR-B4
  if (method === 'GET' && path === '/slots') {
    const now = new Date().toISOString()
    const items = slots
      .filter((s) => s.status === 'scheduled' && s.start_at >= now)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
    return delay({ items, meta: { page: 1, page_size: items.length, total: items.length } }) as Promise<T>
  }

  // GET /bookings?status=... — FR-D1
  if (method === 'GET' && path.startsWith('/bookings')) {
    const status = new URL(path, 'http://mock').searchParams.get('status') as BookingTab | null
    if (!status || !['upcoming', 'past', 'cancelled'].includes(status)) {
      throw new ApiError(422, 'Неверный параметр status')
    }
    const items = filterBookings(status)
    return delay({
      items,
      meta: { page: 1, page_size: items.length, total: items.length },
    }) as Promise<T>
  }

  // POST /bookings — FR-C1..FR-C4
  if (method === 'POST' && path === '/bookings') {
    const { slot_id, own_tools } = body as { slot_id: string; own_tools: boolean }
    const slot = findSlot(slot_id)
    if (!slot) throw new ApiError(404, 'Слот не найден')

    if (slot.free_seats <= 0) {
      throw new ApiError(409, 'Места уже заняты')
    }
    if (!own_tools && slot.free_rental_kits <= 0) {
      throw new ApiError(422, 'Свободного проката не осталось')
    }

    slot.free_seats -= 1
    if (!own_tools) slot.free_rental_kits -= 1

    const booking: Booking = {
      id: 'booking-' + Math.random().toString(36).slice(2, 9),
      client_id: 'client-me',
      slot_id,
      own_tools,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      cancellation_deadline_at: cancellationDeadline(slot.start_at),
    }
    bookings.push(booking)
    return delay(booking) as Promise<T>
  }

  // POST /bookings/{id}/cancel — FR-D2..FR-D4
  const cancelMatch = path.match(/^\/bookings\/([^/]+)\/cancel$/)
  if (method === 'POST' && cancelMatch) {
    const booking = bookings.find((b) => b.id === cancelMatch[1])
    if (!booking) throw new ApiError(404, 'Бронь не найдена')

    if (booking.status === 'cancelled_by_studio') {
      return delay(booking) as Promise<T>
    }
    if (booking.status !== 'confirmed') {
      throw new ApiError(409, 'Бронь уже отменена')
    }

    const now = new Date().toISOString()
    if (now >= booking.cancellation_deadline_at) {
      throw new ApiError(422, 'Порог отмены прошёл')
    }

    const slot = findSlot(booking.slot_id)
    if (slot) {
      slot.free_seats += 1
      if (!booking.own_tools) slot.free_rental_kits += 1
    }

    booking.status = 'cancelled_by_client'
    booking.cancelled_at = now
    return delay(booking) as Promise<T>
  }

  throw new ApiError(404, `Мок не реализован: ${method} ${path}`)
}



