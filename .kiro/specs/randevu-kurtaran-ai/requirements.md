# Gereksinimler Belgesi

## Giriş

RandevuKurtaran AI, kuaför, diş hekimi ve benzeri yerel işletmeler için geliştirilmiş bir Micro-SaaS uygulamasıdır. Sistem; randevu yönetimini kolaylaştırmakta, iptal olan randevuları akıllı biçimde algılayarak yedek listedeki müşterilere otomatik bildirim (SMS/WhatsApp simülasyonu) göndermekte ve kurtarılan kazançları finansal grafiklerle görselleştirmektedir. Arka uç Node.js/Express, ön yüz Next.js ve yerel geliştirme veritabanı olarak SQLite kullanılmaktadır.

---

## Sözlük

- **Sistem**: RandevuKurtaran AI uygulamasının tamamı
- **İşletme_Paneli**: İşletme sahibinin randevuları yönettiği Next.js arayüzü
- **Randevu_Motoru**: Randevu ekleme, güncelleme, silme ve sorgulama işlemlerini yürüten Node.js/Express servisi
- **İptal_Algilayici**: Randevuların iptal durumuna geçişini izleyen ve tetikleyici olayları üreten modül
- **Yedek_Liste_Yoneticisi**: Yedek listedeki müşteri kayıtlarını ve sıralama önceliklerini yöneten modül
- **Bildirim_Servisi**: SMS ve WhatsApp simülasyonu aracılığıyla müşterilere bildirim gönderen modül
- **Finansal_Analiz_Motoru**: Kurtarılan kazanç verilerini hesaplayan ve grafik verisine dönüştüren modül
- **Grafik_Paneli**: Kurtarılan kazançları ve istatistikleri görselleştiren Next.js dashboard bileşeni
- **Musteri**: Randevu alan veya yedek listesine eklenen son kullanıcı
- **Isletme_Sahibi**: Sisteme giriş yaparak paneli kullanan yerel işletme temsilcisi
- **Randevu**: Belirli bir tarih, saat ve hizmet türü için rezerve edilmiş zaman dilimine ait kayıt
- **Yedek_Listesi**: İptal durumunda bildirim alacak müşterilerin sıralı listesi
- **Kurtarilan_Kazanc**: İptal sonrası yedek müşteri tarafından doldurulan randevudan elde edilen tahmini gelir

---

## Gereksinimler

### Gereksinim 1: Kimlik Doğrulama ve Yetkilendirme

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, sisteme güvenli biçimde giriş yapmak istiyorum; böylece yalnızca kendi işletmeme ait verilere erişebildiğimden emin olabilirim.

#### Kabul Kriterleri

1. THE İşletme_Paneli SHALL e-posta ve şifre ile giriş yapma formu sunmalıdır.
2. WHEN geçerli kimlik bilgileri gönderildiğinde, THE Randevu_Motoru SHALL JWT tabanlı bir oturum jetonu döndürmelidir.
3. IF geçersiz kimlik bilgileri gönderilirse, THEN THE Randevu_Motoru SHALL HTTP 401 durum kodu ve açıklayıcı hata mesajı döndürmelidir.
4. WHILE oturum jetonu geçerliyken, THE İşletme_Paneli SHALL kullanıcıyı giriş sayfasına yönlendirmeksizin korumalı sayfalara erişime izin vermelidir.
5. WHEN oturum jetonu süresi dolduğunda, THE İşletme_Paneli SHALL kullanıcıyı otomatik olarak giriş sayfasına yönlendirmelidir.
6. THE Randevu_Motoru SHALL şifreleri veritabanına düz metin olarak kaydetmemeli; bcrypt algoritması ile en az 10 tur (round) ile hash'lemelidir.

---

### Gereksinim 2: Randevu Ekleme

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, müşteri randevularını sisteme eklemek istiyorum; böylece tüm takvimi tek bir yerden yönetebilirim.

#### Kabul Kriterleri

1. THE İşletme_Paneli SHALL tarih, saat, müşteri adı, müşteri telefon numarası, hizmet türü ve hizmet ücreti alanlarını içeren bir randevu oluşturma formu sunmalıdır.
2. WHEN geçerli randevu verileri gönderildiğinde, THE Randevu_Motoru SHALL randevuyu veritabanına kaydetmeli ve benzersiz bir randevu kimliği (ID) döndürmelidir.
3. IF aynı tarih ve saate çakışan başka bir randevu mevcutsa, THEN THE Randevu_Motoru SHALL HTTP 409 durum kodu ve çakışma bilgisi döndürmelidir.
4. IF zorunlu alanlardan herhangi biri eksikse, THEN THE Randevu_Motoru SHALL HTTP 400 durum kodu ve eksik alan listesini içeren hata mesajı döndürmelidir.
5. WHEN yeni randevu başarıyla kaydedildiğinde, THE İşletme_Paneli SHALL randevuyu takvim görünümünde derhal yansıtmalıdır.
6. THE Randevu_Motoru SHALL geçmiş tarihe randevu ekleme girişiminde HTTP 422 durum kodu döndürmelidir.

