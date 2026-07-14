import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 10000;

// ⭐ JWT_SECRET Render panelinde Environment Variable olarak tanımlanmalı.
// Tanımlanmazsa geçici bir değer kullanılır ama bu GÜVENLİ DEĞİLDİR — mutlaka ekleyin.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ UYARI: JWT_SECRET ortam değişkeni tanımlı değil. Render > Environment sekmesinden ekleyin (rastgele uzun bir metin olabilir).');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ⭐ VERİTABANI BAĞLANTISI
// DATABASE_URL Render panelinde "Environment" sekmesinden ortam değişkeni olarak tanımlanmalı.
// Kod içine ASLA gerçek şifre yazılmamalı (güvenlik açığı olur).
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    console.error('❌ HATA: DATABASE_URL ortam değişkeni tanımlı değil. Render > Environment sekmesinden ekleyin.');
}

const pool = new pg.Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false } // Bulut sunucularda SSL zorunluluğunu aşar
});

// TABLOLARI HAZIRLA
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

        // ⭐ MİGRATION: Panel şifre koruması için password_hash sütunu
        await pool.query(`
            ALTER TABLE dukkanlar ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS randevular (
                id SERIAL PRIMARY KEY,
                dukkan_slug VARCHAR(255) NOT NULL,
                musteri_adi VARCHAR(255) NOT NULL,
                randevu_tarihi VARCHAR(100) NOT NULL,
                randevu_saati VARCHAR(50) NOT NULL,
                durum VARCHAR(50) DEFAULT 'AKTIF',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ⭐ OTOMATİK MİGRATION: Tablo daha önce eski bir şemayla oluşturulmuşsa
        // (örn. "durum" sütunu eksikse) burada otomatik olarak eklenir.
        // "CREATE TABLE IF NOT EXISTS" zaten var olan tabloyu değiştirmediği için
        // eksik sütunları buradan tamamlıyoruz.
        await pool.query(`
            ALTER TABLE randevular ADD COLUMN IF NOT EXISTS durum VARCHAR(50) DEFAULT 'AKTIF';
        `);

        console.log('✅ Canlı PostgreSQL Altyapısı Başarıyla Kuruldu.');
    } catch (err) {
        console.error('❌ Altyapı kurulum hatası:', err.message);
    }
}
tabloyuHazirla();

function slugify(text) {
    if (!text) return 'isletme-' + Math.floor(1000 + Math.random() * 9000);
    const trMap = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o' };
    return text.toString().toLowerCase().trim().replace(/[çğşüıöÇĞŞÜİÖ]/g, match => trMap[match]).replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// İŞLETME KAYIT ROTASI
app.post('/api/register-business', async (req, res) => {
    try {
        const companyName = req.body.name || req.body.companyName;
        const sectorType = req.body.sector || req.body.sectorType || "Berber / Erkek Kuaförü";
        const phone = req.body.phone || "05550000000";
        const password = req.body.password;

        if (!companyName) return res.status(400).json({ success: false, message: "İşletme adı boş bırakılamaz." });
        if (!password || password.length < 4) return res.status(400).json({ success: false, message: "Panel şifresi en az 4 karakter olmalıdır." });

        let generatedSlug = slugify(companyName);
        const mevcutDukkan = await pool.query('SELECT id FROM dukkanlar WHERE slug = $1', [generatedSlug]);
        if (mevcutDukkan.rows.length > 0) {
            generatedSlug = `${generatedSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO dukkanlar (name, sector, phone, slug, password_hash) VALUES ($1, $2, $3, $4, $5)',
            [companyName, sectorType, phone, generatedSlug, passwordHash]
        );

        return res.json({ success: true, slug: generatedSlug });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API: PANEL GİRİŞİ (Şifre doğrulama + JWT token üretme)
app.post('/api/dashboard-login', async (req, res) => {
    try {
        const { slug, password } = req.body;
        if (!slug || !password) return res.status(400).json({ success: false, message: "Eksik veri." });

        const dukkanSlug = slug.trim().toLowerCase();
        const sorgu = await pool.query('SELECT id, name, password_hash FROM dukkanlar WHERE LOWER(TRIM(slug)) = $1', [dukkanSlug]);

        if (sorgu.rows.length === 0) {
            return res.status(404).json({ success: false, message: "İşletme bulunamadı." });
        }

        const dukkan = sorgu.rows[0];
        if (!dukkan.password_hash) {
            // Eski kayıtlarda şifre olmayabilir (migration öncesi). Bu durumda erişimi reddet.
            return res.status(401).json({ success: false, message: "Bu işletme için panel şifresi tanımlı değil. Lütfen destek ile iletişime geçin." });
        }

        const eslesiyorMu = await bcrypt.compare(password, dukkan.password_hash);
        if (!eslesiyorMu) {
            return res.status(401).json({ success: false, message: "Şifre hatalı." });
        }

        const token = jwt.sign({ slug: dukkanSlug }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, name: dukkan.name });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Yardımcı middleware: token doğrulama + istenen slug ile eşleşme kontrolü
function panelYetkisiKontrolEt(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ success: false, message: "Giriş yapmanız gerekiyor." });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const istenenSlug = (req.params.slug || '').trim().toLowerCase();
        if (payload.slug !== istenenSlug) {
            return res.status(403).json({ success: false, message: "Bu panele erişim yetkiniz yok." });
        }
        req.dukkanSlug = payload.slug;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın." });
    }
}

