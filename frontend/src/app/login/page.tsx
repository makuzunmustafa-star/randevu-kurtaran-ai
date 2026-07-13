'use client';
import React from 'react';

export default function LoginPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>🚀 RandevuKurtaran AI</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); alert('Giriş başarılı!'); }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>E-posta Adresi</label>
            <input type="email" required style={{ width: '92%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }} placeholder="ornek@eposta.com" />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Şifre</label>
            <input type="password" required style={{ width: '92%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }} placeholder="••••••••" />
          </div>
          
          <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>Giriş Yap</button>
        </form>
      </div>
    </div>
  );
}
