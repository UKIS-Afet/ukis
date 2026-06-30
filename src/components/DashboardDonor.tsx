import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserSession, RequestItem, Container } from '../types';
import { showToast } from '../lib/toast';
import { RefreshCw } from 'lucide-react';

export function DashboardDonor({ user }: { user: UserSession }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user.email || '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [userPendingRequests, setUserPendingRequests] = useState<Set<string>>(new Set());
  const [userApprovedRequests, setUserApprovedRequests] = useState<Set<string>>(new Set());
  const [userPendingDonationMap, setUserPendingDonationMap] = useState<Map<string, string>>(new Map());

  const loadRequests = async () => {
    if (user.role !== 'bagisci_bireysel' && user.role !== 'bagisci_kurumsal') return;
    try {
      const [reqsRes, contRes, prodRes, donRes] = await Promise.all([
        api.get('/requests'),
        api.get('/containers'),
        api.get('/products'),
        api.get('/donations')
      ]);
      const cMap = new Map();
      contRes.forEach((c: Container) => cMap.set(c.id, c.containerFullId));
      
      const pMap = new Map();
      prodRes.forEach((p: any) => pMap.set(p.id, p.name));
      
      const myDonations = donRes.filter((d: any) => d.donorId === user.uid);
      const pendingSet = new Set<string>();
      const approvedSet = new Set<string>();
      const pDonationMap = new Map<string, string>();
      
      myDonations.forEach((d: any) => {
        if (d.status === 'pending') {
           pDonationMap.set(d.id, d.id);
        }
        if (Array.isArray(d.fulfilledRequests)) {
          if (d.status === 'pending') {
            d.fulfilledRequests.forEach((reqId: string) => {
              pendingSet.add(reqId);
              pDonationMap.set(reqId, d.id);
            });
          } else if (d.status === 'approved') {
            d.fulfilledRequests.forEach((reqId: string) => approvedSet.add(reqId));
          }
        }
      });
      
      setUserPendingRequests(pendingSet);
      setUserApprovedRequests(approvedSet);
      setUserPendingDonationMap(pDonationMap);

      if (user.role === 'bagisci_bireysel') {
        const mapped = reqsRes
          .filter((r: any) => r.status === 'pending' || approvedSet.has(r.id))
          .map((r: any) => ({ ...r, containerName: cMap.get(r.containerId) || 'Bilinmeyen Konteyner', productName: pMap.get(r.productId) || 'Bilinmeyen Ürün' }));
        setRequests(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRequests();
    const intv = setInterval(loadRequests, 60000);
    return () => clearInterval(intv);
  }, [user.role]);

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  const cancelRequest = async (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const donationId = userPendingDonationMap.get(reqId);
    if (!donationId) return;
    
    setLoading(true);
    try {
      await api.post('/donations/cancel-request', { donationId, reqId });
      loadRequests();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitBireysel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selected.size === 0) return;
    if (!phone.trim()) {
      showToast("Lütfen telefon numaranızı girin.", "error");
      return;
    }
    setLoading(true);
    try {
      const items = Array.from(selected).map(id => {
        const req = requests.find(r => r.id === id);
        return { productId: req?.productId, productName: req?.productName, quantity: req?.quantity };
      });
      await api.post('/donations', {
        donorId: user.uid,
        donorName: user.name || 'Bireysel Bağışçı',
        donorPhone: phone,
        donorEmail: email,
        type: 'bireysel',
        items,
        fulfilledRequests: Array.from(selected),
        status: 'pending'
      });
      showToast('Talebiniz Yetkiliye İletildi.', 'success');
      setSelected(new Set());
      setShowConfirm(false);
      setPhone('');
      loadRequests();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelDonation = async (donationId: string) => {
    setLoading(true);
    try {
      await api.put(`/donations/${donationId}`, { status: 'cancelled' });
      loadRequests();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitKurumsal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    if (!phone.trim()) {
      showToast("Lütfen telefon numaranızı girin.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post('/donations', {
        donorId: user.uid,
        donorName: user.name || 'Kurumsal Bağışçı',
        donorPhone: phone,
        donorEmail: email,
        type: 'kurumsal',
        description: desc,
        status: 'pending'
      });
      showToast('Talebiniz Yetkiliye İletildi.', 'success');
      setDesc('');
      setPhone('');
      loadRequests();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (user.role === 'bagisci_kurumsal') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex justify-end">
          <button onClick={loadRequests} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors mb-3">
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kurumsal Bağış Girişi</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lütfen konteyner kente ulaştırmak istediğiniz ayni yardımın detaylarını ve lojistik sürecini özetleyiniz.</p>
          </div>
          <form onSubmit={submitKurumsal} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <label className="flex-1 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Telefon Numarası</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none" placeholder="05XX XXX XX XX" />
              </label>
              <label className="flex-1 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">E-Posta (İsteğe Bağlı)</span>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none" placeholder="ad@sirket.com" />
              </label>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Gönderilecek Yardımlar (Detaylı)</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} required className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[150px] text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none" placeholder="Örn: 50 koli kışlık giyim..." />
            </div>
            <button type="submit" disabled={loading || !desc.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
              {loading ? "Gönderiliyor..." : "Bağış Bildirimini Yetkiliye İlet"}
            </button>
          </form>
        </div>

        <div>
           <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4">Mevcut Bağış Bildirimleriniz</h3>
           <div className="flex flex-col gap-4">
             {Array.from<string>(userPendingDonationMap.values()).map(donId => (
               <div key={donId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex justify-between items-center">
                 <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Değerlendirmede olan bir bildiriminiz var</span>
                 <button onClick={() => cancelDonation(donId)} disabled={loading} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold rounded-lg transition-colors border border-red-200 dark:border-red-800">İptal Et</button>
               </div>
             ))}
             {userPendingDonationMap.size === 0 && <p className="text-sm text-slate-500">Henüz bir bildiriminiz yok.</p>}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <button onClick={loadRequests} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors mb-3">
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>
      {(userPendingRequests.size > 0 || userApprovedRequests.size > 0) && (
        <div>
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4">Değerlendirmede ve Onaylanan Karşılamalarınız</h3>
          <div className="flex flex-col gap-3">
            {requests.filter(req => userPendingRequests.has(req.id) || userApprovedRequests.has(req.id)).map(req => {
              const isPendingForUser = userPendingRequests.has(req.id);
              return (
                <div key={`pending-${req.id}`} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{req.containerName}</span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">{req.quantity} Adet</span>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{req.productName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                     {isPendingForUser ? (
                       <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/80 dark:text-orange-200 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm">Değerlendiriliyor</span>
                     ) : (
                       <span className="bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-200 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm text-center">Talebiniz onaylandı<br/>sizinle iletişime geçilecektir</span>
                     )}
                     {isPendingForUser && (
                       <button onClick={(e) => cancelRequest(req.id, e)} disabled={loading} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold rounded-lg transition-colors border border-red-200 dark:border-red-800">
                         İptal Et
                       </button>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Afetzede İhtiyaç Havuzu</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Konteyner evlerden gelen anlık talepler. Karşılamak istediğiniz talepleri seçin.</p>
          </div>
          {selected.size > 0 && (
            <button onClick={() => setShowConfirm(true)} disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm whitespace-nowrap">
              {loading ? "İşleniyor..." : `Seçili ${selected.size} Talebi Karşıla`}
            </button>
          )}
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-5">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">İletişim Bilgileri</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Yetkililerin sizinle iletişime geçip bağışı teslim alabilmesi için iletişim bilgilerinizi giriniz.</p>
              <form onSubmit={submitBireysel} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Telefon Numarası</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none" placeholder="05XX XXX XX XX" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">E-Posta (İsteğe Bağlı)</span>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none" placeholder="ad@sirket.com" />
                </label>
                <div className="flex gap-3 justify-end mt-2">
                  <button type="button" onClick={() => setShowConfirm(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">İptal</button>
                  <button type="submit" disabled={loading || !phone.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50">Onayla ve Gönder</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map(req => {
          const isPendingForUser = userPendingRequests.has(req.id);
          const isApprovedForUser = userApprovedRequests.has(req.id);
          const isSelected = selected.has(req.id);
          const isDisabled = isPendingForUser || isApprovedForUser;

          return (
            <div key={req.id} onClick={() => !isDisabled && toggleSelect(req.id)} className={`relative p-4 rounded-2xl border-2 transition-all ${isDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 opacity-80' : isSelected ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'}`}>
              
              {isPendingForUser && (
                <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] rounded-2xl flex flex-col gap-2 items-center justify-center z-10">
                   <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/80 dark:text-orange-200 font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm cursor-default">Talebiniz değerlendiriliyor</span>
                   <button onClick={(e) => cancelRequest(req.id, e)} disabled={loading} className="px-4 py-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs font-bold rounded-lg shadow-md border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer pointer-events-auto z-20">
                     İptal Et
                   </button>
                </div>
              )}

              {isApprovedForUser && (
                <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                   <span className="bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-200 font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm text-center">Talebiniz onaylandı<br/>sizinle iletişime geçilecektir</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-slate-800 dark:text-slate-100">{req.containerName}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isSelected && "✓"}
                </div>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center relative z-0">
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{req.productName}</span>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400">{req.quantity} Adet</span>
              </div>
            </div>
          );
        })}
        {requests.length === 0 && <p className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400">Şu anda sistemde karşılanmamış açık talep bulunmuyor.</p>}
      </div>
    </div>
  </div>
  );
}
