# Uygulama Planı: RandevuKurtaran AI

## Görevler

- [ ] 1. Proje Kurulumu
  - [x] 1.1 Monorepo ve bağımlılıkları kur
    - Kök package.json oluştur: workspaces ["backend","frontend"]
    - backend/package.json: express@4, better-sqlite3, bcryptjs, jsonwebtoken, zod, cors, uuid, express-rate-limit
    - frontend/package.json: next@14, react, react-dom, recharts, axios, zod
    - backend/src/ altında klasörler: routes/, services/, middleware/, db/, schemas/
    - frontend/src/app/ App Router yapısını kur
    - Gereksinimler: 1, 2, 4

  - [-] 1.2 Veritabanı şemasını ve migration sistemini kur
    - backend/src/db/schema.sql dosyasını oluştur (5 tablo: users, appointments, waitlist, notifications, financial_records)
    - backend/src/db/migrate.ts migration çalıştırıcısını yaz
    - backend/src/db/index.ts bağlantıyı başlat ve dışa aktar
    - Gereksinimler: 12.2

- [ ] 2. Backend - Kimlik Doğrulama
  - [~] 2.1 Auth endpoint'lerini uygula
    - backend/src/schemas/auth.schema.ts: Zod ile loginSchema, registerSchema
    - backend/src/routes/auth.ts: POST /api/auth/register, POST /api/auth/login
    - Şifreyi bcrypt ile ≥10 round hash'le
    - Geçerli girişte JWT imzala (8 saat), geçersizde 401 döndür
    - Gereksinimler: 1.1, 1.2, 1.3, 1.6

  - [~] 2.2 JWT middleware'ini uygula
    - backend/src/middleware/auth.ts: Bearer token doğrula, req.user'a ekle
    - Geçersiz/eksik token'da 401 döndür
    - Tüm korumalı router'lara uygula
    - Gereksinimler: 1.2, 1.4, 12.1

- [ ] 3. Backend - Randevu API'leri
  - [~] 3.1 Randevu şeması ve CRUD endpoint'leri
    - backend/src/schemas/appointment.schema.ts: Zod ile doğrulama (tarih, saat, müşteri adı, telefon /^5\d{9}$/, hizmet türü, ücret >0)
    - POST /api/appointments: oluştur, çakışmada 409, eksik alanda 400, geçmiş tarihte 422
    - GET /api/appointments?weekStart=: haftalık filtreyle listele
    - DELETE /api/appointments/:id: status='cancelled' yap, CancellationService'i tetikle, bulunamazsa 404
    - Gereksinimler: 2.2, 2.3, 2.4, 2.6, 3.2, 3.5, 11.1, 11.2

- [ ] 4. Backend - Yedek Liste API'leri
  - [~] 4.1 Yedek liste endpoint'lerini uygula
    - backend/src/schemas/waitlist.schema.ts: Zod doğrulama
    - POST /api/waitlist: sıra numarasıyla ekle, aynı telefonda 409
    - GET /api/waitlist: sıra numarasına göre sıralı listele
    - DELETE /api/waitlist/:id: sil, kalan sıra numaralarını yeniden düzenle
    - Gereksinimler: 5.1, 5.2, 5.3, 5.4, 5.5

- [ ] 5. Backend - İptal Algılama Servisi
  - [~] 5.1 CancellationService'i uygula
    - backend/src/services/cancellation.service.ts
    - handleCancellation(appointment): 60dk kontrolü, geç iptal uyarısı
    - Yedek adayları hizmet türüne ve sıra önceliğine göre seç
    - Aday yoksa "yedek listesi boş" uyarısı üret
    - NotificationService.sendToCandidate(candidate, slot) tetikle
    - Gereksinimler: 6.1, 6.2, 6.3, 6.4, 6.5

- [ ] 6. Backend - Bildirim Servisi
  - [~] 6.1 NotificationService'i uygula
    - backend/src/services/notification.service.ts
    - sendToCandidate(candidate, slot): mesaj oluştur, token üret (UUID, +2s TTL), DB'ye kaydet
    - processNextCandidate(appointmentId): 30dk onay penceresi, maks 3 deneme
    - 3 denemede onay yoksa "Doldurulamadı" durumu
    - Kanal: WhatsApp veya SMS olarak kaydet
    - Gereksinimler: 7.1, 7.2, 7.4, 7.5, 7.6, 8.1

- [ ] 7. Backend - Müşteri Onay Akışı
  - [~] 7.1 Onay endpoint'lerini uygula
    - backend/src/routes/confirm.ts
    - GET /api/confirm/:token: token doğrula, süresi dolmuşsa 410, geçerliyse randevu bilgisi döndür
    - POST /api/confirm/:token {action:"confirm"|"reject"}: onayda yeni randevu + financial_record, reddedilince sıradaki adaya
    - Gereksinimler: 8.2, 8.3, 8.4, 8.5

- [ ] 8. Backend - Finansal Analiz API'leri
  - [~] 8.1 Finansal analiz endpoint'lerini uygula
    - backend/src/services/financial.service.ts
    - GET /api/analytics/summary?from=&to=: toplam iptal, kurtarılan, oran (%)
    - GET /api/analytics/daily?from=&to=: günlük kırılım
    - GET /api/analytics/export?from=&to=: JSON dışa aktarma
    - Başlangıç > bitiş tarihinde 422 döndür
    - Gereksinimler: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7