---

### Gereksinim 3: Randevu Silme ve İptal

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, iptal olan randevuları sistemden kaldırmak istiyorum; böylece takvim güncel kalır ve iptal akışı tetiklenir.

#### Kabul Kriterleri

1. WHEN İşletme_Sahibi bir randevuyu silme işlemi başlattığında, THE İşletme_Paneli SHALL onay iletişim kutusu (dialog) göstermelidir.
2. WHEN silme onaylandığında, THE Randevu_Motoru SHALL ilgili randevunun durumunu "iptal edildi" olarak işaretlemeli ve İptal_Algilayici'ya bir iptal olayı yaymalıdır.
3. WHEN iptal olayı yayıldığında, THE İptal_Algilayici SHALL Yedek_Liste_Yoneticisi'ni iptal edilen zaman dilimiyle birlikte bilgilendirmelidir.
4. WHEN randevu başarıyla iptal edildiğinde, THE İşletme_Paneli SHALL takvim görünümünden randevuyu kaldırmalı ve başarı bildirimi göstermelidir.
5. IF silinmek istenen randevu mevcut değilse, THEN THE Randevu_Motoru SHALL HTTP 404 durum kodu döndürmelidir.

---

### Gereksinim 4: Takvim Görünümü

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, günlük ve haftalık randevu takvimini görmek istiyorum; böylece iş yoğunluğunu tek bakışta kavrayabilirim.

#### Kabul Kriterleri

1. THE İşletme_Paneli SHALL tüm aktif randevuları günlük ve haftalık görünüm seçeneğiyle sunan bir takvim bileşeni içermelidir.
2. WHEN sayfa yüklendiğinde, THE İşletme_Paneli SHALL geçerli haftanın randevularını 500 ms içinde yüklemelidir.
3. THE İşletme_Paneli SHALL her randevu kartında müşteri adı, hizmet türü, saat ve ücret bilgilerini göstermelidir.
4. WHEN İşletme_Sahibi farklı bir haftaya geçiş yaptığında, THE İşletme_Paneli SHALL seçilen haftaya ait randevuları 500 ms içinde yüklemelidir.

---

### Gereksinim 5: Yedek Liste Yönetimi

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, iptal durumunda bildirim göndermek istediğim müşterileri yedek listeye eklemek istiyorum; böylece boşalan saatler hızla doldurulabilir.

#### Kabul Kriterleri

1. THE İşletme_Paneli SHALL müşteri adı, telefon numarası ve tercih edilen hizmet türünü içeren yedek liste kayıt formu sunmalıdır.
2. WHEN geçerli yedek müşteri verisi gönderildiğinde, THE Yedek_Liste_Yoneticisi SHALL kaydı sıra numarasıyla birlikte veritabanına eklemelidir.
3. THE İşletme_Paneli SHALL mevcut yedek listeyi sıra numarasına göre sıralı biçimde görüntülemelidir.
4. WHEN İşletme_Sahibi bir müşteriyi yedek listeden çıkarmak istediğinde, THE Yedek_Liste_Yoneticisi SHALL ilgili kaydı silerek kalan kayıtların sıra numaralarını yeniden düzenlemelidir.
5. THE Yedek_Liste_Yoneticisi SHALL aynı telefon numarasıyla ikinci bir kayıt oluşturulma girişiminde HTTP 409 durum kodu döndürmelidir.
6. WHERE tercih edilen hizmet türü belirtilmişse, THE Yedek_Liste_Yoneticisi SHALL yalnızca eşleşen hizmet türündeki iptaller için ilgili müşteriyi eşleştirmelidir.

---

### Gereksinim 6: Akıllı İptal Algılama

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, her iptalin otomatik olarak algılanmasını ve uygun yedek müşterilerin belirlenmesini istiyorum; böylece manuel takip yapmak zorunda kalmam.

#### Kabul Kriterleri

