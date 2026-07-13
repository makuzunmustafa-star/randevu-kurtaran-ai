const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'sqlite.db');
const db = new sqlite3.Database(dbPath);

console.log("🤖 RandevuKurtaran AI Asistan Motoru Başlatıldı...");
console.log("🔍 Son dakika iptalleri ve boşluklar taranıyor...\n");

// AI'ın tetiklenme fonksiyonu (Simülasyon)
function simulateCancellation() {
    console.log("⚠️ [SİSTEM UYARISI]: Bugün saat 16:00'daki randevu müşteri tarafından İPTAL EDİLDİ!");
    console.log("🤖 AI Asistanı bekleme listesindeki en uygun kişiyi arıyor...");

    // 1. Bekleme listesindeki ilk uygun kişiyi bul
    db.get("SELECT * FROM waitlist ORDER BY id ASC LIMIT 1", [], (err, waitUser) => {
        if (err) {
            console.error("Hata:", err);
            return;
        }

        if (!waitUser) {
            console.log("📋 Bekleme listesinde şu an kimse yok. Boşluk doldurulamadı.");
            return;
        }

        console.log(`🎯 AI Eşleşmesi Başarılı! Sıradaki Müşteri Telefonu: ${waitUser.phone} | Talep Edilen Hizmet: ${waitUser.service}`);
        console.log(`📩 [SMS Gönderiliyor] -> Alıcı: ${waitUser.phone}`);
        console.log(`💬 Mesaj İçeriği: "Merhaba, RandevuKurtaran AI aracılığıyla istediğiniz ${waitUser.service} için bugün saat 16:00'da boşluk açıldı! Onaylamak için tıklayın: http://localhost:3000/confirm"`);

        // 2. Dashboard tablosuna bu durumu yansıt (Müşteriyi yeni randevu olarak ekle)
        const insertQuery = `INSERT INTO appointments (name, service, time, status, aiNote) 
                             VALUES (?, ?, '16:00', 'Bekliyor', ?)`;
        const aiNote = `İptal olan boşluğa AI tarafından otomatik olarak ${waitUser.phone} numaralı telefondan yerleştirildi.`;
        
        db.run(insertQuery, ['Sıradaki Müşteri (AI)', waitUser.service, aiNote], function(err) {
            if (err) return console.error(err);
            console.log(`\n✅ [BAŞARILI]: Randevu paneline (Dashboard) yeni talep eklendi! ID: ${this.lastID}`);
            console.log("🖥️  http://localhost:3000/dashboard adresini yenileyerek görebilirsiniz.");
            
            // 3. İşlenen kişiyi listeden kaldır
            db.run("DELETE FROM waitlist WHERE id = ?", [waitUser.id]);
        });
    });
}

// Gerçek senaryoyu test etmek için önce bekleme listesine örnek veri ekleyelim
db.get("SELECT COUNT(*) as count FROM waitlist", [], (err, row) => {
    if (row && row.count === 0) {
        db.run("INSERT INTO waitlist (phone, service) VALUES ('0532 123 45 67', 'Cilt Bakımı')", [], () => {
            // Veri eklendikten 2 saniye sonra iptal senaryosunu çalıştır
            setTimeout(simulateCancellation, 2000);
        });
    } else {
        setTimeout(simulateCancellation, 2000);
    }
});
