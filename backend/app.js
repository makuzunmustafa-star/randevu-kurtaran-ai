import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. GEREKLİ ARA YAZILIMLAR (MIDDLEWARE)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend dosyalarına doğrudan erişim izni
app.use(express.static(path.join(__dirname, 'public')));

// 2. BULUT VERİ TABANI BAĞLANTISI (Gelişmiş Güvenlik ve Hata Geçirmez Havuz)
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.MONGODB_URI,
    ssl: { rejectUnauthorized: false }, // Bulut güvenliği için zorunlu ayar
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Otomatik tablo oluşturma kontrolü
async function tabloyuHazirla() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dukkanlar (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                sector VARCHAR(255) NOT NULL,
                phone VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ PostgreSQL Dükkanlar Tablosu Hazır.');
    } catch (err) {
        console.error('❌ Tablo oluşturma hatası:', err);
    }
}
tabloyuHazirla();

// 3. URL DOSTU SLUG OLUŞTURMA FONKSİYONU
function slugify(text) {
    const trMap = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o'
    };
    return text.toString().toLowerCase().trim()
        .replace(/[çğşüıöÇĞŞÜİÖ]/g, match => trMap[match])
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// 4. ORTAK KAYIT İŞLEYİCİ FONKSİYON
async function kayitIsleyici(req, res) {
    try {
        const companyName = req.body.companyName || req.body.name || req.body.businessName;
        const sectorType = req.body.sectorType || req.body.sector || req.body.type;
        const phone = req.body.phone || req.body.tel;

        if (!companyName || !sectorType || !phone) {
            return res.status(400).json({ success: false, message: "Lütfen tüm alanları doldurun." });
        }

        let generatedSlug = slugify(companyName);

        // Çakışma kontrolü
        const mevcutDukkan = await pool.query('SELECT id FROM dukkanlar WHERE slug = $1', [generatedSlug]);
        if (mevcutDukkan.rows.length > 0) {
            generatedSlug = `${generatedSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // PostgreSQL'e Kayıt
        await pool.query(
            'INSERT INTO dukkanlar (name, sector, phone, slug) VALUES ($1, $2, $3, $4)',
            [companyName, sectorType, phone, generatedSlug]
        );

        res.json({
            success: true,
            message: "🎉 Tebrikler! Kurumsal kaydınız başarıyla tamamlandı.",
            slug: generatedSlug
        });

    } catch (error) {
        console.error('Kayıt Hatası:', error);
        res.status(500).json({ success: false, message: "Veri tabanına kaydedilemedi." });
    }
}

// 5. TÜM ALTERNATİF POST ROTALARI
app.post('/api/register-business', kayitIsleyici);
app.post('/api/register', kayitIsleyici);
app.post('/api/business', kayitIsleyici);
app.post('/register', kayitIsleyici);

// 6. DİNAMİK MÜŞTERİ RANDEVU SAYFASI (GET ROTASI)
app.get('/:slug', async (req, res) => {
    try {
        const dukkanSlug = req.params.slug;
        
        if (dukkanSlug.includes('.') || dukkanSlug === 'favicon.ico') return;

        const dukkanSorgu = await pool.query('SELECT * FROM dukkanlar WHERE slug = $1', [dukkanSlug]);

        if (dukkanSorgu.rows.length === 0) {
            return res.status(404).send(`
                <div style="font-family:sans-serif; text-align:center; margin-top:100px;">
                    <h1>❌ İşletme Bulunamadı</h1>
                    <p>Aradığınız <b>${dukkanSlug}</b> adlı randevu sayfası sistemde kayıtlı değil.</p>
                    <a href="/">Ana Sayfaya Dön</a>
                </div>
            `);
        }

        const dukkan = dukkanSorgu.rows[0];

        res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${dukkan.name} - Randevu Sistemi</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; }
                    h1 { color: #2c3e50; margin-bottom: 5px; }
                    .badge { background: #3498db; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 20px; }
                    p { color: #7f8c8d; font-size: 15px; line-height: 1.6; }
                    .btn { background: #2ecc71; color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>🗓 ${dukkan.name}</h1>
                    <div class="badge">${dukkan.sector}</div>
                    <p>Yapay zeka destekli akıllı randevu sistemine hoş geldiniz. Aşağıdaki butondan dilediğiniz saati seçerek randevu alabilirsiniz.</p>
                    <p>📞 İletişim: ${dukkan.phone}</p>
                    <button class="btn" onclick="alert('Randevu alma simülasyonu çalıştı! Yapay zeka takvimi kontrol ediyor...')">Randevu Al</button>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Randevu Sayfası Hatası:', error);
        res.status(500).send("Sunucu hatası nedeniyle sayfa yüklenemedi.");
    }
});

// SUNUCUYU TETİKLE
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla ayağa kalktı.`);
});


