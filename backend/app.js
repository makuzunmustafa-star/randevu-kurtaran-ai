import express from ' express';
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

// BULUT POSTGRESQL BAĞLANTI HAVUZU
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.MONGODB_URI,
    ssl: { rejectUnauthorized: false }
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
        console.log('✅ PostgreSQL Altyapısı Başarıyla Kuruldu.');
    } catch (err) {
        console.error('❌ Altyapı kurulum hatası:', err);
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

        res.json({ 
            success: true, 
            message: "⚠️ Randevu iptal edildi. Yapay zeka boşalan koltuğu kurtarmak için akıllı davet mesajını üretti!", 
            aiGeneratedMessage: aiMesaj 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hata." });
    }
});

// DİNAMİK SERVER-SIDE RENDERING (Hataları %100 Bitiren Büyük Değişim!)
app.get('/:slug', async (req, res) => {
    try {
        const dukkanSlug = req.params.slug;
        if (dukkanSlug.includes('.') || dukkanSlug === 'favicon.ico') return;

        // Veritabanından dükkanı ve aktif randevuları çekiyoruz
        const dukkanSorgu = await pool.query("SELECT * FROM dukkanlar WHERE TRIM(LOWER(slug)) = TRIM(LOWER($1))", [dukkanSlug]);
        if (dukkanSorgu.rows.length === 0) {
            return res.status(404).send('<h1 style="text-align:center;margin-top:100px;">❌ İşletme Bulunamadı</h1>');
        }
        
        const dukkan = dukkanSorgu.rows[0];
        const randevularSorgu = await pool.query("SELECT * FROM randevular WHERE TRIM(LOWER(dukkan_slug)) = TRIM(LOWER($1)) AND durum = 'AKTIF' ORDER BY id DESC", [dukkanSlug]);

        // Aktif randevuları HTML satırlarına döküyoruz
        let randevuSatirlari = '';
        randevularSorgu.rows.forEach(r => {
            randevuSatirlari += `
                <div style="background:#fff3cd; padding:10px; border-radius:6px; margin-bottom:8px; font-size:13px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ffeeba;">
                    <span>👤 <b>${r.musteri_adi}</b> - 📅 ${r.randevu_tarihi} ⏰ ${r.randevu_saati}</span>
                    <button onclick="randevuIptalEt(${r.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">İptal Et (AI Tetikle)</button>
                </div>`;
        });

        // Sayfayı doğrudan bulut seviyesinde birleştirip tarayıcıya basıyoruz
        let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">`;
        html += `<title>${dukkan.name} - Akıllı Randevu</title>`;
        html += `<style>
            body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.05); text-align: center; max-width: 450px; width: 100%; box-sizing: border-box; }
            h1 { color: #2c3e50; margin-bottom: 5px; font-size: 26px; }
            .badge { background: #3498db; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; display: inline-block; margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-align: left; color: #34495e; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            input[type="text"], input[type="date"] { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; margin-bottom: 15px; box-sizing: border-box; }
            .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
            .time-slot { background: #f8f9fa; border: 2px solid #e2e8f0; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.2s; }
            .time-slot:hover { border-color: #3498db; background: #e8f4fd; }
            .time-slot.selected { background: #3498db; color: white; border-color: #2980b9; }
            .btn { background: #2ecc71; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; margin-top: 10px; }
            .btn:hover { background: #27ae60; }
        </style></head><body>`;
        
        html += `<div class="card"><h1>💈 ${dukkan.name}</h1><div class="badge">${dukkan.sector}</div>`;
        html += `<p style="color: #7f8c8d; font-size: 14px;">Müşteri Paneli: Adınızı yazın, dilediğiniz gün ve saati seçerek anında randevu oluşturun.</p>`;
        
        html += `<div class="section-title">📅 Güncel Alınan Randevular</div>`;
        html += `<div style="max-height:150px; overflow-y:auto; margin-bottom:15px;">${randevuSatirlari || '<p style="color:#aaa;font-size:12px;text-align:center;">Henüz aktif randevu bulunmuyor.</p>'}</div>`;

        html += `<form id="appointmentForm">
            <div class="section-title">👤 Yeni Randevu Al</div><input type="text" id="musteriAdi" placeholder="Örn: Mustafa Uzun" required>
            <div class="section-title">📅 Randevu Günü Seçin</div><input type="date" id="randevuTarihi" required>
            <div class="section-title">⏰ Uygun Saat Seçin</div>
            <div class="time-grid">`;
            
        const hours = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
        hours.forEach(h => {







