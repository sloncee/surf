// Фича US-002 «Запись на мастер-класс», совмещённая с US-001 «Просмотр
// доступных занятий» (без списка нельзя записаться — это одна фича по сути,
// но каждая ссылается на свою карточку в features/).
// Требования: FR-B1, FR-B4, FR-B5, FR-C1..FR-C5.
//
// Упрощение сознательно: запись оформляется прямо в карточке слота, без
// отдельных экранов «Карточка слота»/«Оформление записи» (SCR-003/SCR-004
// из дизайн-брифа) — для одной фичи это лишний уровень навигации. Разбить
// на отдельные экраны можно позже, когда фич станет больше.
import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Slot } from '../types/domain'
import { EmptyState } from '../components/EmptyState'
import { formatPrice, formatSlotDate, pluralKits, programTitle } from '../lib/display'

type BookingUiState = 'idle' | 'pending' | 'done'

export function SlotsListScreen() {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Состояние формы записи — по одному значению на слот (ключ — slot.id).
  const [ownTools, setOwnTools] = useState<Record<string, boolean>>({})
  const [bookingState, setBookingState] = useState<Record<string, BookingUiState>>({})
  const [bookingError, setBookingError] = useState<Record<string, string>>({})

  function loadSlots() {
    api
      .getSlots()
      .then((res) => setSlots(res.items))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить занятия'))
  }

  useEffect(() => {
    loadSlots()
  }, [])

  async function handleBook(slot: Slot) {
    if ((bookingState[slot.id] ?? 'idle') === 'pending') return

    const usesOwnTools = slot.free_rental_kits > 0 ? (ownTools[slot.id] ?? true) : true
    setBookingState((s) => ({ ...s, [slot.id]: 'pending' }))
    setBookingError((s) => ({ ...s, [slot.id]: '' }))
    try {
      await api.createBooking(slot.id, usesOwnTools)
      setBookingState((s) => ({ ...s, [slot.id]: 'done' }))
      loadSlots() // подтягиваем актуальные free_seats/free_rental_kits после брони
    } catch (e) {
      setBookingState((s) => ({ ...s, [slot.id]: 'idle' }))
      setBookingError((s) => ({ ...s, [slot.id]: describeBookingError(e) }))
    }
  }

  if (loadError) {
    return (
      <div className="state-panel state-panel--error">
        <p className="state-panel__title">Не удалось загрузить расписание</p>
        <p className="state-panel__text">{loadError}</p>
        <button type="button" className="btn btn--secondary" onClick={loadSlots}>
          Попробовать снова
        </button>
      </div>
    )
  }

  if (slots === null) {
    return (
      <div className="loading" aria-live="polite">
        <div className="loading__spinner" aria-hidden />
        <p>Загружаем расписание…</p>
      </div>
    )
  }

  if (slots.length === 0) {
    return <EmptyState title="Пока нет доступных занятий" />
  }

  return (
    <>
      <p className="page-intro">Выберите занятие и оформите запись — без звонков и переписки.</p>
      <ul className="slots-list">
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            state={bookingState[slot.id] ?? 'idle'}
            ownTools={ownTools[slot.id] ?? true}
            error={bookingError[slot.id]}
            onOwnToolsChange={(value) => setOwnTools((s) => ({ ...s, [slot.id]: value }))}
            onBook={() => handleBook(slot)}
          />
        ))}
      </ul>
    </>
  )
}

interface SlotCardProps {
  slot: Slot
  state: BookingUiState
  ownTools: boolean
  error?: string
  onOwnToolsChange: (value: boolean) => void
  onBook: () => void
}

