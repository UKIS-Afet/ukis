import React, { useState } from 'react';
import { api } from '../api';
import { UserSession } from '../types';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  onClose: () => void;
}

export function Login({ onLogin, onClose }: LoginProps) {
  const [role, setRole] = useState<'afetzede' | 'bagisci' | 'yetkili' | 'belediye'>('afetzede');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [containerFullId, setContainerFullId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  
  const [bType, setBType] = useState<'bireysel' | 'kurumsal'>('bireysel');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        role,
        containerFullId: containerFullId.toUpperCase(),
        accessCode,
        password,
        bType,
        name,
        email
      });

      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[460px] rounded-2xl shadow-2xl p-7 flex flex-col gap-5 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-[15px] font-bold text-[#1e3a6e] dark:text-blue-300">Giriş</h3>
          <button className="bg-slate-100 dark:bg-slate-800 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button type="button" className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold rounded-lg ${role === 'afetzede' ? 'bg-white dark:bg-slate-700 text-[#1e3a6e] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => setRole('afetzede')}>Afetzede</button>
          <button type="button" className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold rounded-lg ${role === 'bagisci' ? 'bg-white dark:bg-slate-700 text-[#1e3a6e] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => setRole('bagisci')}>Bağışçı</button>
          <button type="button" className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold rounded-lg ${role === 'yetkili' ? 'bg-white dark:bg-slate-700 text-[#1e3a6e] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => setRole('yetkili')}>Görevli</button>
          <button type="button" className={`flex-1 py-2 text-[10px] sm:text-[11px] font-bold rounded-lg ${role === 'belediye' ? 'bg-white dark:bg-slate-700 text-[#1e3a6e] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => setRole('belediye')}>Yetkili</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {role === 'afetzede' && (
            <>
              <input type="text" value={containerFullId} onChange={e => setContainerFullId(e.target.value)} placeholder="Konteyner Numarası" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] dark:focus:border-blue-400 outline-none" />
              <input type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Hane Şifresi" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] dark:focus:border-blue-400 outline-none" />
            </>
          )}

          {role === 'bagisci' && (
            <>
              <div className="flex gap-2 mb-2">
                <label className={`flex-1 border p-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 ${bType === 'bireysel' ? 'border-[#1e3a6e] dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" name="bType" checked={bType === 'bireysel'} onChange={() => setBType('bireysel')} className="sr-only" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bireysel</span>
                </label>
                <label className={`flex-1 border p-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 ${bType === 'kurumsal' ? 'border-[#1e3a6e] dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" name="bType" checked={bType === 'kurumsal'} onChange={() => setBType('kurumsal')} className="sr-only" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Kurumsal</span>
                </label>
              </div>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Adınız veya Kurum Adı" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] outline-none" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Posta Adresiniz" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] outline-none" />
            </>
          )}

          {role === 'yetkili' && (
            <>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Görevli Şifreniz" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] outline-none" />
            </>
          )}

          {role === 'belediye' && (
            <>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Yetkili Şifreniz" required className="p-3 border border-slate-300 dark:border-slate-700 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e3a6e] outline-none" />
            </>
          )}

          {error && <div className="text-red-500 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</div>}

          <button disabled={loading} type="submit" className="bg-[#1e3a6e] dark:bg-blue-600 hover:bg-[#152e5a] dark:hover:bg-blue-700 text-white p-3 rounded-lg font-bold text-[13px]">
            {loading ? "Yükleniyor..." : role === 'yetkili' ? "Görevli Odasına Bağlan" : role === 'belediye' ? "Yetkili Paneli'ne Gir" : role === 'bagisci' ? "Bağışçı Portalı'na Gir" : "Konteyner Doğrulaması Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
