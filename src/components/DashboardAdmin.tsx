import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Container, RequestItem, Report, Donation, Issue, Product } from '../types';
import { AdminChat } from './AdminChat';
import { Trash2, BellOff, Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { showToast } from '../lib/toast';

export function DashboardAdmin() {
  const [tab, setTab] = useState<'requests' | 'reports' | 'donations' | 'containers' | 'chat' | 'issues' | 'products'>('requests');
  const [containers, setContainers] = useState<Container[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const previousReportsRef = useRef<Report[]>([]);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef1 = useRef<OscillatorNode | null>(null);
  const oscillatorRef2 = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<any>(null);

  const playSirenSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      if (oscillatorRef1.current) return;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Testere dişi (sawtooth) ve kare (square) dalgalar ile gürültülü ve dikkat çekici bir ton
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.value = 0.2; // Ses seviyesi (çok patlamaması için 0.2)
      
      osc1.start();
      osc2.start();
      
      oscillatorRef1.current = osc1;
      oscillatorRef2.current = osc2;
      gainNodeRef.current = gain;
      
      // Klasik inip çıkan acil durum sireni (wailing siren)
      const sweep = () => {
        if (!oscillatorRef1.current || !oscillatorRef2.current || !ctx) return;
        const t = ctx.currentTime;
        
        // Sesin yükselişi
        osc1.frequency.setValueAtTime(600, t);
        osc1.frequency.linearRampToValueAtTime(1200, t + 1.2);
        osc2.frequency.setValueAtTime(590, t); // Sesi daha dolgun yapmak için hafif farklı frekans
        osc2.frequency.linearRampToValueAtTime(1180, t + 1.2);
        
        // Sesin alçalışı
        osc1.frequency.linearRampToValueAtTime(600, t + 2.4);
        osc2.frequency.linearRampToValueAtTime(590, t + 2.4);
      };

      sweep();
      intervalRef.current = setInterval(sweep, 2400); // 2.4 saniyede bir döngü
    } catch (e) {
      console.error('Audio setup failed:', e);
    }
  };

  const stopSirenSound = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (oscillatorRef1.current) {
      try { oscillatorRef1.current.stop(); } catch(e) {}
      oscillatorRef1.current.disconnect();
      oscillatorRef1.current = null;
    }
    if (oscillatorRef2.current) {
      try { oscillatorRef2.current.stop(); } catch(e) {}
      oscillatorRef2.current.disconnect();
      oscillatorRef2.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  };

  useEffect(() => {
    if (sirenPlaying) {
      playSirenSound();
    } else {
      stopSirenSound();
    }
    return () => stopSirenSound();
  }, [sirenPlaying]);





  // Filters for containers
  const [containerSearch, setContainerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [criticalThresholds, setCriticalThresholds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('criticalStockThresholds');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [regionFilter, setRegionFilter] = useState('all');
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  const [emergencyFilter, setEmergencyFilter] = useState('all');

  // Add container forms
  const [cId, setCId] = useState('');
  const [pwd, setPwd] = useState('1234');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [babies, setBabies] = useState('0');
  const [updateMessage, setUpdateMessage] = useState<{id: string, text: string, type: 'success' | 'error'} | null>(null);
  const [revertPrompt, setRevertPrompt] = useState<{ id: string, type: 'request' | 'report' | 'donation' | 'issue', password: string } | null>(null);
  const [pendingStocks, setPendingStocks] = useState<Record<string, string>>({});
  const [pendingThresholds, setPendingThresholds] = useState<Record<string, string>>({});
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const data = await api.get('/admin/dashboard');
      const { containers: c, requests: rq, reports: rp, donations: d, products: prodRes = [], issues: iss } = data;
      
      setContainers(c);
      
      // enrich requests with container names
      const cMap = new Map();
      c.forEach((x: any) => cMap.set(x.id, x.containerFullId));
      
      const pMap = new Map();
      prodRes.forEach((x: any) => pMap.set(x.id, x.name));

      const enrichedReqs = rq.map((r: any) => ({ ...r, containerName: cMap.get(r.containerId) || 'Bilinmiyor', productName: pMap.get(r.productId) || 'Bilinmeyen Ürün' }));
      
      const preserveOptimistic = (serverArray: any[], prevArray: any[]) => {
        const result = [];
        for (const serverItem of serverArray) {
          if (pendingIdsRef.current.has(serverItem.id)) {
            const existing = prevArray.find(p => p.id === serverItem.id);
            if (existing) result.push(existing);
          } else {
            result.push(serverItem);
          }
        }
        return result;
      };
      
      setRequests(prev => preserveOptimistic(enrichedReqs, prev));
      setReports(prev => preserveOptimistic(rp, prev));
      setDonations(prev => preserveOptimistic(d, prev));
      setIssues(prev => preserveOptimistic(iss || [], prev));
      setProducts(prodRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // 3 seconds fast polling
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const newReports = reports.filter(r => r.status === 'new');
    const currentNew = newReports.length;
    const prevNew = previousReportsRef.current.filter(r => r.status === 'new').length;
    
    if (currentNew > prevNew) {
      const mutedTimestamp = parseInt(localStorage.getItem('mutedSirenTimestamp') || '0', 10);
      const latestTime = currentNew > 0 ? Math.max(...newReports.map(r => new Date(r.createdAt).getTime())) : 0;
      
      if (latestTime > mutedTimestamp) {
        setSirenPlaying(true);
      }
    } else if (currentNew === 0 && sirenPlaying) {
      stopSiren();
    }
    
    previousReportsRef.current = reports;
  }, [reports]);

  const stopSiren = () => {
    setSirenPlaying(false);
    
    const newReports = reports.filter(r => r.status === 'new');
    if (newReports.length > 0) {
      const latestTime = Math.max(...newReports.map(r => new Date(r.createdAt).getTime()));
      localStorage.setItem('mutedSirenTimestamp', latestTime.toString());
    }
  };

  const updateRequest = async (id: string, status: string) => {
    pendingIdsRef.current.add(id);
    const original = [...requests];
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await api.put(`/requests/${id}`, { status });
    } catch (e: any) {
      setRequests(original);
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const updateDonation = async (id: string, status: string) => {
    pendingIdsRef.current.add(id);
    const original = [...donations];
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    try {
      await api.put(`/donations/${id}`, { status });
    } catch (e: any) {
      setDonations(original);
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const updateReport = async (id: string, status: string) => {
    pendingIdsRef.current.add(id);
    const original = [...reports];
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await api.put(`/reports/${id}`, { status });
    } catch (e: any) {
      setReports(original);
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteReport = async (id: string) => {
    pendingIdsRef.current.add(id);
    const original = [...reports];
    setReports(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/reports/${id}`);
    } catch (e: any) {
      setReports(original);
      console.error("Hata oluştu: " + e.message);
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteRequest = async (id: string) => {
    pendingIdsRef.current.add(id);
    const original = [...requests];
    setRequests(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/requests/${id}`);
    } catch (e: any) {
      setRequests(original);
      console.error("Hata oluştu: " + e.message);
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteDonation = async (id: string) => {
    pendingIdsRef.current.add(id);
    const original = [...donations];
    setDonations(prev => prev.filter(d => d.id !== id));
    try {
      await api.delete(`/donations/${id}`);
    } catch (e: any) {
      setDonations(original);
      console.error("Hata oluştu: " + e.message);
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteAllRequests = async () => {
    try {
      await api.delete(`/requests`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const deleteAllReports = async () => {
    try {
      await api.delete(`/reports`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const deleteAllDonations = async () => {
    try {
      await api.delete(`/donations`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const updateIssue = async (id: string, status: string) => {
    pendingIdsRef.current.add(id);
    const original = [...issues];
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    try {
      await api.put(`/issues/${id}`, { status });
    } catch (e: any) {
      setIssues(original);
      showToast("Hata oluştu: " + e.message, 'error');
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteIssue = async (id: string) => {
    pendingIdsRef.current.add(id);
    const original = [...issues];
    setIssues(prev => prev.filter(i => i.id !== id));
    try {
      await api.delete(`/issues/${id}`);
    } catch (e: any) {
      setIssues(original);
      console.error("Hata oluştu: " + e.message);
    } finally {
      setTimeout(() => pendingIdsRef.current.delete(id), 4000);
    }
  };

  const deleteAllIssues = async () => {
    try {
      await api.delete(`/issues`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const handleRevertStatus = (id: string, type: 'request' | 'report' | 'donation' | 'issue') => {
    setRevertPrompt({ id, type, password: '' });
  };

  const submitRevertStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revertPrompt) return;
    
    if (revertPrompt.password !== "adminukis2026") {
      showToast("Şifre hatalı. İşlem iptal edildi.", "error");
      setRevertPrompt(null);
      return;
    }
    
    if (revertPrompt.type === 'request') updateRequest(revertPrompt.id, 'pending');
    else if (revertPrompt.type === 'report') updateReport(revertPrompt.id, 'new');
    else if (revertPrompt.type === 'donation') updateDonation(revertPrompt.id, 'pending');
    else if (revertPrompt.type === 'issue') updateIssue(revertPrompt.id, 'pending');
    
    showToast("İşlem geri alındı, yeniden değerlendirebilirsiniz.", "success");
    setRevertPrompt(null);
  };

  const addContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/containers', { 
        containerFullId: cId, 
        accessCode: pwd, 
        adults: parseInt(adults, 10) || 0, 
        children: parseInt(children, 10) || 0, 
        babies: parseInt(babies, 10) || 0 
      });
      setCId('');
      setPwd('');
      setAdults('2');
      setChildren('0');
      setBabies('0');
      showToast('Konteyner eklendi.', 'success');
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const updateContainer = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const t = e.target as any;
    try {
      await api.put(`/containers/${id}`, {
        containerFullId: t.containerFullId.value,
        accessCode: t.accessCode.value,
        adults: parseInt(t.adults.value, 10) || 0, 
        children: parseInt(t.children.value, 10) || 0, 
        babies: parseInt(t.babies.value, 10) || 0 
      });
      setUpdateMessage({ id, text: 'Bilgiler güncellendi', type: 'success' });
      setTimeout(() => setUpdateMessage(null), 3000);
      loadData();
    } catch (e: any) {
      setUpdateMessage({ id, text: 'Hata oluştu', type: 'error' });
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  const deleteContainer = async (id: string) => {
    try {
      await api.delete(`/containers/${id}`);
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
      console.error(e);
    }
  };

  const toggleProductStock = async (id: string, currentStock: boolean) => {
    try {
      await api.put(`/products/${id}/stock`, { inStock: !currentStock });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !currentStock } : p));
      showToast('Stok durumu güncellendi.', 'success');
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const updateProductStockQuantity = async (id: string, quantity: number, sizesStock?: Record<string, number>) => {
    try {
      const payload: any = { stockQuantity: quantity };
      if (sizesStock) payload.sizesStock = sizesStock;
      await api.put(`/products/${id}/stock`, payload);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stockQuantity: quantity, sizesStock: sizesStock ?? p.sizesStock } : p));
      showToast('Stok güncellenmiştir.', 'success');
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const uniqueRegions = Array.from(new Set(containers.map(c => {
    const match = (c.containerFullId || '').match(/^[A-Za-z]+/);
    return match ? match[0].toUpperCase() : '';
  }))).filter(Boolean);

  const filteredContainers = containers.filter(c => {
    const totalOccupancy = (c.adults || 0) + (c.children || 0) + (c.babies || 0);
    const hasEmergency = !!c.specialNeeds || !!c.notes;

    if (regionFilter !== 'all') {
      if (!(c.containerFullId || '').toUpperCase().startsWith(regionFilter)) return false;
    }

    if (occupancyFilter !== 'all') {
      if (occupancyFilter === 'empty' && totalOccupancy !== 0) return false;
      if (occupancyFilter === 'low' && (totalOccupancy === 0 || totalOccupancy > 2)) return false;
      if (occupancyFilter === 'medium' && (totalOccupancy < 3 || totalOccupancy > 4)) return false;
      if (occupancyFilter === 'full' && totalOccupancy < 5) return false;
    }

    if (emergencyFilter !== 'all') {
      if (emergencyFilter === 'has_needs' && !hasEmergency) return false;
      if (emergencyFilter === 'no_needs' && hasEmergency) return false;
    }

    if (containerSearch) {
      const s = containerSearch.toLowerCase();
      const textMatch = 
        (c.containerFullId || '').toLowerCase().includes(s) ||
        (c.specialNeeds || '').toLowerCase().includes(s) ||
        (c.notes || '').toLowerCase().includes(s) ||
        (c.contactNumber || '').toLowerCase().includes(s);
      if (!textMatch) return false;
    }

    return true;
  });

  const criticalStocks = products.filter(p => (p.stockQuantity ?? 100) <= (criticalThresholds[p.id] ?? 50));

  return (
    <div className="space-y-6">
      {criticalStocks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-300 text-[14px]">Kritik Stok Uyarısı</h4>
            <p className="text-[13px] text-red-700 dark:text-red-400 mt-1">Aşağıdaki ürünlerin stoku belirlenen kritik seviyenin altına düşmüştür veya bu değere eşittir:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {criticalStocks.map(p => (
                <button key={p.id} onClick={() => setTab('products')} className="bg-white/60 dark:bg-slate-800/60 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                  {p.name} (Stok: {p.stockQuantity ?? 0} / Sınır: {criticalThresholds[p.id] ?? 50})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-scrollbar items-center justify-between">
        <div className="flex gap-4">
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`} onClick={() => setTab('requests')}>
            Afetzede Talepleri ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'reports' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500'}`} onClick={() => setTab('reports')}>
            🚨 Acil Bildirimler ({reports.filter(r => r.status === 'new').length})
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'donations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`} onClick={() => setTab('donations')}>
            Bağış İşlemleri ({donations.filter(d => d.status === 'pending').length})
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'containers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`} onClick={() => setTab('containers')}>
            Konteyner Yönetimi
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'issues' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`} onClick={() => setTab('issues')}>
            Özel İhtiyaçlar ve Şikayetler ({issues.filter(i => i.status === 'pending').length})
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'products' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`} onClick={() => setTab('products')}>
            Ürün & Stok
          </button>
          <button className={`pb-3 font-semibold text-[13px] whitespace-nowrap ${tab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`} onClick={() => setTab('chat')}>
            Canlı Destek
          </button>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors mb-3">
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {sirenPlaying && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex justify-between items-center animate-pulse shadow-lg mt-4 mb-4">
          <div className="font-bold">⚠️ YENİ ACİL BİLDİRİM!</div>
          <button onClick={() => { stopSiren(); setTab('reports'); }} className="bg-white text-red-600 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100">
            <BellOff className="w-5 h-5" />
            İkazı Kapat & İncele
          </button>
        </div>
      )}

      {tab === 'chat' && (
        <AdminChat />
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          {requests.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={deleteAllRequests} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold text-[13px] transition-colors">
                <Trash2 className="w-4 h-4" /> Tüm Talepleri Sil
              </button>
            </div>
          )}
          {requests.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 border text-[13px] border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">{r.containerName} - {r.productName} ({r.quantity} adet)</div>
                {(r.size || r.age) && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                    {r.size && <span>Beden: {r.size} </span>}
                    {r.age && <span>Yaş: {r.age} </span>}
                  </div>
                )}
                {r.notes && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.notes}</div>
                )}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{new Date(r.createdAt).toLocaleString('tr-TR')}</div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' ? (
                  <>
                    <button onClick={() => updateRequest(r.id, 'approved')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Onayla</button>
                    <button onClick={() => updateRequest(r.id, 'rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Reddet</button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 font-bold rounded-md flex items-center gap-2 ${r.status === 'approved' || r.status === 'fulfilled' || r.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : r.status === 'cancelled' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {r.status === 'approved' ? 'KARŞILANDI' : r.status === 'rejected' ? 'REDDEDİLDİ' : r.status === 'fulfilled' ? 'KARŞILANDI' : r.status === 'delivered' ? 'TESLİM EDİLDİ' : r.status === 'cancelled' ? 'İPTAL EDİLDİ' : (r.status || '').toUpperCase()}
                    </span>
                    <button onClick={() => handleRevertStatus(r.id, 'request')} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-lg transition" title="Durumu Düzenle">Düzenle</button>
                  </div>
                )}
                <button onClick={() => deleteRequest(r.id)} className="px-2 text-red-400 hover:text-red-600 transition" title="Sil">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-slate-500 text-center py-8">Hiç talep yok.</p>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={deleteAllReports} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold text-[13px] transition-colors">
                <Trash2 className="w-4 h-4" /> Tüm Bildirimleri Sil
              </button>
            </div>
          )}
          {reports.map(r => (
            <div key={r.id} className="bg-red-50 dark:bg-red-900/20 border text-[13px] border-red-200 dark:border-red-900/50 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-400 text-[14px]">Yeni Acil Bildirim <span className="bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 px-2 py-0.5 rounded ml-2">{r.priority}</span></h3>
                  <div className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-1">{new Date(r.createdAt).toLocaleString('tr-TR')}</div>
                </div>
                <div className="flex gap-2">
                  {r.status === 'new' ? (
                    <>
                      <button onClick={() => updateReport(r.id, 'dispatched')} className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Onayla & Yönlendir</button>
                      <button onClick={() => updateReport(r.id, 'rejected')} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Asılsız İhbar</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 font-bold rounded-md flex items-center gap-2 ${r.status === 'dispatched' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {r.status === 'dispatched' ? '✅ YÖNLENDİRİLDİ' : r.status === 'rejected' ? '❌ ASILSIZ İHBAR' : (r.status || '').toUpperCase()}
                      </span>
                      <button onClick={() => handleRevertStatus(r.id, 'report')} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-lg transition" title="Durumu Düzenle">Düzenle</button>
                    </div>
                  )}
                  <button onClick={() => deleteReport(r.id)} className="px-2 text-red-400 hover:text-red-600 transition" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-red-100 dark:border-red-900/50 text-slate-700 dark:text-slate-300">
                <strong>Otomatik Ses Çözümlemesi:</strong> "{r.description}"
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'donations' && (
        <div className="space-y-4">
          {donations.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={deleteAllDonations} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold text-[13px] transition-colors">
                <Trash2 className="w-4 h-4" /> Tüm Bağışları Sil
              </button>
            </div>
          )}
          {donations.map(d => (
            <div key={d.id} className="bg-white dark:bg-slate-800 border text-[13px] border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{d.donorName} <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded ml-2">{d.type}</span></h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{new Date(d.createdAt).toLocaleString('tr-TR')}</div>
                  {(d.donorPhone || d.donorEmail) && (
                    <div className="flex flex-col gap-0.5 mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {d.donorPhone && <div>📞 {d.donorPhone}</div>}
                      {d.donorEmail && <div>✉️ {d.donorEmail}</div>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.status === 'pending' ? (
                    <>
                      <button onClick={() => updateDonation(d.id, 'approved')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Onayla</button>
                      <button onClick={() => updateDonation(d.id, 'rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Reddet</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 font-bold rounded-md flex items-center gap-2 ${d.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : d.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : d.status === 'cancelled' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {d.status === 'approved' ? 'KARŞILANDI' : d.status === 'rejected' ? 'REDDEDİLDİ' : d.status === 'cancelled' ? 'İPTAL EDİLDİ' : (d.status || '').toUpperCase()}
                      </span>
                      <button onClick={() => handleRevertStatus(d.id, 'donation')} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-lg transition" title="Durumu Düzenle">Düzenle</button>
                    </div>
                  )}
                  <button onClick={() => deleteDonation(d.id)} className="px-2 text-red-400 hover:text-red-600 transition" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {d.description && <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg text-slate-700 dark:text-slate-300">{d.description}</div>}
              {d.items && d.items.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Karşılanacak Ürünler</h4>
                  <ul className="flex flex-col gap-1.5">
                    {d.items.map((i, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shadow-sm">{i.quantity} ADET</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{i.productName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'issues' && (
        <div className="space-y-4">
          {issues.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={deleteAllIssues} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold text-[13px] transition-colors">
                <Trash2 className="w-4 h-4" /> Tümünü Sil
              </button>
            </div>
          )}
          {issues.map(i => {
            const cont = containers.find(c => c.id === i.containerId);
            return (
              <div key={i.id} className="bg-white dark:bg-slate-800 border text-[13px] border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/80 dark:text-orange-300 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide">
                      {i.type === 'special_need' ? 'Özel İhtiyaç' : 'Şikayet'}
                    </span>
                    {cont ? cont.containerFullId : 'Bilinmeyen Konteyner'}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{i.description}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{new Date(i.createdAt).toLocaleString('tr-TR')}</div>
                </div>
                <div className="flex gap-2">
                  {i.status === 'pending' ? (
                    <>
                      <button onClick={() => updateIssue(i.id, 'resolved')} className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-lg hover:bg-emerald-200 transition">Karşılandı</button>
                      <button onClick={() => updateIssue(i.id, 'rejected')} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition">Onaylanmadı</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-2 font-bold rounded-lg ${i.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {i.status === 'resolved' ? 'Karşılandı' : 'Onaylanmadı'}
                      </span>
                      <button onClick={() => handleRevertStatus(i.id, 'issue')} className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-lg transition" title="Durumu Düzenle">Düzenle</button>
                    </div>
                  )}
                  <button onClick={() => deleteIssue(i.id)} className="px-2 text-red-400 hover:text-red-600 transition" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {issues.length === 0 && (
            <div className="text-center p-8 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
              Kayıtlı özel ihtiyaç veya şikayet bulunmuyor.
            </div>
          )}
        </div>
      )}

      {tab === 'containers' && (
        <div className="space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-indigo-900 dark:text-indigo-300 mb-3">Yeni Konteyner / Blok Ekle</h3>
            <form onSubmit={addContainer} className="flex flex-col sm:flex-row gap-3 items-end">
              <label className="flex-1 flex flex-col"><span className="text-[11px] font-bold mb-1 dark:text-slate-300">Konteyner No</span><input required value={cId} onChange={e=>setCId(e.target.value)} className="p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white" placeholder="A-101" /></label>
              <label className="w-24 flex flex-col"><span className="text-[11px] font-bold mb-1 dark:text-slate-300">Şifre</span><input required value={pwd} onChange={e=>setPwd(e.target.value)} className="p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white" /></label>
              <label className="w-20 flex flex-col"><span className="text-[11px] font-bold mb-1 dark:text-slate-300">Yetişkin</span><input required type="number" value={adults} onChange={e=>setAdults(e.target.value)} className="p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white" /></label>
              <label className="w-20 flex flex-col"><span className="text-[11px] font-bold mb-1 dark:text-slate-300">Çocuk</span><input required type="number" value={children} onChange={e=>setChildren(e.target.value)} className="p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white" /></label>
              <label className="w-20 flex flex-col"><span className="text-[11px] font-bold mb-1 dark:text-slate-300">Bebek</span><input required type="number" value={babies} onChange={e=>setBabies(e.target.value)} className="p-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white" /></label>
              <button type="submit" className="bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg">Oluştur</button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={containerSearch}
                  onChange={e => setContainerSearch(e.target.value)}
                  placeholder="Konteyner no, özel ihtiyaç, not veya tel ara..." 
                  className="w-full pl-10 pr-4 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <Filter className="w-5 h-5 text-slate-400 hidden sm:block" />
                <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white text-sm flex-1 sm:w-auto">
                  <option value="all">Tüm Bölgeler</option>
                  {uniqueRegions.map(r => <option key={r} value={r}>{r} Bölgesi</option>)}
                </select>
                <select value={occupancyFilter} onChange={e => setOccupancyFilter(e.target.value)} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white text-sm flex-1 sm:w-auto">
                  <option value="all">Tüm Doluluk</option>
                  <option value="empty">Boş (0)</option>
                  <option value="low">Düşük (1-2)</option>
                  <option value="medium">Orta (3-4)</option>
                  <option value="full">Yüksek (5+)</option>
                </select>
                <select value={emergencyFilter} onChange={e => setEmergencyFilter(e.target.value)} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white text-sm flex-1 sm:w-auto">
                  <option value="all">Tüm Durumlar</option>
                  <option value="has_needs">Özel İhtiyaç / Not Var</option>
                  <option value="no_needs">Özel İhtiyaç Yok</option>
                </select>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 font-medium">
              Toplam {filteredContainers.length} konteyner listeleniyor
            </div>
          </div>

          <div className="space-y-4">
            {filteredContainers.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 border text-[13px] border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm relative pr-12">
                <button type="button" onClick={() => deleteContainer(c.id)} className="absolute top-4 right-4 text-red-400 font-bold hover:text-red-600 p-2">✕</button>
                <div>
                  <h3 className="font-bold text-[#1e3a6e] dark:text-blue-300 text-lg">🏠 {c.containerFullId}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-2">Giriş Kodu: {c.accessCode}</p>
                  
                  {(c.contactNumber || c.specialNeeds || c.notes) && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg mt-2 text-xs space-y-1 w-full max-w-sm">
                      {c.contactNumber && <p><span className="font-bold text-slate-600 dark:text-slate-300">📞 Tel:</span> {c.contactNumber}</p>}
                      {c.specialNeeds && <p><span className="font-bold text-slate-600 dark:text-slate-300">⚠️ Özel İhtiyaçlar:</span> {c.specialNeeds}</p>}
                      {c.notes && <p><span className="font-bold text-slate-600 dark:text-slate-300">📝 Şikayet/Notlar:</span> {c.notes}</p>}
                    </div>
                  )}
                </div>
                <form onSubmit={e => updateContainer(e, c.id)} className="flex flex-wrap gap-2 items-end mt-2">
                  <label className="w-24 flex flex-col"><span className="text-[10px] font-bold mb-1 dark:text-slate-300">Konteyner No</span><input required type="text" name="containerFullId" defaultValue={c.containerFullId} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white" /></label>
                  <label className="w-20 flex flex-col"><span className="text-[10px] font-bold mb-1 dark:text-slate-300">Giriş Kodu</span><input required type="text" name="accessCode" defaultValue={c.accessCode} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white" /></label>
                  <label className="w-16 flex flex-col"><span className="text-[10px] font-bold mb-1 dark:text-slate-300">Yetişkin</span><input required type="number" name="adults" defaultValue={c.adults} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white" /></label>
                  <label className="w-16 flex flex-col"><span className="text-[10px] font-bold mb-1 dark:text-slate-300">Çocuk</span><input required type="number" name="children" defaultValue={c.children} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white" /></label>
                  <label className="w-16 flex flex-col"><span className="text-[10px] font-bold mb-1 dark:text-slate-300">Bebek</span><input required type="number" name="babies" defaultValue={c.babies} className="p-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white" /></label>
                  <button type="submit" className="bg-slate-800 dark:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg">Güncelle</button>
                  {updateMessage && updateMessage.id === c.id && (
                    <span className={`text-xs font-bold px-2 py-2 rounded-lg flex items-center ${updateMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {updateMessage.text}
                    </span>
                  )}
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Ürün ve Stok Yönetimi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ürünlerin afetzedeler için sipariş edilebilir durumunu yönetin.</p>
            
            <div className="relative max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Ürün adı veya kategori ile ara..." 
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()))
              .map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-800 border text-[13px] border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                      {p.name}
                      {(p.stockQuantity ?? 100) <= (criticalThresholds[p.id] ?? 50) && (
                        <span className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Kritik
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{p.mainCategory} &gt; {p.category}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 px-2 py-1 rounded">
                      <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                      <span className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase">Kritik Sınır:</span>
                      <input 
                        type="number"
                        min="0"
                        className="w-12 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/50 rounded px-1 py-0.5 text-[11px] text-center font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500"
                        value={pendingThresholds[p.id] !== undefined ? pendingThresholds[p.id] : (criticalThresholds[p.id] ?? 50).toString()}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1) {
                             val = val.replace(/^0+(?=\d)/, '');
                          }
                          setPendingThresholds(prev => ({...prev, [p.id]: val}));
                        }}
                      />
                      <button 
                        onClick={() => {
                          const val = parseInt(pendingThresholds[p.id]);
                          if (!isNaN(val)) {
                            setCriticalThresholds(prev => {
                              const updated = { ...prev, [p.id]: val };
                              localStorage.setItem('criticalStockThresholds', JSON.stringify(updated));
                              return updated;
                            });
                          }
                          const newThresholds = { ...pendingThresholds };
                          delete newThresholds[p.id];
                          setPendingThresholds(newThresholds);
                        }}
                        className={`ml-1 px-1.5 py-0.5 bg-red-600 text-white text-[9px] uppercase font-bold rounded hover:bg-red-700 transition-colors ${
                          (pendingThresholds[p.id] !== undefined && pendingThresholds[p.id] !== (criticalThresholds[p.id] ?? 50).toString()) ? 'inline-block' : 'hidden'
                        }`}
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className={`px-2 py-1 text-xs font-bold rounded-md ${p.inStock ?? true ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {p.inStock ?? true ? '✅ Stokta Var' : '❌ Stok Kapalı'}
                    </div>
                    <button 
                      onClick={() => toggleProductStock(p.id, p.inStock ?? true)}
                      className="px-3 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      {p.inStock ?? true ? 'Stoğu Kapat' : 'Stoğa Aç'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-grow bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-slate-600 mt-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stok:</span>
                    <input 
                      type="number" 
                      min="0"
                      className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-500 focus:outline-none focus:border-blue-500 text-center font-bold text-slate-700 dark:text-slate-200"
                      value={pendingStocks[p.id] !== undefined ? pendingStocks[p.id] : (p.stockQuantity ?? 100).toString()}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1) {
                           val = val.replace(/^0+(?=\d)/, '');
                        }
                        setPendingStocks(prev => ({...prev, [p.id]: val}));
                      }}
                    />
                    <button 
                      onClick={() => {
                        const val = parseInt(pendingStocks[p.id]);
                        if (!isNaN(val)) {
                          updateProductStockQuantity(p.id, val);
                        } else {
                          updateProductStockQuantity(p.id, 0);
                        }
                        const newStocks = { ...pendingStocks };
                        delete newStocks[p.id];
                        setPendingStocks(newStocks);
                      }}
                      className={`ml-auto px-2 py-1 bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold rounded hover:bg-blue-700 transition-colors ${
                        (pendingStocks[p.id] !== undefined && pendingStocks[p.id] !== (p.stockQuantity ?? 100).toString()) ? 'visible' : 'invisible'
                      }`}
                    >
                      Değişikliği Onayla
                    </button>
                  </div>
                  {p.mainCategory === 'Giyim' && (
                    <div className="flex flex-col gap-2 mt-1 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Beden Stokları:</div>
                      <div className="grid grid-cols-3 gap-2">
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                          const sizeKey = `${p.id}_size_${size}`;
                          const currentSizeStock = p.sizesStock?.[size] ?? 0;
                          const displayValue = pendingStocks[sizeKey] !== undefined ? pendingStocks[sizeKey] : currentSizeStock.toString();
                          return (
                            <div key={size} className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="font-bold text-slate-600 dark:text-slate-300 w-6">{size}:</span>
                              <input 
                                type="number"
                                min="0"
                                className="w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-1 text-center font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                                value={displayValue}
                                onChange={e => {
                                  let val = e.target.value;
                                  if (val.length > 1) val = val.replace(/^0+(?=\d)/, '');
                                  setPendingStocks(prev => ({...prev, [sizeKey]: val}));
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => {
                          const newSizesStock = { ...(p.sizesStock || {}) };
                          ['XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach(size => {
                             const sizeKey = `${p.id}_size_${size}`;
                             if (pendingStocks[sizeKey] !== undefined) {
                               const val = parseInt(pendingStocks[sizeKey]);
                               newSizesStock[size] = isNaN(val) ? 0 : val;
                             }
                          });
                          const totalStock = Object.values(newSizesStock).reduce((a, b) => a + (b as number), 0);
                          updateProductStockQuantity(p.id, totalStock, newSizesStock);
                          
                          const newStocks = { ...pendingStocks };
                          ['XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach(size => delete newStocks[`${p.id}_size_${size}`]);
                          delete newStocks[p.id];
                          setPendingStocks(newStocks);
                        }}
                        className={`mt-2 w-full px-2 py-1 bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold rounded hover:bg-blue-700 transition-colors ${
                          ['XS', 'S', 'M', 'L', 'XL', 'XXL'].some(s => pendingStocks[`${p.id}_size_${s}`] !== undefined && pendingStocks[`${p.id}_size_${s}`] !== (p.sizesStock?.[s] ?? 0).toString()) ? 'block' : 'hidden'
                        }`}
                      >
                        Bedenleri ve Toplamı Güncelle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {revertPrompt && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Görevli Doğrulaması</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">İşlemi geri almak için görevli şifresini giriniz:</p>
            <form onSubmit={submitRevertStatus}>
              <input
                type="password"
                required
                autoFocus
                className="w-full p-3 border dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 mb-4"
                value={revertPrompt.password}
                onChange={e => setRevertPrompt({ ...revertPrompt, password: e.target.value })}
                placeholder="Şifre"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setRevertPrompt(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Onayla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
