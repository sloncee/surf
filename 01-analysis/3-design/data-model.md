# Схема данных (контрактная модель)

> Важно: это **не схема БД бэкенда** (та вне скоупа, R-004/R-015). Это модель
> сущностей, как их видит и потребляет клиентское приложение через API-контракт —
> та самая «каноническая схема данных = контракт API» (R-015).

## ER-диаграмма

```mermaid
erDiagram
    CLIENT ||--o{ BOOKING : "делает"
    CLIENT ||--o{ RATING : "оставляет"
    PROGRAM ||--o{ SLOT : "определяет тип"
    MASTER ||--o{ SLOT : "ведёт"
    MASTER ||--o{ RATING : "получает"
    SLOT ||--o{ BOOKING : "содержит"
    BOOKING ||--o| RATING : "может иметь"

    CLIENT {
        uuid id
        string name
        string phone
        string email
        string loyalty_status "опционально, из бэкенда"
    }

    PROGRAM {
        uuid id
        string title
        string level "beginner|advanced"
        int duration_minutes
        bool tools_required
    }

    MASTER {
        uuid id
        string name
        string photo_url
        float avg_rating
        int reviews_count
    }

    SLOT {
        uuid id
        uuid program_id
        uuid master_id
        datetime start_at
        int total_seats
        int free_seats
        int total_rental_kits
        int free_rental_kits
        int price
        string status "scheduled|cancelled_by_studio|completed"
        string cancellation_reason "заполнено, если cancelled_by_studio"
        string address
    }

    BOOKING {
        uuid id
        uuid client_id
        uuid slot_id
        bool own_tools
        string status "confirmed|cancelled_by_client|cancelled_by_studio|completed|no_show"
        datetime created_at
        datetime cancellation_deadline_at
        datetime cancelled_at
        string cancellation_reason
    }

    RATING {
        uuid id
        uuid booking_id
        uuid master_id
        uuid client_id
        int score "1..5"
        string comment
        datetime created_at
    }
```

## Комментарии к модели

- **SLOT.free_seats / free_rental_kits** — расчётные поля, приходят от бэкенда;
  приложение не хранит и не пересчитывает их самостоятельно (единый источник
  истины, R-004). Инвариант `free_seats ≤ total_seats`,
  `free_rental_kits ≤ total_rental_kits` обеспечивается на бэкенде.
- **BOOKING.cancellation_deadline_at** — момент времени, после которого отмена со
  стороны клиента недоступна; приходит из API, а не вычисляется в приложении (см.
  открытый вопрос №1 в `customer-questions.md`).
- **BOOKING.status = cancelled_by_studio** — устанавливается бэкендом при
  форс-мажорной отмене слота; вместе с ним заполняется `cancellation_reason`
  (R-008). Такая бронь необратима — повторная запись на этот же слот запрещена
  контрактом (слот в статусе `cancelled_by_studio` не участвует в списке доступных
  для записи).
- **RATING** — связана 1:1 (не более одной) с `BOOKING`, а не напрямую с `MASTER`,
  чтобы гарантировать, что оценку может оставить только клиент, который
  действительно был записан и посетил занятие (`BOOKING.status = completed`).
- **CLIENT.loyalty_status** — опциональное поле; приложение должно корректно
  обрабатывать его отсутствие (см. US-008).
