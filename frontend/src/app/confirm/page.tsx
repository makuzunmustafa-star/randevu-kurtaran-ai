'use client';
import React, { useState } from 'react';

export default function ConfirmPage() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', width: '100%', maxWidth: '450px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
        
        {!confirmed ? (
          <>
            <span style={{ fontSize: '3rem' }}>📅</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a', marginTop: '0.5rem' }}>Randevu Değişiklik Onayı</h2>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '2rem' }}>
              İptal edilen bir randevu yerine AI asistanımız sizi **Bugün Saat 16:00** için sıraya yerleştirdi. Bu saati onaylıyor musunuz?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setConfirmed(true)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Evet, Onaylıyorum
              </button>
              <button onClick={() => alert('Randevu reddedildi, sıra bir sonraki kişiye devrediliyor.')} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Reddet / İptal Et
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: '3rem' }}>✅</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', marginTop: '0.5rem' }}>İşlem Başarılı!</h2>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Randevunuz başarıyla onaylandı ve işletmeye bildirildi. Zamanında orada olmayı unutmayın!
            </p>
          </>
        )}

      </div>
    </div>
  );
}
