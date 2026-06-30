import React, { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Login } from './components/Login';
import { VoiceReport } from './components/VoiceReport';
import { DashboardVictim } from './components/DashboardVictim';
import { DashboardAdmin } from './components/DashboardAdmin';
import { DashboardDonor } from './components/DashboardDonor';
import { DashboardBelediye } from './components/DashboardBelediye';
import { ThemeToggle } from './components/ThemeToggle';
import { FontSizeToggle } from './components/FontSizeToggle';
import { LiveChat } from './components/LiveChat';
import { HelpGuide } from './components/HelpGuide';
import { UserSession, Product, Container } from './types';
import { api } from './api';
import { LogOut, BookOpen, AlertTriangle } from 'lucide-react';

const e0="https://i.hizliresim.com/onz8i4w.png";

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 text-red-900 p-8 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Bir Hata Oluştu (Error Boundary)</h1>
          <pre className="bg-white p-4 rounded shadow whitespace-pre-wrap text-sm max-w-4xl w-full">
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => window.location.reload()}>
            Sayfayı Yenile
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [container, setContainer] = useState<Container | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showVoiceReport, setShowVoiceReport] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  useEffect(() => {
    // Fetch product catalog on load
    api.get('/products').then(setProducts).catch(console.error);
  }, []);

  const handleLogin = async (session: UserSession) => {
    if (session.role === 'afetzede' && session.containerId) {
      try {
        const c = await api.get(`/containers/${session.containerId}`);
        setContainer(c);
      } catch (e) {
        console.error("Failed to load container data", e);
      }
    }
    setUser(session);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    setContainer(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f8fc] dark:bg-slate-900 text-[#1e293b] dark:text-slate-100 font-sans flex flex-col pt-16 relative overflow-x-hidden">
      <Splash />
      
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
        <img src={e0} alt="Background Logo" className="w-[50vw] min-w-[300px] max-w-[600px] aspect-square object-cover rounded-full mix-blend-multiply dark:mix-blend-normal opacity-[0.06] dark:opacity-[0.12]" />
      </div>

      <nav className="fixed top-0 inset-x-0 bg-[#1e3a6e] dark:bg-slate-950 text-white px-3 sm:px-8 py-3.5 flex justify-between items-center shadow-sm z-50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-2 ">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-lg">
              <img src={e0} alt="UKİS Logo" className="w-full h-full object-cover"/>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg leading-none hidden sm:inline">UKİS</span>
            <span className="text-[10px] text-slate-300 font-medium tracking-wider uppercase mt-1 hidden sm:inline">Ulusal Konteyner İzleme Sistemi</span>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-50">
          <FontSizeToggle />
          <ThemeToggle />
          
          <button className="flex flex-col sm:flex-row border border-white/20 bg-white/10 p-1 sm:px-3 sm:py-1.5 rounded-lg text-white text-[9px] leading-none sm:text-sm font-medium hover:bg-white/20 transition items-center gap-0.5 sm:gap-1.5" onClick={() => setShowHelpGuide(true)} title="Yardım / Kılavuz">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Kılavuz</span>
          </button>
          
          <button className="bg-red-600 border border-red-500 p-1 sm:px-3 sm:py-1.5 rounded-lg text-white text-[9px] leading-none sm:text-sm font-bold hover:bg-red-700 shadow-md flex flex-col sm:flex-row items-center transition gap-0.5 sm:gap-1.5" onClick={() => setShowVoiceReport(true)} title="Acil Bildirim">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Acil</span>
          </button>

          {user ? (
            <>
              {user.role === 'afetzede' && container && (
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md border border-blue-100 dark:border-blue-800">
                  Konteyner: {container.containerFullId}
                </span>
              )}
              {user.role === 'yetkili' && (
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md border border-red-100 dark:border-red-800">
                  Yetkili Modu
                </span>
              )}
              {user.role === 'belediye' && (
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md border border-amber-100 dark:border-amber-800">
                  Belediye Başkanı
                </span>
              )}
              {(user.role === 'bagisci_bireysel' || user.role === 'bagisci_kurumsal') && (
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-md border border-green-100 dark:border-green-800">
                  Bağışçı: {user.name}
                </span>
              )}
              <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors relative z-50 pointer-events-auto" title="Çıkış Yap" onClick={handleLogout}>
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <button className="border border-white/20 bg-white/10 px-3 sm:px-4 py-1.5 rounded-lg text-white text-[11px] sm:text-sm font-bold hover:bg-white/20 shadow-sm transition" onClick={() => setShowLogin(true)}>
                Giriş Yap
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 pb-10 px-6 py-8 relative z-10 pointer-events-auto">
        {!user ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-start mb-10 mt-6">
            <div className="flex flex-col gap-5 mt-4">
              <div className="text-[11px] font-bold text-blue-600 tracking-widest uppercase">🧭 AFET SONRASI DESTEK PLATFORMU</div>
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a6e] dark:text-blue-400 leading-tight mb-2">Konteyner kentte yaşıyorsanız</h1>
                <p className="text-base text-slate-500 dark:text-slate-400">ihtiyaçlarınızı buradan iletebilirsiniz.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border border-amber-500 text-amber-500 flex items-center justify-center font-serif text-xs font-bold bg-amber-50 dark:bg-amber-900/30 shrink-0">i</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100 text-[13px] block mb-1">Hizmetlerimizden yararlanmak için lütfen giriş yapınız.</strong>
                    Afetzede kodu, Bağışçı hesabı veya Yetkili şifresi ile tüm modüllere erişebilirsiniz.
                  </div>
                </div>
                <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-xl text-xs flex justify-between items-center shadow-md w-full max-w-[240px] transition" onClick={() => setShowLogin(true)}>
                  <span>Şimdi Giriş Yap</span>
                  <span>→</span>
                </button>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 my-1">
                <p className="text-sm font-semibold text-[#1e3a6e] dark:text-blue-400">"Her türlü durumda yanınızda olacağımıza söz verdik,</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">verdiğimiz sözü tutmaya da özen gösteriyoruz."</p>
              </div>
            </div>
            <div className="bg-[#cbe2f7] dark:bg-slate-800 rounded-3xl p-4 border border-blue-600/15 dark:border-slate-700 flex items-center justify-center shadow-inner">
              <img src="https://i.hizliresim.com/cu9ofk3.jpeg" alt="Info" className="w-full h-auto rounded-2xl shadow-inner object-cover" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {user.role === 'afetzede' && container && <DashboardVictim container={container} products={products} onProfileUpdate={setContainer} />}
            {user.role === 'yetkili' && <DashboardAdmin />}
            {user.role === 'belediye' && <DashboardBelediye user={user} />}
            {(user.role === 'bagisci_bireysel' || user.role === 'bagisci_kurumsal') && <DashboardDonor user={user} />}
          </div>
        )}
      </main>

      {showLogin && <Login onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
      {showVoiceReport && <VoiceReport containerId={container?.id} onClose={() => setShowVoiceReport(false)} />}
      {showHelpGuide && <HelpGuide onClose={() => setShowHelpGuide(false)} />}
      <LiveChat />
    </div>
  );
}