function SlotCard({ slot, state, ownTools, error, onOwnToolsChange, onBook }: SlotCardProps) {
  const { dateLabel, timeLabel, weekdayLabel } = formatSlotDate(slot.start_at)
  const programTitleText = programTitle(slot.program_id)
  const noSeats = slot.free_seats <= 0
  const rentalAvailable = slot.free_rental_kits > 0
  const effectiveOwnTools = rentalAvailable ? ownTools : true

  return (
    <li className={`slot-card${noSeats ? ' slot-card--full' : ''}${state === 'done' ? ' slot-card--booked' : ''}`}>
      <div className="slot-card__header">
        <div className="slot-card__datetime">
          <span className="slot-card__weekday">{weekdayLabel}</span>
          <span className="slot-card__date">{dateLabel}</span>
          <span className="slot-card__time">{timeLabel}</span>
        </div>
        <span className="slot-card__price">{formatPrice(slot.price)}</span>
      </div>

      <h2 className="slot-card__title">{programTitleText}</h2>
      <p className="slot-card__address">{slot.address}</p>

      <div className="slot-card__meta">
        <AvailabilityBadge
          label="Места"
          free={slot.free_seats}
          total={slot.total_seats}
          emptyText="Нет мест"
        />
        <AvailabilityBadge
          label="Прокат"
          free={slot.free_rental_kits}
          total={slot.total_rental_kits}
          emptyText="Нет проката"
        />
      </div>

      {state === 'done' ? (
        <div className="booking-success" role="status">
          <span className="booking-success__icon" aria-hidden>✓</span>
          <div>
            <p className="booking-success__title">Вы записаны</p>
            <p className="booking-success__hint">
              {effectiveOwnTools ? 'Со своими инструментами' : 'С прокатом инструментов'}
            </p>
          </div>
        </div>
      ) : (
        <div className="booking-form">
          <fieldset className="tools-choice" disabled={noSeats || state === 'pending'}>
            <legend className="tools-choice__legend">Инструменты</legend>
            <label className={`tools-choice__option${effectiveOwnTools ? ' tools-choice__option--active' : ''}`}>
              <input
                type="radio"
                name={`tools-${slot.id}`}
                checked={effectiveOwnTools}
                onChange={() => onOwnToolsChange(true)}
              />
              <span className="tools-choice__label">Свои</span>
              <span className="tools-choice__hint">Приду со своим набором</span>
            </label>
            <label
              className={`tools-choice__option${!effectiveOwnTools ? ' tools-choice__option--active' : ''}${!rentalAvailable ? ' tools-choice__option--disabled' : ''}`}
            >
              <input
                type="radio"
                name={`tools-${slot.id}`}
                checked={!effectiveOwnTools}
                disabled={!rentalAvailable}
                onChange={() => onOwnToolsChange(false)}
              />
              <span className="tools-choice__label">Прокат</span>
              <span className="tools-choice__hint">
                {rentalAvailable
                  ? `${slot.free_rental_kits} комплект${pluralKits(slot.free_rental_kits)} свободно`
                  : 'Прокат закончился'}
              </span>
            </label>
          </fieldset>

          {noSeats && <p className="slot-card__notice">Все места заняты — выберите другое время</p>}

          <button
            type="button"
            className="btn btn--primary btn--full"
            disabled={noSeats || state === 'pending'}
            onClick={onBook}
          >
            {state === 'pending' ? 'Записываем…' : 'Записаться'}
          </button>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function AvailabilityBadge({
  label,
  free,
  total,
  emptyText,
}: {
  label: string
  free: number
  total: number
  emptyText: string
}) {
  const isEmpty = free <= 0
  return (
    <span className={`badge${isEmpty ? ' badge--warn' : ' badge--ok'}`}>
      <span className="badge__label">{label}</span>
      <span className="badge__value">{isEmpty ? emptyText : `${free} из ${total}`}</span>
    </span>
  )
}

function describeBookingError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Места уже заняты — выберите другой слот' // FR-C4
    if (e.status === 422) return 'Свободного проката не осталось, выберите «свои инструменты»' // FR-C3
    return e.message
  }
  return 'Не удалось записаться, попробуйте ещё раз'
}
