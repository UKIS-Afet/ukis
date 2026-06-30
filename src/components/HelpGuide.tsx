import React from 'react';
import { X, BookOpen, UserCircle, MessageCircle, AlertCircle } from 'lucide-react';

export function HelpGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Kullanım Kılavuzu & Yardım
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-300 space-y-6">
          <section>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-indigo-500" /> Sisteme Giriş
            </h3>
            <p className="text-sm leading-relaxed mb-2">
              Sistemi kullanabilmek için sağ üstteki <strong>"Giriş Yap"</strong> butonunu kullanarak yetkinize uygun (Belediye Yetkilisi, AFAD, STK veya Bağışçı) şifrenizle giriş yapmalısınız. Giriş yapmadan yalnızca genel durumu ve afetzedeler için ayrılmış acil özellikleri (Acil Sesli Bildirim ve Canlı Destek) kullanabilirsiniz.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Acil Sesli Bildirim (Afetzedeler için)
            </h3>
            <p className="text-sm leading-relaxed mb-2">
              Ana ekranda bulunan <strong>"Sesli Acil Bildirim"</strong> butonuna tıklayarak konteyner numaranızı seçebilir ve acil durumunuzu (sağlık, güvenlik, yangın vb.) mikrofonunuzu kullanarak sisteme kaydedebilirsiniz. Bu bildirim anında kriz merkezine ulaşır.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" /> Canlı Destek
            </h3>
            <p className="text-sm leading-relaxed mb-2">
              Ekranın sağ alt köşesinde bulunan <strong>Canlı Destek</strong> butonu ile giriş yapmadan veya yaptıktan sonra doğrudan yetkili merkeze yazabilirsiniz. Karşılaştığınız sorunları yazabilir, dosya gönderebilirsiniz. <em>Lütfen saygı kuralları çerçevesinde kullanınız, aksi takdirde erişiminiz kısıtlanabilir.</em>
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">📦 Bağışçılar İçin</h3>
            <p className="text-sm leading-relaxed mb-2">
              Bağışçı girişi yaptıktan sonra, bölgeye göndermek istediğiniz ayni yardımın detaylarını ve ulaşım tarihini sisteme girebilirsiniz. Yetkililer talebinizi inceleyip onaylayana kadar sevkiyat başlatmayınız.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">🏢 Yetkililer İçin (AFAD / Belediye)</h3>
            <p className="text-sm leading-relaxed mb-2">
              Yetkili olarak giriş yaptığınızda, tüm bağışçı taleplerini inceleyebilir, onay/ret verebilir, konteyner durumlarını güncelleyebilir ve afetzedelerden gelen acil sesli bildirimleri dinleyebilirsiniz. Ayrıca Canlı Destek sekmesinden vatandaşlara yanıt verebilirsiniz.
            </p>
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-900 dark:hover:bg-slate-600 transition">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
