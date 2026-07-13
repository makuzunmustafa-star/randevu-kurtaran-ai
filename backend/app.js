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

// POSTGRESQL BAĞLANTI HAVUZU
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.MONGODB_URI,
    ssl: { rejectUnauthorized: false }
});

// YENİ RANDEVULAR TABLOSUNU DA İÇEREN GELİŞMİŞ ALTYAPI
async function tabloyuHazirla() {
    try {
        // 1. Dükkanlar Tablosu
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
        
        // 2. Randevular Tablosu (Yeni Eklenen Akıllı Alan)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS randevular (
                id SERIAL PRIMARY KEY,
                dukkan_slug VARCHAR(255) NOT NULL,
                musteri_adi VARCHAR(255) NOT NULL,
                randevu_tarihi VARCHAR(100) NOT NULL,
                randevu_saati VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ PostgreSQL Dükkanlar ve Randevular Altyapısı Hazır.');
    } catch (err) {
        console.error('❌ Altyapı kurulum hatası:', err);
    }
}
tabloyuHazirla();

// SLUG FONKSİYONU
function slugify(text) {
    const trMap = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o' };
    return text.toString().toLowerCase().trim().replace(/[çğşüıöÇĞŞÜİÖ]/g, match => trMap[match]).replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// KURUMSAL KAYIT ROTASI
async function kayitIsleyici(req, res) {
    try {
        const companyName = req.body.companyName || req.body.name;
        const sectorType = req.body.sectorType || req.body.sector;
        const phone = req.body.phone;
        if (!companyName || !sectorType || !phone) return res.status(400).json({ success: false, message: "Eksik alan var." });
        let generatedSlug = slugify(companyName);
        const mevcutDukkan = await pool.query('SELECT id FROM dukkanlar WHERE slug = $1', [generatedSlug]);
        if (mevcutDukkan.rows.length > 0) generatedSlug = `${generatedSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        await pool.query('INSERT INTO dukkanlar (name, sector, phone, slug) VALUES ($1, $2, $3, $4)', [companyName, sectorType, phone, generatedSlug]);
        res.json({ success: true, slug: generatedSlug });
    } catch (error) {
        res.status(500).json({ success: false, message: "Hata oluştu." });
    }
}
app.post('/api/register-business', kayitIsleyici);
app.post('/api/register', kayitIsleyici);

// YENİ: MÜŞTERI DEN GELEN RANDEVUYU VERI TABANINA KAYDETME ROTASI
app.post('/api/book-appointment', async (req, res) => {
    try {
        const { dukkanSlug, musteriAdi, randevuTarihi, randevuSaati } = req.body;
        if (!dukkanSlug || !musteriAdi || !randevuTarihi || !randevuSaati) {
            return res.status(400).json({ success: false, message: "Lütfen tüm seçimleri yapın." });
        }
        
        // Aynı saatte başka randevu var mı kontrolü
        const cakismaKontrol = await pool.query(
            'SELECT id FROM randevular WHERE dukkan_slug = $1 AND randevu_tarihi = $2 AND randevu_saati = $3',
            [dukkanSlug, randevuTarihi, randevuSaati]
        );
        
        if (cakismaKontrol.rows.length > 0) {
            return res.status(400).json({ success: false, message: "⚠️ Bu saat doludur. Lütfen başka bir saat seçin." });
        }

        // Randevuyu PostgreSQL'e kaydet
        await pool.query(
            'INSERT INTO randevular (dukkan_slug, musteri_adi, randevu_tarihi, randevu_saati) VALUES ($1, $2, $3, $4)',
            [dukkanSlug, musteriAdi, randevuTarihi, randevuSaati]
        );

        res.json({ success: true, message: `🎉 Randevunuz başarıyla alındı! Yapay zeka koltuğunuzu ayırdı.` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Randevu kaydedilemedi." });
    }
});

// DİNAMİK MÜŞTERİ RANDEVU EKRANI (GELİŞMİŞ AKILLI TAKVİMLİ GET ROTASI)
app.get('/:slug', async (req, res) => {
    try {
        const dukkanSlug = req.params.slug;
        if (dukkanSlug.includes('.') || dukkanSlug === 'favicon.ico') return;
        const dukkanSorgu = await pool.query('SELECT * FROM dukkanlar WHERE slug = $1', [dukkanSlug]);
        if (dukkanSorgu.rows.length === 0) return res.status(404).send('<h1>❌ İşletme Bulunamadı</h1>');
        const dukkan = dukkanSorgu.rows[0];

        // Müşterinin önüne açılacak dinamik interaktif takvim arayüzü
        res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>\${dukkan.name} - Akıllı Randevu</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
                    .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.05); text-align: center; max-width: 450px; width: 100%; box-sizing: border-box; }
                    h1 { color: #2c3e50; margin-bottom: 5px; font-size: 26px; }
                    .badge { background: #3498db; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; display: inline-block; margin-bottom: 20px; }
                    .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-align: left; color: #34495e; font-size: 14px; }
                    input[type="text"], input[type="date"] { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; margin-bottom: 15px; box-sizing: border-box; }
                    .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                    .time-slot { background: #f8f9fa; border: 2px solid #e2e8f0; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.2s; }
                    .time-slot:hover { border-color: #3498db; background: #e8f4fd; }
                    .time-slot.selected { background: #3498db; color: white; border-color: #2980b9; }
                    .btn { background: #2ecc71; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; margin-top: 10px; transition: background 0.2s; }
                    .btn:hover { background: #27ae60; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>💈 \${dukkan.name}</h1>
                    <div class="badge">\${dukkan.sector}</div>
                    <p style="color: #7f8c8d; font-size: 14px;">Müşteri Paneli: Adınızı yazın, dilediğiniz gün ve saati seçerek anında randevu oluşturun.</p>
                    
                    <form id="appointmentForm">
                        <div class="section-title">👤 Adınız Soyadınız</div>
                        <input type="text" id="musteriAdi" placeholder="Örn: Mustafa Uzun" required>
                        
                        <div class="section-title">📅 Randevu Günü Seçin</div>
                        <input type="date" id="randevuTarihi" required>
                        
                        <div class="section-title">⏰ Uygun Saat Seçin</div>
                        <div class="time-grid">
                            <div class="time-slot" onclick="selectTime(this, '09:00')">09:00</div>
                            <div class="time-slot" onclick="selectTime(this, '10:00')">10:00</div>
                            <div class="time-slot" onclick="selectTime(this, '11:00')">11:00</div>
                            <div class="time-slot" onclick="selectTime(this, '13:00')">13:00</div>
                            <div class="time-slot" onclick="selectTime(this, '14:00')">14:00</div>
                            <div class="time-slot" onclick="selectTime(this, '15:00')">15:00</div>
                            <div class="time-slot" onclick="selectTime(this, '16:00')">16:00</div>
                            <div class="time-slot" onclick="selectTime(this, '17:00')">17:00</div>
                            <div class="time-slot" onclick="selectTime(this, '18:00')">18:00</div>
                        </div>
                        
                        <button type="submit" class="btn">Randevuyu Kesinleştir</button>
                    </form>
                </div>

                <script>
                    let selectedTimeSlot = "";
                    
                    // Takvimde bugünden öncesini seçmeyi engelleme
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('randevuTarihi').setAttribute('min', today);

                    function selectTime(element, time) {
                        document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
                        element.classList.add('selected');
                        selectedTimeSlot = time;
                    }

                    document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
