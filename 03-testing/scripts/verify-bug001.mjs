// Небольшой скрипт-регресс-тест для BUG-001: проверяет формулу
// cancellation_deadline_at независимо от React/Vite-обвязки.

const CANCELLATION_WINDOW_HOURS = 2;

function oldFormula(nowMs) {
  // Было: created_at + 2ч (баг)
  return new Date(nowMs + CANCELLATION_WINDOW_HOURS * 3600 * 1000).toISOString();
}

function newFormula(slotStartAtIso) {
  // Стало: start_at - 2ч (правильно)
  const deadlineMs = new Date(slotStartAtIso).getTime() - CANCELLATION_WINDOW_HOURS * 3600 * 1000;
  return new Date(deadlineMs).toISOString();
}

const now = Date.now();
// slot-1 из фикстур: start_offset_hours = 20
const slotStartAt = new Date(now + 20 * 3600 * 1000).toISOString();

const buggyDeadline = oldFormula(now);
const fixedDeadline = newFormula(slotStartAt);

console.log('Сейчас:                  ', new Date(now).toISOString());
console.log('Начало занятия (slot-1): ', slotStartAt);
console.log('Дедлайн ДО фикса (баг):  ', buggyDeadline, ' → окно на отмену ~2ч вместо ~18ч');
console.log('Дедлайн ПОСЛЕ фикса:     ', fixedDeadline, ' → за 2ч ДО начала занятия (ожидаемо)');

const expectedHoursBeforeStart = (new Date(slotStartAt).getTime() - new Date(fixedDeadline).getTime()) / 3600000;
console.log('Проверка: дедлайн ровно за', expectedHoursBeforeStart, 'ч до начала (должно быть 2)');
