import { useState } from 'react'
import { SlotsListScreen } from './screens/SlotsListScreen'
import { MyBookingsScreen } from './screens/MyBookingsScreen'

type Screen = 'schedule' | 'bookings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('schedule')

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__brand">Глина</h1>
        <p className="app-header__tagline">Гончарная мастерская · запись на занятия</p>
      </header>

      <main className="app-content">
        {screen === 'schedule' ? (
          <SlotsListScreen />
        ) : (
          <MyBookingsScreen onFindClass={() => setScreen('schedule')} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Навигация">
        <button
          type="button"
          className={`bottom-nav__item${screen === 'schedule' ? ' bottom-nav__item--active' : ''}`}
          onClick={() => setScreen('schedule')}
        >
          Расписание
        </button>
        <button
          type="button"
          className={`bottom-nav__item${screen === 'bookings' ? ' bottom-nav__item--active' : ''}`}
          onClick={() => setScreen('bookings')}
        >
          Мои записи
        </button>
      </nav>
    </div>
  )
}