// API: DÜKKAN DETAYI SORGULAMA (Frontend Nesne Okuma Uyumlu)
app.get('/api/dukkan-detay/:slug', async (req, res) => {
    try {
        const dukkanSlug = req.params.slug ? req.params.slug.trim().toLowerCase() : '';
        const dukkanSorgu = await pool.query("SELECT name, sector, phone, slug FROM dukkanlar WHERE LOWER(TRIM(slug)) = $1", [dukkanSlug]);

        if (dukkanSorgu.rows.length === 0) {
            return res.status(404).json({ success: false, message: "İşletme bulunamadı." });
        }

        const randevularSorgu = await pool.query("SELECT id, musteri_adi, randevu_tarihi, randevu_saati, durum FROM randevular WHERE LOWER(TRIM(dukkan_slug)) = $1 ORDER BY id DESC", [dukkanSlug]);

        return res.json({
            success: true,
            dukkan: dukkanSorgu.rows[0], // İlk dükkan nesnesi doğrudan frontend'e iletiliyor
            randevular: randevularSorgu.rows
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API: PANEL VERİSİ (Şifre korumalı — sadece token'ı doğru olan görebilir)
app.get('/api/dashboard-data/:slug', panelYetkisiKontrolEt, async (req, res) => {
    try {
        const dukkanSlug = req.dukkanSlug;
        const dukkanSorgu = await pool.query("SELECT name, sector, phone, slug FROM dukkanlar WHERE LOWER(TRIM(slug)) = $1", [dukkanSlug]);

        if (dukkanSorgu.rows.length === 0) {
            return res.status(404).json({ success: false, message: "İşletme bulunamadı." });
        }

        const randevularSorgu = await pool.query("SELECT id, musteri_adi, randevu_tarihi, randevu_saati, durum FROM randevular WHERE LOWER(TRIM(dukkan_slug)) = $1 ORDER BY id DESC", [dukkanSlug]);

        return res.json({
            success: true,
            dukkan: dukkanSorgu.rows[0],
            randevular: randevularSorgu.rows
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// API: RANDEVU KAYDETME
app.post('/api/book-appointment', async (req, res) => {
    try {
        const { dukkanSlug, musteriAdi, randevuTarihi, randevuSaati } = req.body;
        if (!dukkanSlug || !musteriAdi || !randevuTarihi || !randevuSaati) return res.status(400).json({ success: false, message: "Eksik veri." });

        await pool.query(
            'INSERT INTO randevular (dukkan_slug, musteri_adi, randevu_tarihi, randevu_saati) VALUES ($1, $2, $3, $4)',
            [dukkanSlug.trim().toLowerCase(), musteriAdi, randevuTarihi, randevuSaati]
        );
        res.json({ success: true, message: "🎉 Randevunuz başarıyla alındı! Yapay zeka koltuğunuzu ayırdı." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hata." });
    }
});

// API: YAPAY ZEKA İPTAL MOTORU (Şifre korumalı — sadece panel sahibi iptal edebilir)
app.post('/api/cancel-appointment', async (req, res) => {
    try {
        const { randevuId } = req.body;

        const randevuSorgu = await pool.query('SELECT * FROM randevular WHERE id = $1', [randevuId]);
        if (randevuSorgu.rows.length === 0) return res.status(404).json({ success: false, message: "Bulunamadı." });

        const iptalEdilen = randevuSorgu.rows[0];

        // Token doğrulama: gönderen kişi bu randevunun ait olduğu işletmenin sahibi mi?
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: "Giriş yapmanız gerekiyor." });

        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (payload.slug !== iptalEdilen.dukkan_slug.trim().toLowerCase()) {
                return res.status(403).json({ success: false, message: "Bu işlemi yapma yetkiniz yok." });
            }
        } catch (err) {
            return res.status(401).json({ success: false, message: "Oturum geçersiz veya süresi dolmuş." });
        }
        await pool.query('UPDATE randevular SET durum = \'IPTAL\' WHERE id = $1', [randevuId]);

        const aiMesaj = `💈 *${iptalEdilen.randevu_saati} Seansı Boşaldı!* 💈\n\nMerhaba değerli müşterimiz, dükkanımızda sıra beklediğiniz o gün için az önce acil bir iptal gerçekleşti ve koltuğumuz boşa çıktı! 😎\n\nYapay zeka takvim kontrol motoru sırayı size atadı. Randevuyu kapmak için hemen bu mesaja yanıt verebilirsiniz! 📲✨`;

        res.json({ success: true, message: "⚠️ Randevu iptal edildi. Yapay zeka boşalan koltuğu kurtarmak için akıllı davet mesajını üretti!", aiGeneratedMessage: aiMesaj });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hata." });
    }
});

// ROTALAR
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/:slug', (req, res) => {
    const dukkanSlug = req.params.slug;
    if (dukkanSlug.includes('.') || dukkanSlug === 'favicon.ico' || dukkanSlug === 'dashboard') {
        return res.status(404).end();
    }
    res.sendFile(path.join(__dirname, 'public', 'randevu.html'));
});

app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} üzerinde yayında.`));














