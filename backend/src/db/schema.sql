PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  service_type     TEXT NOT NULL,
  service_fee      REAL NOT NULL CHECK(service_fee > 0),
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK(status IN ('active','cancelled','recovered')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, appointment_date, appointment_time)
);

CREATE TABLE IF NOT EXISTS waitlist (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  preferred_service TEXT,
  queue_position   INTEGER NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, customer_phone)
);

CREATE TABLE IF NOT EXISTS notifications (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  appointment_id     INTEGER REFERENCES appointments(id),
  waitlist_id        INTEGER REFERENCES waitlist(id),
  recipient_name     TEXT NOT NULL,
  recipient_phone    TEXT NOT NULL,
  message_content    TEXT NOT NULL,
  channel            TEXT NOT NULL CHECK(channel IN ('SMS','WhatsApp')),
  confirmation_token TEXT UNIQUE,
  token_expires_at   TEXT,
  status             TEXT NOT NULL DEFAULT 'sent'
                     CHECK(status IN ('sent','confirmed','rejected','expired')),
  sent_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  appointment_id INTEGER NOT NULL REFERENCES appointments(id),
  service_type   TEXT NOT NULL,
  amount         REAL NOT NULL CHECK(amount > 0),
  record_date    TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