1. WHEN İptal_Algilayici bir iptal olayı aldığında, THE İptal_Algilayici SHALL iptal edilen randevunun hizmet türüyle eşleşen yedek listedeki müşterileri sıra önceliğine göre sıralamalıdır.
2. WHEN uygun yedek müşteri listesi oluşturulduğunda, THE İptal_Algilayici SHALL Bildirim_Servisi'ni en yüksek öncelikli müşteri ve iptal edilen zaman dilimiyle birlikte tetiklemelidir.
3. IF yedek listede eşleşen müşteri bulunmuyorsa, THEN THE İptal_Algilayici SHALL İşletme_Sahibi'ne panel üzerinden "yedek listesi boş" uyarısı göstermelidir.
4. THE İptal_Algilayici SHALL iptal tarihinden en az 1 saat önce gerçekleşen iptallerde yedek eşleştirme akışını başlatmalıdır.
5. IF iptal randevudan 1 saatten az kala gerçekleşiyorsa, THEN THE İptal_Algilayici SHALL bu durumu "geç iptal" olarak işaretlemeli ve İşletme_Sahibi'ne uyarı göstermelidir.

---

### Gereksinim 7: Otomatik SMS/WhatsApp Bildirimi Simülasyonu

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, yedek listedeki müşterilere otomatik bildirim gönderilmesini istiyorum; böylece boşalan randevu saati manuel müdahale olmaksızın doldurulabilir.

#### Kabul Kriterleri

1. WHEN Bildirim_Servisi tetiklendiğinde, THE Bildirim_Servisi SHALL hedef müşterinin adı, iptal edilen tarih, saat ve hizmet türünü içeren bir bildirim mesajı oluşturmalıdır.
2. THE Bildirim_Servisi SHALL her gönderim girişimini; alıcı telefon numarası, mesaj içeriği, gönderim zaman damgası ve simülasyon durumunu içerecek şekilde veritabanına kaydetmelidir.
3. WHEN bildirim simülasyonu tamamlandığında, THE İşletme_Paneli SHALL gönderilen bildirim kaydını "Bildirim Geçmişi" bölümünde göstermelidir.
4. IF müşteri bildirimi aldıktan sonra randevuyu onaylarsa, THEN THE Bildirim_Servisi SHALL sıradaki yedek müşteriye bildirim gönderme işlemini durdurmalıdır.
5. THE Bildirim_Servisi SHALL onay alınmayan durumlarda yedek listede sırasıyla en fazla 3 müşteriye bildirim göndermeli, 3 müşteriden de onay gelmemesi halinde İşletme_Sahibi'ne "Doldurulamadı" bildirimi iletmelidir.
6. WHERE WhatsApp kanalı seçilmişse, THE Bildirim_Servisi SHALL bildirim kaydına kanal türünü "WhatsApp" olarak kaydetmelidir; aksi hâlde "SMS" olarak kaydetmelidir.

---

### Gereksinim 8: Müşteri Onay Akışı

**Kullanıcı Hikayesi:** Bir Müşteri olarak, bildirimi aldıktan sonra randevuyu onaylayabilmek istiyorum; böylece sisteme dahil olduğumu belirtebilirim.

#### Kabul Kriterleri

1. THE Bildirim_Servisi SHALL gönderilen her bildirime, müşterinin tarayıcı üzerinden erişebileceği benzersiz bir onay bağlantısı (URL) eklemeli ve bu bağlantının süresi 2 saat ile sınırlandırılmalıdır.
2. WHEN Müşteri onay bağlantısına eriştiğinde, THE Sistem SHALL randevu bilgilerini ve "Onayla" / "Reddet" seçeneklerini sunan bir sayfa göstermelidir.
3. WHEN Müşteri "Onayla" seçeneğini seçtiğinde, THE Randevu_Motoru SHALL söz konusu zaman dilimini Müşteri adına yeni bir randevu olarak kaydetmeli ve İptal_Algilayici'ya onay bilgisi iletmelidir.
4. WHEN Müşteri "Reddet" seçeneğini seçtiğinde veya onay süresi dolduğunda, THE Bildirim_Servisi SHALL sıradaki yedek müşteriye bildirim gönderme sürecini başlatmalıdır.
5. IF onay bağlantısının süresi dolmuşsa, THEN THE Sistem SHALL kullanıcıya "Bu bağlantının süresi dolmuştur" mesajı göstermelidir.

---

### Gereksinim 9: Finansal Analiz ve Grafik Paneli

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, kurtarılan kazançlarımı grafiklerle görmek istiyorum; böylece sistemin sağladığı finansal değeri ölçebilirim.

#### Kabul Kriterleri

