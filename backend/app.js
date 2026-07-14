import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ⭐ KESİN VE DOĞRULANMIŞ DIŞ AĞ (EXTERNAL) POSTGRESQL ADRESİ
// Bölge uyuşmazlığı yaşamamak için Frankfurt sunucu uzantısı koda doğrudan işlendi.
const GERCEK_DB_URL = process.env.DATABASE_URL || "postgresql://randevu_db_0lc5_user:HKXEXbogyUjQAiS2PgQYFTn4iaPgmlXN@://render.com";

const pool = new pg.Pool({
    connectionString: GERCEK_DB_URL,
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

        if (!companyName) return res.status(400).json({ success: false, message: "İşletme adı boş bırakılamaz." });

        let generatedSlug = slugify(companyName);
        const mevcutDukkan = await pool.query('SELECT id FROM dukkanlar WHERE slug = $1', [generatedSlug]);
        if (mevcutDukkan.rows.length > 0) {
            generatedSlug = `${generatedSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        await pool.query(
            'INSERT INTO dukkanlar (name, sector, phone, slug) VALUES ($1, $2, $3, $4)',
            [companyName, sectorType, phone, generatedSlug]
        );

        return res.json({ success: true, slug: generatedSlug });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

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

// API: YAPAY ZEKA İPTAL MOTORU
app.post('/api/cancel-appointment', async (req, res) => {
    try {
        const { randevuId } = req.body;
        const randevuSorgu = await pool.query('SELECT * FROM randevular WHERE id = $1', [randevuId]);
        if (randevuSorgu.rows.length === 0) return res.status(404).json({ success: false, message: "Bulunamadı." });
        
        const iptalEdilen = randevuSorgu.rows[0];
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
















