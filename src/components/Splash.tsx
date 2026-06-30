import { useState, useEffect } from 'react';

export function Splash() {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (hiding) {
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [hiding]);

  if (!visible) return null;

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
    else handleSkip();
  };
  const handleSkip = () => setHiding(true);

  return (
    <div className={`fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-[#0f172a] z-[99999] flex justify-center items-center font-sans transition-all duration-500 ease-in-out ${hiding ? "opacity-0 invisible" : "opacity-100 visible"}`}>
      <div className="bg-white/80 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-white/10 w-[90%] max-w-[500px] p-8 rounded-3xl text-center shadow-2xl flex flex-col gap-5 text-slate-800 dark:text-white backdrop-blur-md relative">
        <button onClick={handleSkip} className="absolute top-4 right-5 bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-slate-400 py-1.5 px-3 rounded-lg text-[11px] font-semibold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-500 transition-all">
          Tanıtımı Atla ✕
        </button>
        <div className="text-left text-[11px] font-bold text-sky-600 dark:text-sky-400 tracking-widest mb-2 uppercase">UKİS DİNAMİK SİSTEM REHBERİ</div>
        
        {step === 1 && (
          <div className="animate-pulse">
            <div className="text-5xl mb-3">🏠</div>
            <h3 className="text-lg font-bold mb-2">1. Afetzede Hane Portalı</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Konteyner kent sakinleri kendilerine verilen hane şifreleriyle kotalarını anlık denetler ve güvenceli talep üretirler.</p>
          </div>
        )}
        {step === 2 && (
          <div className="animate-pulse">
            <div className="text-5xl mb-3">📦</div>
            <h3 className="text-lg font-bold mb-2">2. Kontrollü Bağış Masası</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Bağışçılar sisteme kayıt olup ayni yardımlarını bildirir. Kriz masası onay vermeden lojistik transfer başlatılmaz.</p>
          </div>
        )}
        {step === 3 && (
          <div className="animate-pulse">
            <div className="text-5xl mb-3">🤖</div>
            <h3 className="text-lg font-bold mb-2">3. Yapay Zeka Ses Odası</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Teknoloji erişimi kısıtlı vatandaşlar için mikrofon açılır; ses analiziyle acil durum ekipleri otomatik koordine edilir.</p>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-4 mt-2">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map(p => (
              <div key={p} className={`h-2 transition-all duration-300 ${step === p ? "bg-sky-500 dark:bg-sky-400 w-6" : "bg-slate-300 dark:bg-slate-600 w-2"} rounded-full`} />
            ))}
          </div>
          <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold text-[13px] transition-colors">
            {step === 3 ? "Sistemi Başlat ✔" : "Devam Et →"}
          </button>
        </div>
      </div>
    </div>
  );
}