1. THE Finansal_Analiz_Motoru SHALL her kurtarılan randevu için; randevu tarihi, hizmet türü ve hizmet ücretini esas alarak kurtarılan kazanç miktarını hesaplamalıdır.
2. THE Grafik_Paneli SHALL kurtarılan kazançların günlük, haftalık ve aylık toplamlarını çizgi grafik ve çubuk grafik seçenekleriyle görselleştirmelidir.
3. THE Grafik_Paneli SHALL toplam iptal sayısı, kurtarılan randevu sayısı ve kurtarma oranını (%) özet kart (summary card) bileşenlerinde göstermelidir.
4. WHEN İşletme_Sahibi farklı tarih aralığı seçtiğinde, THE Grafik_Paneli SHALL seçilen aralığa ait verileri 500 ms içinde yeniden hesaplayıp görüntülemelidir.
5. THE Grafik_Paneli SHALL hizmet türüne göre kırılım yapan bir pasta grafik içermelidir.
6. THE Finansal_Analiz_Motoru SHALL verileri JSON formatında dışa aktarmaya olanak tanımalıdır.
7. FOR ALL tarih aralığı sorgularında, THE Finansal_Analiz_Motoru SHALL başlangıç tarihi ≤ bitiş tarihi koşulunu sağlayan girdiler için toplam kurtarılan kazancı, ayrıştırılmış (parse) ve yeniden biçimlendirilmiş (formatted) JSON yanıtından yeniden ayrıştırıldığında aynı değeri üretecek şekilde döndürmelidir (round-trip özelliği).

---

### Gereksinim 10: Bildirim Geçmişi ve Denetim İzi

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, gönderilmiş tüm bildirimlerin geçmişini görmek istiyorum; böylece sistemi denetleyebilir ve sorunları takip edebilirim.

#### Kabul Kriterleri

1. THE İşletme_Paneli SHALL tüm geçmiş bildirimleri; alıcı adı, kanal türü, gönderim zamanı ve sonuç durumu (gönderildi / onaylandı / reddedildi / süresi doldu) alanlarıyla listeleyecek bir tablo içermelidir.
2. WHEN İşletme_Sahibi tabloda durum filtresini uyguladığında, THE İşletme_Paneli SHALL yalnızca seçilen duruma ait kayıtları 300 ms içinde göstermelidir.
3. THE Randevu_Motoru SHALL bildirim geçmişini en güncel kayıt başta olacak şekilde sıralı döndürmelidir.
4. IF herhangi bir bildirim kaydı bulunamazsa, THEN THE İşletme_Paneli SHALL "Henüz bildirim gönderilmedi" mesajı göstermelidir.

---

### Gereksinim 11: Veri Doğrulama ve Hata Yönetimi

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, geçersiz veri girişlerinde anlaşılır hata mesajları almak istiyorum; böylece sorunları hızla düzeltebilirim.

#### Kabul Kriterleri

1. THE Randevu_Motoru SHALL telefon numarasının Türkiye formatına (10 rakam, 5xx ile başlayan) uygunluğunu doğrulamalı; uyumsuzluk halinde HTTP 422 döndürmelidir.
2. THE Randevu_Motoru SHALL hizmet ücretinin sıfırdan büyük bir sayısal değer olduğunu doğrulamalı; geçersiz değerde HTTP 422 döndürmelidir.
3. IF herhangi bir API isteğinde sunucu taraflı bir hata oluşursa, THEN THE Randevu_Motoru SHALL HTTP 500 durum kodu ve hata referans numarası döndürmelidir; iç sistem detayları yanıtta yer almamalıdır.
4. THE İşletme_Paneli SHALL tüm form alanları için satır içi (inline) doğrulama hata mesajlarını, form gönderiminden önce kullanıcıya göstermelidir.

---

### Gereksinim 12: Güvenlik

**Kullanıcı Hikayesi:** Bir İşletme_Sahibi olarak, verilerimin güvende olduğunu bilmek istiyorum; böylece müşteri bilgilerinin yetkisiz erişime karşı korunduğundan emin olabilirim.

#### Kabul Kriterleri

1. WHILE kimlik doğrulaması yapılmamış bir istek geldiğinde, THE Randevu_Motoru SHALL korumalı tüm API uç noktalarına HTTP 401 durum kodu döndürmelidir.
2. THE Randevu_Motoru SHALL tüm veritabanı sorgularında parametreli sorgular (parameterized queries) kullanmalı; SQL enjeksiyon saldırılarını önlemelidir.
3. THE Randevu_Motoru SHALL gelen tüm istek gövdelerini (request body) şema doğrulamasından geçirmeli; beklenmedik alanları kabul etmemelidir.
4. THE İşletme_Paneli SHALL hassas hata ayrıntılarını (stack trace, SQL sorgusu vb.) kullanıcı arayüzünde göstermemelidir.
```
