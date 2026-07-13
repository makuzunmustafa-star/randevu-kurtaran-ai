'use client';
import React, { useState } from 'react';

export default function WaitlistPage() {
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Saç Kesimi');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Harika! AI sizi sıraya ekledi. Uygun bir boşluk açıldığında SMS alacaksınız.`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', width: '100%', maxWidth: '450px', border: '1px solid #bbf7d0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '3rem' }}>🤖</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534', marginTop: '0.5rem' }}>RandevuKurtaran Akıllı Sıra</h2>
          <p style={{ color: '#4b5563', fontSize: '0.875rem', marginTop: '0.25rem' }}>İstediğiniz saat dolu mu? AI bekleme listesine katılın, iptal olan randevular anında telefonunuza gelsin!</p>
        </div>

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>İstediğiniz Hizmet</label>
            <select value={service} onChange={(e) => setService(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '1rem' }}>
              <option>Saç Kesimi</option>
              <option>Sakal Tıraşı</option>
              <option>Cilt Bakımı</option>
              <option>Komple Bakım</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Telefon Numaranız</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555 555 55 55" required style={{ width: '93%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '1rem' }} />
          </div>

          <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Beni Akıllı Sıraya Ekle
          </button>
        </form>
      </div>
    </div>
  );
}
