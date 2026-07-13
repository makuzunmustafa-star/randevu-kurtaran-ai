const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'backend');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, 'sqlite.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("RandevuKurtaran AI Veri Tabanı İnşa Ediliyor...");

    db.run("CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user')");
    db.run("CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, service TEXT NOT NULL, time TEXT NOT NULL, status TEXT DEFAULT 'Bekliyor', aiNote TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS waitlist (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, service TEXT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)");

    db.get("SELECT COUNT(*) as count FROM appointments", [], (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO appointments (name, service, time, status, aiNote) VALUES ('Ahmet Yilmaz', 'Sac Kesimi', '14:30', 'Bekliyor', 'Musteri randevuyu kurtarmak icin AI asistani ile gorustu, acelesi var.'), ('Mehmet Demir', 'Sakal Tirasi', '15:15', 'Onaylandi', 'Duzenli musteri, gecikme olursa SMS ile bilgilendirilmek istiyor.'), ('Canan Kaya', 'Cilt Bakimi', '16:00', 'Bekliyor', 'Iptal olan bosluga AI tarafindan otomatik olarak yerlestirildi.')");
            console.log("Ornek veriler basariyla yuklendi!");
        }
    });

    console.log("Basarili! Tum tablolar hatasiz sekilde kuruldu.");
    console.log("Veri tabani dosyasi hazir: backend/sqlite.db");
});
setTimeout(() => { db.close(); }, 1000);

