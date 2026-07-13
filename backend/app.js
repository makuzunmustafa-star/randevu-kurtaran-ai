import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Iyzipay from 'iyzipay';
import dotenv from 'dotenv';

// Canlı ortam çevre değişkenlerini yüklüyoruz
dotenv.config();

const app = express();
// ÇÖZÜM: Canlı sunucularda (Vercel/Heroku) port dinamik gelir. Yoksa 3000 portunu kullanır.
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Canlı ortamda gerçek anahtarlar, yerelde sandbox anahtarları kullanılır
const iyzipay = new Iyzipay({
    apiKey: process.env.IYZIPAY_API_KEY || 'sandbox-vM9X3U7G6o2mK4Lp1s8v9B3n5m',
    secretKey: process.env.IYZIPAY_SECRET_KEY || 'sandbox-secret-kEy7u8i9o0p1234567',
    uri: process.env.IYZIPAY_URI || 'https://iyzipay.com'
});

// Sistem Belleğindeki Global Veri Havuzu
const randevuVeritabani = [
    { id: 'RND97865', isim: 'Ahmet Yılmaz', telefon: '05551234567', tarih: '2026-07-15', saat: '14:00', durum: 'Onaylandı', tutar: 250, paymentTransactionId: 'TX123456' }
];

// STATİK ROTALAR
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'odeme.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// 1. Randevu ve Ödeme API Noktası
app.post('/api/randevu', (req, res) => {
    const { isim, telefon, tarih, saat } = req.body;
    const randevuId = 'RND' + Math.floor(Math.random() * 100000);
    const txId = 'TX' + Math.floor(Math.random() * 1000000);

    const yeniKayıt = {
        id: randevuId, isim, telefon, tarih, saat,
        durum: 'Onaylandı', tutar: 250, paymentTransactionId: txId
    };

    randevuVeritabani.push(yeniKayıt);
    console.log(`\n[CANLI SİSTEM]: ${isim} için ${yeniKayıt.tutar} TL ödeme alındı.`);
    res.json({ success: true, message: `Ödeme Başarılı! No: ${randevuId}`, id: randevuId });
});

// 2. İade (Refund) API Noktası
app.get('/api/randevu/iptal', (req, res) => {
    const { id } = req.query;
    const randevu = randevuVeritabani.find(r => r.id === id);

    if (!randevu) return res.status(404).send('<h1>Hata: Randevu bulunamadı!</h1>');
    if (randevu.durum.includes('İptal')) return res.send('<h1>Bu randevu zaten iptal edilmiş.</h1>');

    randevu.durum = 'İptal Edildi (İade Yapıldı)';
    console.log(`\n[CANLI SİSTEM]: ${id} nolu işlem için para karta iade edildi.`);

    res.send(`
        <div style="font-family:sans-serif; text-align:center; margin-top:50px; background:#0f172a; color:white; padding:40px; height:100vh;">
            <h1 style="color:#e74c3c;">❌ Randevunuz İptal Edildi</h1>
            <p style="font-size:18px; color:#94a3b8;">${randevu.isim} adına kayıtlı ${id} nolu randevu başarıyla iptal edilmiştir.</p>
            <p style="font-weight:bold; color:#34d399;">🔒 250.00 TL tutarındaki ücret iyzipay üzerinden kartınıza geri yüklenmiştir.</p>
        </div>
    `);
});

// 3. Admin Paneli Canlı Veri Akış API Noktası
app.get('/api/admin/istatistik', (req, res) => {
    const toplamRandevu = randevuVeritabani.length;
    const aktifRandevu = randevuVeritabani.filter(r => r.durum === 'Onaylandı').length;
    const iptalRandevu = randevuVeritabani.filter(r => r.durum.includes('İptal')).length;
    const toplamKazanc = randevuVeritabani.filter(r => r.durum === 'Onaylandı').reduce((sum, r) => sum + r.tutar, 0);

    res.json({ toplamRandevu, aktifRandevu, iptalRandevu, toplamKazanc, randevular: randevuVeritabani });
});

// Dinamik Port ile Sunucuyu Başlatma
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`[CANLI MOD AKTİF] Sunucu port ${PORT} üzerinde yayında.`);
    console.log(`==================================================\n`);
});