- [ ] 9. Backend - Bildirim Geçmişi API'si
  - [~] 9.1 Bildirim geçmişi endpoint'ini uygula
    - backend/src/routes/notifications.ts
    - GET /api/notifications?status=: en güncel başta, durum filtresiyle
    - Gereksinimler: 10.1, 10.2, 10.3, 10.4

- [ ] 10. Backend - Express Uygulamasını Tamamla
  - [~] 10.1 app.ts ve server.ts'yi oluştur
    - CORS, JSON body-parser, rate limiting, hata middleware
    - Tüm router'ları /api altında bağla
    - Hata middleware'i: 500 + referenceId döndür, iç detay gizle
    - server.ts: migration'ı çalıştır, sunucuyu :4000'de başlat
    - Gereksinimler: 11.3, 12.1, 12.3, 12.4

- [ ] 11. Frontend - Kimlik Doğrulama
  - [~] 11.1 Giriş sayfasını ve auth context'i uygula
    - frontend/src/app/login/page.tsx: e-posta + şifre formu, satır içi Zod doğrulama
    - frontend/src/contexts/AuthContext.tsx: JWT localStorage, login/logout
    - frontend/src/middleware.ts: token yoksa /login'e yönlendir
    - Axios interceptor: 401 gelince otomatik /login yönlendirmesi
    - Gereksinimler: 1.1, 1.4, 1.5, 11.4, 12.4

- [ ] 12. Frontend - Takvim Görünümü
  - [~] 12.1 Takvim bileşenini uygula
    - frontend/src/components/Calendar/WeeklyCalendar.tsx
    - frontend/src/components/Calendar/DailyCalendar.tsx
    - frontend/src/app/dashboard/page.tsx: takvimi yerleştir, günlük/haftalık toggle
    - Her randevu kartı: müşteri adı, hizmet türü, saat, ücret
    - Hafta değişiminde 500ms içinde yeni veri
    - Gereksinimler: 4.1, 4.2, 4.3, 4.4

- [ ] 13. Frontend - Randevu Formu ve Silme
  - [~] 13.1 Randevu ekleme ve silme arayüzünü uygula
    - frontend/src/components/AppointmentForm/AppointmentForm.tsx
    - Alanlar: tarih, saat, müşteri adı, telefon, hizmet türü, ücret
    - Zod ile satır içi doğrulama (telefon, ücret, geçmiş tarih)
    - Silmede onay dialog'u, başarıda takvim güncelleme
    - Gereksinimler: 2.1, 2.5, 3.1, 3.4, 11.4

- [ ] 14. Frontend - Yedek Liste Sayfası
  - [~] 14.1 Yedek liste sayfasını uygula
    - frontend/src/app/waitlist/page.tsx
    - Kayıt formu: müşteri adı, telefon, tercih edilen hizmet türü
    - Sıralı tablo görünümü + satır bazlı silme butonu
    - Gereksinimler: 5.1, 5.3, 5.4

- [ ] 15. Frontend - Bildirim Geçmişi Sayfası
  - [~] 15.1 Bildirim geçmişi sayfasını uygula
    - frontend/src/app/notifications/page.tsx
    - Tablo: alıcı adı, kanal, gönderim zamanı, durum
    - Durum filtresi dropdown'ı (300ms)
    - Kayıt yoksa "Henüz bildirim gönderilmedi"
    - Gereksinimler: 10.1, 10.2, 10.4

- [ ] 16. Frontend - Müşteri Onay Sayfası
  - [~] 16.1 Public onay sayfasını uygula
    - frontend/src/app/confirm/[token]/page.tsx (auth middleware'den muaf)
    - Token doğrulama, randevu bilgileri, Onayla/Reddet butonları
    - Süresi dolmuş token: "Bu bağlantının süresi dolmuştur"
    - Gereksinimler: 8.2, 8.3, 8.4, 8.5

- [ ] 17. Frontend - Finansal Analiz Dashboard
  - [~] 17.1 Finansal analiz sayfasını uygula
    - frontend/src/app/analytics/page.tsx
    - Özet kartlar: toplam iptal, kurtarılan, oran (%)
    - Recharts: çizgi grafik + çubuk grafik (günlük/haftalık/aylık)
    - Recharts: pasta grafik (hizmet türüne göre)
    - Tarih aralığı seçici (500ms güncelleme)
    - JSON dışa aktarma butonu
    - Gereksinimler: 9.2, 9.3, 9.4, 9.5, 9.6

- [ ] 18. PBT Testleri
  - [~] 18.1 fast-check ile doğruluk özelliği testlerini yaz
    - tests/auth.property.test.ts: Özellik 1 (401), Özellik 2 (bcrypt round-trip)
    - tests/appointment.property.test.ts: Özellik 3-7 (kayıt invariantı, çakışma, eksik alan, geçmiş tarih, iptal)
    - tests/waitlist.property.test.ts: Özellik 8-9 (sıra tutarlılığı, hizmet filtresi)
    - tests/notification.property.test.ts: Özellik 10-13 (içerik, DB kaydı, token TTL, onay round-trip)
    - tests/financial.property.test.ts: Özellik 14-16 (JSON round-trip, telefon, beklenmedik alan)
    - Her test minimum 100 iterasyon (numRuns: 100)
    - Gereksinimler: 1.3, 1.6, 2.2, 2.3, 2.4, 2.6, 3.2, 5.4, 5.6, 7.1, 7.2, 8.1, 8.3, 9.7, 11.1, 12.3
