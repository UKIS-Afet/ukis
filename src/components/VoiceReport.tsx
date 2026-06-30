import { useState } from 'react';
import { api } from '../api';
import { showToast } from '../lib/toast';

interface VoiceReportProps {
  containerId?: string;
  onClose: () => void;
}

export function VoiceReport({ containerId, onClose }: VoiceReportProps) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('Lütfen konuşmak için butona basın...');
  const [result, setResult] = useState<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      showToast("Mikrofona erişim sağlanamadı. Lütfen izinleri kontrol edin.", 'error');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Tarayıcınız canlı ses tanımayı desteklemiyor. Lütfen Chrome veya Safari kullanın.", 'error');
      return;
    }

    if (recording) return;

    const sr = new SpeechRecognition();
    sr.continuous = false;
    sr.lang = 'tr-TR';

    sr.onstart = () => {
      setRecording(true);
      setTranscript('Sizi dinliyorum, lütfen konteyner numaranızı ve acil durumu söyleyin...');
      setResult(null);
    };

    sr.onerror = (e: any) => {
      setRecording(false);
      setTranscript(`Bir hata oluştu: ${e.error}`);
    };

    sr.onend = () => {
      setRecording(false);
    };

    sr.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      setTranscript(`"${txt}"`);
      analyzeAndReport(txt);
    };

    sr.start();
  };

  const analyzeAndReport = async (text: string) => {
    const lower = text.toLowerCase();
    let priority = "📊 STANDART ÖNCELİK";
    let type = "complaint";

    if (lower.includes("yangın") || lower.includes("alev") || lower.includes("duman")) {
      priority = "🔥 KRİTİK SEVİYE";
      type = "emergency";
    } else if (lower.includes("su") || lower.includes("tavan") || lower.includes("yağmur")) {
      priority = "💧 YÜKSEK SEVİYE";
      type = "emergency";
    } else if (lower.includes("bebek") || lower.includes("mama") || lower.includes("bez")) {
      priority = "🍼 ÖNCELİKLİ SEVİYE";
      type = "emergency";
    } else if (lower.includes("hasta") || lower.includes("ambulans") || lower.includes("doktor") || lower.includes("tıbbi")) {
      priority = "🚑 ACİL SAĞLIK";
      type = "emergency";
    }

    setResult({ priority, type });

    if (!containerId) {
      showToast("Sisteme giriş yapmadığınız için acil durum bildirimi isimsiz olarak (Varsayılan Konteyner - 1) iletilecek.", 'error');
    }

    try {
      await api.post('/reports', {
        containerId: containerId || '1',
        description: text,
        type,
        priority,
        status: "new",
        source: "voice_ai"
      });
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
      console.error(e);
    }
  };

  const simulate = (keyword: string) => analyzeAndReport(keyword);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-[460px] p-6 rounded-2xl shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800">🎙️ AI Sesli Acil Raporlama Odası</h3>
          <button className="text-slate-500 hover:text-slate-800 text-2xl font-bold leading-none" onClick={onClose}>×</button>
        </div>
        
        <p className="text-[13px] text-slate-500 text-center font-medium">Mikrofon simgesine tıklayıp konuşun.</p>
        
        <div className="flex flex-col items-center gap-2 py-2">
          <button onClick={startRecording} className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all border-4 border-white ${recording ? 'bg-red-600 animate-pulse scale-110' : 'bg-red-500 hover:bg-red-600 hover:scale-105'} text-white`}>
            🎤
          </button>
          <p className="text-xs font-bold text-slate-500 mt-2">{recording ? "Sizi Dinliyor..." : "Mikrofon Kapalı"}</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm shadow-inner flex flex-col min-h-[100px]">
          <div className="text-slate-400 text-[10px] mb-2 font-bold select-none">{">> CANLI SES ANALİZİ"}</div>
          <div className="text-green-400 flex-1 whitespace-pre-wrap">{transcript}</div>
          {result && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-green-300 text-xs">
              <div className="mb-1"><span className="font-bold text-white opacity-80">Öncelik:</span> {result.priority}</div>
            </div>
          )}
        </div>

        <div className="mt-1 border-t border-slate-200 pt-4">
          <p className="text-[11px] text-slate-500 font-bold mb-3 uppercase tracking-wide">Saha Acil Senaryo Kısayolları (Test):</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm" onClick={() => simulate('Yangın')}>🔥 Yangın Alarmı</button>
            <button className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm" onClick={() => simulate('Tavan Sızıntısı')}>💧 Tavan Sızıntısı</button>
            <button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm" onClick={() => simulate('Bebek İhtiyacı')}>🍼 Bebek İhtiyacı</button>
            <button className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm" onClick={() => simulate('Tıbbi Durum')}>🚑 Tıbbi Durum</button>
          </div>
        </div>
      </div>
    </div>
  );
}
