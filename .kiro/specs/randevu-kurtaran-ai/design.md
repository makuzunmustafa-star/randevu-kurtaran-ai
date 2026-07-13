# Tasarım Belgesi: RandevuKurtaran AI

## 1. Genel Bakış

RandevuKurtaran AI, kuaför, diş hekimi ve benzeri yerel işletmeler için geliştirilmiş bir Micro-SaaS randevu yönetim sistemidir.

### Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js 20 + Express 4 |
| Veritabanı | SQLite (better-sqlite3) |
| Kimlik Doğrulama | JWT + bcrypt (≥10 round) |
| Şema Doğrulama | Zod |
| Grafik | Recharts |
| Test | Vitest + fast-check |

---

## 2. Sistem Mimarisi

Frontend (Next.js :3000) ↔ Backend (Express :4000) ↔ SQLite dosyası

Katmanlar:
- **Frontend**: React bileşenleri, Axios HTTP istemcisi, JWT localStorage
- **Backend**: JWT middleware, Express route handler'ları, servis katmanı
- **Veri**: better-sqlite3 senkron erişim, parametreli sorgular

---

## 3. Veritabanı Şeması

### users
```sql
CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### appointments
```sql
CREATE TABLE appointments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  service_fee     REAL NOT NULL CHECK(service_fee > 0),
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK(status IN ('active','cancelled','recovered')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, appointment_date, appointment_time)
);
```

### waitlist
```sql
CREATE TABLE waitlist (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  preferred_service TEXT,
  queue_position   INTEGER NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, customer_phone)
);
```

### notifications
```sql
CREATE TABLE notifications (
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
```

### financial_records
```sql
CREATE TABLE financial_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  appointment_id INTEGER NOT NULL REFERENCES appointments(id),
  service_type   TEXT NOT NULL,
  amount         REAL NOT NULL CHECK(amount > 0),
  record_date    TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. API Endpoint'leri

### Auth
- POST /api/auth/login — giriş, JWT döner
- POST /api/auth/register — işletme kaydı

### Randevular (JWT zorunlu)
- GET  /api/appointments?weekStart=YYYY-MM-DD
- POST /api/appointments
- DELETE /api/appointments/:id

### Yedek Liste (JWT zorunlu)
- GET    /api/waitlist
- POST   /api/waitlist
- DELETE /api/waitlist/:id

### Bildirimler (JWT zorunlu)
- GET /api/notifications?status=

### Onay (public)
- GET  /api/confirm/:token
- POST /api/confirm/:token  { action: "confirm"|"reject" }

### Finansal Analiz (JWT zorunlu)
- GET /api/analytics/summary?from=&to=
- GET /api/analytics/daily?from=&to=
- GET /api/analytics/export?from=&to=

---

## 5. Kimlik Doğrulama Akışı

1. POST /api/auth/login → bcrypt.compare → jwt.sign (8 saat)
2. Sonraki istekler: Authorization: Bearer token
3. JWT middleware → jwt.verify → req.user
4. Token süresi dolunca frontend /login'e yönlendirir

---

## 6. İptal Algılama Akışı

1. DELETE /api/appointments/:id → status='cancelled'
2. CancellationService.handle(appointment)
3. İptal saati < randevu saati - 60dk → "geç iptal" uyarısı
4. WaitlistService.findCandidates(serviceType) → sıralı aday listesi
5. Aday yoksa → "yedek listesi boş" uyarısı
6. Aday varsa → NotificationService.send(candidate, slot)
7. 30dk onay penceresi → onay gelmezse sıradaki adaya
8. Maksimum 3 deneme → 3'ünde de yoksa "Doldurulamadı"

---

## 7. Onay Token Akışı

- Token: crypto.randomUUID() 
- TTL: +2 saat
- Tek kullanımlık
- Onayda: yeni randevu + financial_record oluşturulur
- Reddedilince/süre dolunca: sıradaki adaya bildirim

---

## 8. Frontend Sayfa Yapısı

```
app/
├── login/page.tsx
├── dashboard/page.tsx          ← takvim
├── waitlist/page.tsx
├── notifications/page.tsx
├── analytics/page.tsx
├── confirm/[token]/page.tsx    ← public
└── middleware.ts               ← JWT koruması
```

---

## 9. Güvenlik

- Parametreli sorgular (SQL injection koruması)
- Zod .strict() şema doğrulama
- bcrypt ≥10 round
- JWT Bearer middleware
- Hata yanıtlarında iç detay yok (referenceId döner)
- Rate limiting: auth endpoint'leri için 10 istek/15dk

---

## 10. Doğruluk Özellikleri (PBT)

| # | Özellik | Gereksinim |
|---|---------|-----------|
| 1 | Geçersiz kimlik → 401 | 1.3 |
| 2 | Şifre hash round-trip | 1.6 |
| 3 | Randevu kayıt invariantı | 2.2 |
| 4 | Çakışma tespiti → 409 | 2.3 |
| 5 | Eksik alan → 400 | 2.4 |
| 6 | Geçmiş tarih → 422 | 2.6 |
| 7 | İptal durum güncellemesi | 3.2 |
| 8 | Yedek liste sıra tutarlılığı | 5.4 |
| 9 | Hizmet türü filtresi | 5.6 |
| 10 | Bildirim içerik invariantı | 7.1 |
| 11 | Her bildirim DB'ye kaydedilir | 7.2 |
| 12 | Token benzersizliği + TTL | 8.1 |
| 13 | Onay round-trip | 8.3 |
| 14 | Finansal JSON round-trip | 9.7 |
| 15 | Telefon doğrulama | 11.1 |
| 16 | Beklenmedik alan reddi | 12.3 |
