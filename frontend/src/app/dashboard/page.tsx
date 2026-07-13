'use client';
import React, { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([]);


  // Sayfa açıldığında veri tabanındaki güncel verileri simüle ederek çeker
  useEffect(() => {
    // Statik verilerin yanına veri tabanına az önce eklenen 4. AI verisini de bağlıyoruz
    const baseData = [
      { id: 1, name: 'Ahmet Yılmaz', service: 'Saç Kesimi', time: '14:30', status: 'Bekliyor', aiNote: 'Müşteri randevuyu kurtarmak için AI asistanı ile görüştü, acelesi var.' },
      { id: 2, name: 'Mehmet Demir', service: 'Sakal Tıraşı', time: '15:15', status: 'Onaylandı', aiNote: 'Düzenli müşteri, gecikme olursa SMS ile bilgilendirilmek istiyor.' },
      { id: 3, name: 'Canan Kaya', service: 'Cilt Bakımı', time: '16:00', status: 'Bekliyor', aiNote: 'İptal olan boşluğa AI tarafından otomatik olarak yerleştirildi.' },
      { id: 4, name: 'Sıradaki Müşteri (AI)', service: 'Cilt Bakımı', time: '16:00', status: 'Bekliyor', aiNote: 'İptal olan boşluğa AI tarafından otomatik olarak 0532 123 45 67 telefondan yerleştirildi.' }
    ];
    setAppointments(baseData);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      {/* Sol Menü */}
      <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '2rem' }}>🚀 RandevuKurtaran AI</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '0.75rem 1rem', backgroundColor: '#334155', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>📊 Özet Panel</li>
          <li style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>📅 Randevular</li>
          <li style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '0.5rem', cursor: 'pointer' }}>🤖 AI Ayarları</li>
        </ul>
      </div>

      {/* Ana İçerik */}
      <div style={{ flex: 1, padding: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}>İşletme Yönetim Paneli</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Toplam Randevu</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937' }}>{appointments.length}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>AI Tarafından Kurtarılan</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>5</p>
          </div>
        </div>

        {/* Tablo */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Bugünün Randevu Talepleri</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '0.75rem' }}>Müşteri</th>
                <th style={{ padding: '0.75rem' }}>İşlem</th>
                <th style={{ padding: '0.75rem' }}>Saat</th>
                <th style={{ padding: '0.75rem' }}>AI Analizi</th>
                <th style={{ padding: '0.75rem' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>{app.name}</td>
                  <td style={{ padding: '0.75rem' }}>{app.service}</td>
                  <td style={{ padding: '0.75rem' }}>{app.time}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#4b5563' }}>🤖 {app.aiNote}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: app.status === 'Onaylandı' ? '#d1fae5' : '#fef3c7', color: app.status === 'Onaylandı' ? '#065f46' : '#92400e' }}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
