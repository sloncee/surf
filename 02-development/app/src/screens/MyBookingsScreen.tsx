// Фичи US-003 «Просмотр своих записей» + US-004 «Отмена записи клиентом».
// Требования: FR-D1..FR-D4.
//
// Упрощение: один экран с вкладками и отменой прямо в карточке брони,
// без отдельного SCR-006 «Карточка брони».
import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { BookingTab, BookingWithSlot } from '../types/domain'
import { EmptyState } from '../components/EmptyState'
import {
  BOOKING_STATUS_LABELS,
  STUDIO_PHONE,
  formatPrice,
  formatSlotDate,
  programTitle,
} from '../lib/display'

const TABS: { id: BookingTab; label: string }[] = [
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'past', label: 'Прошедшие' },
  { id: 'cancelled', label: 'Отменённые' },
]

interface Props {
  onFindClass?: () => void
}

type CancelUiState = 'idle' | 'confirming' | 'pending'

export function MyBookingsScreen({ onFindClass }: Props) {
  const [tab, setTab] = useState<BookingTab>('upcoming')
  const [bookings, setBookings] = useState<BookingWithSlot[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancelState, setCancelState] = useState<Record<string, CancelUiState>>({})
  const [cancelError, setCancelError] = useState<Record<string, string>>({})

  function loadBookings(currentTab: BookingTab = tab) {
    setBookings(null)
    setLoadError(null)
    api
      .getBookings(currentTab)
      .then((res) => setBookings(res.items))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить записи'))
  }

  useEffect(() => {
    loadBookings(tab)
  }, [tab])

  async function handleCancel(booking: BookingWithSlot) {
    if ((cancelState[booking.id] ?? 'idle') === 'pending') return

    setCancelState((s) => ({ ...s, [booking.id]: 'pending' }))
    setCancelError((s) => ({ ...s, [booking.id]: '' }))
    try {
      await api.cancelBooking(booking.id)
      setCancelState((s) => ({ ...s, [booking.id]: 'idle' }))
      loadBookings(tab)
    } catch (e) {
      setCancelState((s) => ({ ...s, [booking.id]: 'idle' }))
      setCancelError((s) => ({
        ...s,
        [booking.id]: describeCancelError(e),
      }))
    }
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Мои записи">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tabs__item${tab === item.id ? ' tabs__item--active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="state-panel state-panel--error">
          <p className="state-panel__title">Не удалось загрузить записи</p>
          <p className="state-panel__text">{loadError}</p>
          <button type="button" className="btn btn--secondary" onClick={() => loadBookings()}>
            Попробовать снова
          </button>
        </div>
      )}

      {!loadError && bookings === null && (
        <div className="loading" aria-live="polite">
          <div className="loading__spinner" aria-hidden />
          <p>Загружаем записи…</p>
        </div>
      )}

      {!loadError && bookings !== null && bookings.length === 0 && (
        <EmptyState
          title={
            tab === 'upcoming'
              ? 'У вас пока нет записей'
              : tab === 'past'
                ? 'Прошедших записей нет'
                : 'Отменённых записей нет'
          }
          description={tab === 'upcoming' ? 'Запишитесь на ближайшее занятие в расписании' : undefined}
          ctaLabel={tab === 'upcoming' ? 'Найти занятие' : undefined}
          onCta={tab === 'upcoming' ? onFindClass : undefined}
        />
      )}

      {!loadError && bookings !== null && bookings.length > 0 && (
        <ul className="bookings-list">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              tab={tab}
              cancelState={cancelState[booking.id] ?? 'idle'}
              cancelError={cancelError[booking.id]}
              onConfirmCancel={() => setCancelState((s) => ({ ...s, [booking.id]: 'confirming' }))}
              onDismissCancel={() => setCancelState((s) => ({ ...s, [booking.id]: 'idle' }))}
              onCancel={() => handleCancel(booking)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

interface BookingCardProps {
  booking: BookingWithSlot
  tab: BookingTab
  cancelState: CancelUiState
  cancelError?: string
  onConfirmCancel: () => void
  onDismissCancel: () => void
  onCancel: () => void
}

function BookingCard({
  booking,
  tab,
  cancelState,
  cancelError,
  onConfirmCancel,
  onDismissCancel,
  onCancel,
}: BookingCardProps) {
  const { dateLabel, timeLabel, weekdayLabel } = formatSlotDate(booking.slot.start_at)
  const title = programTitle(booking.slot.program_id)
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status
  const canCancel =
    tab === 'upcoming' &&
    booking.status === 'confirmed' &&
    new Date() < new Date(booking.cancellation_deadline_at)
  const cancelLocked =
    tab === 'upcoming' && booking.status === 'confirmed' && !canCancel

  return (
    <li
      className={`booking-card${booking.status === 'cancelled_by_studio' ? ' booking-card--studio-cancel' : ''}`}
    >
      <div className="booking-card__header">
        <span className={`booking-card__status booking-card__status--${booking.status}`}>
          {statusLabel}
        </span>
        <span className="booking-card__price">{formatPrice(booking.slot.price)}</span>
      </div>

      <h2 className="booking-card__title">{title}</h2>

      <div className="booking-card__datetime">
        <span className="slot-card__weekday">{weekdayLabel}</span>
        <span>{dateLabel}</span>
        <span className="booking-card__time">{timeLabel}</span>
      </div>

      <p className="booking-card__address">{booking.slot.address}</p>
      <p className="booking-card__tools">
        {booking.own_tools ? 'Со своими инструментами' : 'С прокатом инструментов'}
      </p>

      {booking.status === 'cancelled_by_studio' && booking.cancellation_reason && (
        <p className="booking-card__reason">{booking.cancellation_reason}</p>
      )}

      {canCancel && cancelState === 'idle' && (
        <button type="button" className="btn btn--ghost btn--full" onClick={onConfirmCancel}>
          Отменить запись
        </button>
      )}

      {canCancel && (cancelState === 'confirming' || cancelState === 'pending') && (
        <div className="cancel-confirm">
          <p className="cancel-confirm__text">Место освободится для других. Отменить запись?</p>
          <div className="cancel-confirm__actions">
            <button
              type="button"
              className="btn btn--danger"
              disabled={cancelState === 'pending'}
              onClick={onCancel}
            >
              {cancelState === 'pending' ? 'Отменяем…' : 'Да, отменить'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={cancelState === 'pending'}
              onClick={onDismissCancel}
            >
              Нет
            </button>
          </div>
        </div>
      )}

      {cancelLocked && (
        <p className="booking-card__locked">
          Отмена недоступна — до начала осталось меньше порога. Для форс-мажора
          позвоните:{' '}
          <a href={`tel:${STUDIO_PHONE.replace(/\s/g, '')}`} className="link">
            {STUDIO_PHONE}
          </a>
        </p>
      )}

      {cancelError && (
        <p className="form-error" role="alert">
          {cancelError}
        </p>
      )}
    </li>
  )
}

function describeCancelError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 422) return 'Отмена уже недоступна — позвоните в мастерскую'
    return e.message
  }
  return 'Не удалось отменить запись, попробуйте ещё раз'
}
