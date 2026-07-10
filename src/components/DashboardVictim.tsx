import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Container, Product, RequestItem } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, RefreshCw } from 'lucide-react';
import { showToast } from '../lib/toast';

interface Props {
  container: Container;
  products: Product[];
  onProfileUpdate?: (c: Container) => void;
  refreshProducts?: () => void;
}

export function DashboardVictim({ container, products, onProfileUpdate, refreshProducts }: Props) {
  const [tab, setTab] = useState<'requests' | 'profile' | 'issues'>('requests');
  const [cat, setCat] = useState('Gıda');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile forms
  const [adults, setAdults] = useState(container.adults.toString());
  const [children, setChildren] = useState(container.children.toString());
  const [babies, setBabies] = useState(container.babies.toString());
  const [contact, setContact] = useState(container.contactNumber || '');
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Issue forms
  const [issueSpecial, setIssueSpecial] = useState('');
  const [issueComplaint, setIssueComplaint] = useState('');
  const [issueMessage, setIssueMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Clothing request modal
  const [clothingModal, setClothingModal] = useState<{product: Product, maxAllowed: number} | null>(null);
  const [clothingSize, setClothingSize] = useState('M');
  const [clothingAge, setClothingAge] = useState('');
  const [clothingGender, setClothingGender] = useState('Erkek');

  const categories = ["Gıda", "Giyim", "Hijyen"];

  const loadRequests = async () => {
    try {
      const res = await api.get(`/requests?containerId=${container.id}`);
      setRequests(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    
    // Stok ve talepleri anlık olarak yenilemek için 5 saniyede bir polling (otomatik yenileme)
    const interval = setInterval(() => {
      loadRequests();
      if (refreshProducts) {
        refreshProducts();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [container.id, refreshProducts]);

  const requestProduct = async (product: Product, maxAllowed: number, extra?: { size?: string, age?: string, notes?: string }) => {
    if (product.mainCategory === 'Giyim' && !extra) {
      setClothingModal({ product, maxAllowed });
      return;
    }

    try {
      await api.post('/requests', {
        containerId: container.id,
        productId: product.id,
        productName: product.name,
        quantity: maxAllowed,
        status: 'pending',
        size: extra?.size,
        age: extra?.age,
        notes: extra?.notes
      });
      loadRequests();
      if (refreshProducts) refreshProducts();
      setClothingModal(null);
      setClothingSize('M');
      setClothingAge('');
      setClothingGender('Erkek');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleClothingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clothingModal) return;
    requestProduct(clothingModal.product, clothingModal.maxAllowed, {
      size: clothingSize,
      age: clothingAge,
      notes: `Cinsiyet: ${clothingGender}`
    });
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    
    // Basit telefon numarası doğrulaması
    const phoneRegex = /^[0-9\s\-\+()]{10,}$/;
    if (contact && !phoneRegex.test(contact.replace(/\s+/g, ''))) {
      setProfileMessage({ type: 'error', text: "Lütfen geçerli bir telefon numarası giriniz (en az 10 haneli)." });
      return;
    }

    try {
      const updated = await api.put(`/containers/${container.id}`, {
        contactNumber: contact
      });
      if (onProfileUpdate) onProfileUpdate(updated);
      setProfileMessage({ type: 'success', text: "Profil bilgileriniz başarıyla güncellendi." });
    } catch (e: any) {
      setProfileMessage({ type: 'error', text: "Hata oluştu: " + e.message });
    }
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueMessage(null);
    if (!issueSpecial.trim() && !issueComplaint.trim()) {
      setIssueMessage({ type: 'error', text: "Lütfen en az bir alanı doldurun." });
      return;
    }
    try {
      if (issueSpecial.trim()) {
        await api.post('/issues', {
          containerId: container.id,
          type: 'special_need',
          description: issueSpecial.trim()
        });
      }
      if (issueComplaint.trim()) {
        await api.post('/issues', {
          containerId: container.id,
          type: 'complaint',
          description: issueComplaint.trim()
        });
      }
      setIssueSpecial('');
      setIssueComplaint('');
      setIssueMessage({ type: 'success', text: "Talebiniz görevlilere iletildi." });
    } catch (e: any) {
      setIssueMessage({ type: 'error', text: "Hata oluştu: " + e.message });
    }
  };

  const cancelRequest = async (reqId: string) => {
    try {
      await api.put(`/requests/${reqId}`, { status: 'cancelled' });
      loadRequests();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const getCooldownStatus = (productId: string, cooldownHours: number) => {
    const existing = requests.find(r => r.productId === productId && r.status !== 'cancelled' && r.status !== 'rejected');
    if (!existing) return { available: true };
    const diffHours = (new Date().getTime() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours < cooldownHours) {
      const rem = Math.ceil(cooldownHours - diffHours);
      return { available: false, remHours: rem % 24, remDays: Math.floor(rem / 24), existingReq: existing };
    }
    return { available: true };
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-slate-200 items-center justify-between">
        <div className="flex gap-4">
          <button onClick={() => setTab('requests')} className={`pb-3 font-semibold text-[15px] flex items-center gap-2 transition-colors ${tab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>İhtiyaç Talebi</button>
          <button onClick={() => setTab('profile')} className={`pb-3 font-semibold text-[15px] flex items-center gap-2 transition-colors ${tab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Profilim</button>
          <button onClick={() => setTab('issues')} className={`pb-3 font-semibold text-[15px] flex items-center gap-2 transition-colors ${tab === 'issues' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Özel İhtiyaç/Şikayet</button>
        </div>
        <button onClick={loadRequests} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors mb-3">
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {tab === 'requests' && (
        <>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
              <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar flex-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setCat(c)} className={`px-6 py-3 rounded-full text-sm font-bold border whitespace-nowrap ${cat === c ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}>{c}</button>
                ))}
              </div>
              <div className="relative w-full sm:w-64 mb-2 sm:mb-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products
                .filter(p => p.mainCategory === cat)
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(product => {
                const cd = getCooldownStatus(product.id, product.cooldownHours);
                let allowed = (product.maxPerAdult * container.adults) + (product.maxPerChild * container.children) + (product.maxPerBaby * container.babies);
                if (container.adults === 0 && container.children > 0 && allowed === 0 && product.maxPerAdult > 0) allowed = product.maxPerAdult; // fallback logic
                const notSuitable = allowed === 0;

                if (product.stockQuantity !== undefined && product.stockQuantity < allowed) {
                  allowed = product.stockQuantity;
                }

                const hasStock = product.inStock !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);

                return (
                  <div key={product.id} className={`bg-white rounded-3xl border transition-all flex flex-col ${cd.available && !notSuitable && hasStock ? 'border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-xl' : 'border-slate-100 bg-slate-50 opacity-90'}`}>
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img src={product.imageUrl} className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${cd.available && !notSuitable && hasStock ? '' : 'grayscale brightness-75'}`} alt={product.name} referrerPolicy="no-referrer" />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-sm">{product.category}</div>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-black text-slate-900 text-lg mb-1">{product.name}</h3>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-4">Haftalık Talep</p>
                      
                      <div className="mt-auto">
                        {notSuitable ? (
                          <div className="text-red-700 bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                            <span className="text-[11px] font-black uppercase block">Haneye Uygun Değil</span>
                          </div>
                        ) : !hasStock ? (
                          <div className="text-slate-500 bg-slate-100 p-3 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[11px] font-black uppercase block">Geçici Olarak Stok Yok</span>
                          </div>
                        ) : cd.available ? (
                          <button onClick={() => requestProduct(product, allowed)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl">
                            Talep Et ({allowed} {product.unit})
                          </button>
                        ) : (
                          <div className="text-amber-700 bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center flex flex-col items-center gap-1">
                            <div>
                              <span className="text-[11px] font-black uppercase block">Yenilenme Bekleniyor</span>
                              <span className="text-[10px] font-bold opacity-80 block">{cd.remDays ? `${cd.remDays} gün kaldı` : `${cd.remHours} saat kaldı`}</span>
                            </div>
                            {cd.existingReq && cd.existingReq.status === 'pending' && (
                              <button onClick={() => cancelRequest(cd.existingReq!.id)} className="mt-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-bold rounded-lg transition-colors">
                                Talebi İptal Et
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Son Taleplerim</h3>
            {loading ? <p>Yükleniyor...</p> : requests.length === 0 ? <p className="text-slate-400">Henüz talebiniz yok.</p> : (
              <div className="space-y-3">
                {requests.map(req => {
                  const p = products.find(x => x.id === req.productId);
                  return (
                    <div key={req.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{p?.name || req.productId}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: tr })}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-sm font-black text-slate-700">{req.quantity} {p?.unit}</div>
                        <div className={`text-[10px] font-black uppercase ${req.status === 'delivered' || req.status === 'fulfilled' ? 'text-green-500' : req.status === 'rejected' || req.status === 'cancelled' ? 'text-red-500' : 'text-blue-500'}`}>
                          {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Hazırlanıyor' : req.status === 'rejected' ? 'Reddedildi' : req.status === 'cancelled' ? 'İptal Edildi' : 'Karşılandı'}
                        </div>
                        {req.status === 'pending' && (
                          <button onClick={() => cancelRequest(req.id)} className="text-[10px] text-red-500 font-bold hover:underline">İptal Et</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'profile' && (
        <form onSubmit={updateProfile} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Hane Halkı Bilgileri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">Yetişkin Sayısı (Sadece Görevli Değiştirebilir)</span>
              <input type="number" value={adults} readOnly className="p-3 border dark:border-slate-600 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">Çocuk Sayısı (Sadece Görevli Değiştirebilir)</span>
              <input type="number" value={children} readOnly className="p-3 border dark:border-slate-600 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">Bebek Sayısı (Sadece Görevli Değiştirebilir)</span>
              <input type="number" value={babies} readOnly className="p-3 border dark:border-slate-600 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed" />
            </label>
          </div>

          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 pt-4 border-t dark:border-slate-700">İletişim Bilgileri</h3>
          <input type="tel" value={contact} onChange={e => setContact(e.target.value)} placeholder="05XX XXX XX XX" className="p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 w-full" />

          {profileMessage && (
            <div className={`p-4 rounded-xl text-sm font-medium ${profileMessage.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {profileMessage.text}
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl hover:bg-blue-700">Profil Bilgilerimi Kaydet</button>
        </form>
      )}

      {tab === 'issues' && (
        <form onSubmit={submitIssue} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Özel İhtiyaçlar ve Şikayetler</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bu kısımdan özel durumlarınızı ve şikayetlerinizi doğrudan görevlilere iletebilirsiniz.</p>
          <textarea value={issueSpecial} onChange={e => setIssueSpecial(e.target.value)} rows={3} className="p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 w-full" placeholder="Varsa özel ihtiyaçlarınız..." />
          <textarea value={issueComplaint} onChange={e => setIssueComplaint(e.target.value)} rows={3} className="p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 w-full mt-2" placeholder="Şikayet ve Talepleriniz..." />

          {issueMessage && (
            <div className={`p-4 rounded-xl text-sm font-medium ${issueMessage.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {issueMessage.text}
            </div>
          )}

          <button type="submit" className="w-full bg-red-600 text-white font-bold p-4 rounded-xl hover:bg-red-700">Görevliye İlet</button>
        </form>
      )}

      {clothingModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{clothingModal.product.name} Talebi</h3>
            <p className="text-sm text-slate-500 mb-6">Lütfen kıyafet için beden, yaş ve cinsiyet bilgilerini seçiniz.</p>
            <form onSubmit={handleClothingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Beden</label>
                <select value={clothingSize} onChange={e => setClothingSize(e.target.value)} className="w-full p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Standart'].map(size => {
                    const hasSizeStock = clothingModal.product.sizesStock && clothingModal.product.sizesStock[size] !== undefined;
                    const stock = hasSizeStock ? clothingModal.product.sizesStock![size] : 0;
                    const stockText = hasSizeStock ? ` (${stock} adet kaldı)` : '';
                    const disabled = hasSizeStock && stock <= 0;
                    return (
                      <option key={size} value={size} disabled={disabled}>
                        {size}{stockText}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Yaş</label>
                <input type="text" value={clothingAge} onChange={e => setClothingAge(e.target.value)} placeholder="Örn: 12, Yetişkin, 5-6 yaş" required className="w-full p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cinsiyet</label>
                <select value={clothingGender} onChange={e => setClothingGender(e.target.value)} className="w-full p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500">
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Kız Çocuk">Kız Çocuk</option>
                  <option value="Erkek Çocuk">Erkek Çocuk</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setClothingModal(null)} className="px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">İptal</button>
                <button type="submit" className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Talebi Onayla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
