'use client';
import React from 'react';

export default function AnalyticsPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc' }}>
      {/* Sol Menü (Sidebar - Aynı kalması için) */}
      <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '2rem' }}>🚀 RandevuKurtaran AI</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>📊 Özet Panel</li>
          <li style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>📅 Randevular</li>
          <li style={{ padding: '0.75rem 1rem', backgroundColor: '#334155', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>📈 AI Analizleri</li>
        </ul>
      </div>

      {/* Ana İçerik Alanı */}
      <div style={{ flex: 1, padding: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>AI Performans ve Analiz Raporu</h2>
        
        {/* Büyük Verimlilik Kartları */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>Kurtarılan Ciro (Aylık)</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginTop: '0.25rem' }}>₺14,250</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>Boş Zaman Doldurma Oranı</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginTop: '0.25rem' }}>%94.2</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>Engellenen İptal Sayısı</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '0.25rem' }}>28 Adet</p>
          </div>
        </div>

        {/* AI Analiz Rapor Detayı */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem' }}>🤖 Akıllı Asistan Rapor Özeti</h4>
          <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '1rem' }}>
            RandevuKurtaran AI bu ay boyunca toplam <strong>34 son dakika iptali</strong> tespit etti. Sistem, bekleme listesindeki uygun müşterilerle otomatik olarak SMS ve yapay zeka sohbeti üzerinden iletişime geçerek bu boşlukların <strong>28 tanesini yarım saat içinde</strong> yeniden doldurmayı başardı. Bu sayede dükkan performansınız maksimum seviyede tutuldu.
          </p>
        </div>
      </div>
    </div>
  );
}
