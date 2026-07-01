import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Container, RequestItem, Report, Donation, Issue } from '../types';
import { AdminChat } from './AdminChat';
import { Trash2, BellOff, Search, Filter, RefreshCw } from 'lucide-react';
import { showToast } from '../lib/toast';

class SirenSynth {
  audioCtx: AudioContext | null = null;
  oscillator: OscillatorNode | null = null;
  lfo: OscillatorNode | null = null;
  lfoGain: GainNode | null = null;
  gainNode: GainNode | null = null;
  isPlaying = false;
  currentTime = 0; // Mock to satisfy TS

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  play() {
    if (this.isPlaying) return Promise.resolve();
    this.isPlaying = true;
    this.init();

    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.oscillator = this.audioCtx!.createOscillator();
    this.lfo = this.audioCtx!.createOscillator();
    this.lfoGain = this.audioCtx!.createGain();
    this.gainNode = this.audioCtx!.createGain();

    // Main oscillator (sawtooth for clear, bright siren sound)
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.value = 900; // Center frequency

    // LFO for "viu viu" sweep (Yelp siren)
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 4.5; // Sweeps per second - very fast
    
    // Frequency variation (900 +/- 350 Hz = 550Hz to 1250Hz)
    this.lfoGain.gain.value = 350;
    
    // Connect LFO to main oscillator frequency
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.oscillator.frequency);

    this.gainNode.gain.setValueAtTime(0, this.audioCtx!.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioCtx!.currentTime + 0.1);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx!.destination);
    
    this.lfo.start();
    this.oscillator.start();
    return Promise.resolve();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    
    if (this.gainNode && this.audioCtx && this.oscillator) {
      try {
        this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);
        const osc = this.oscillator;
        const lfo = this.lfo;
        const gain = this.gainNode;
        setTimeout(() => {
          try {
            osc.stop();
            lfo?.stop();
            osc.disconnect();
            lfo?.disconnect();
            gain.disconnect();
          } catch(e) {}
        }, 150);
      } catch(e) {}
    }
  }
}

export function DashboardAdmin() {
  const [tab, setTab] = useState<'requests' | 'reports' | 'donations' | 'containers' | 'chat' | 'issues'>('requests');
  const [containers, setContainers] = useState<Container[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const previousReportsRef = useRef<Report[]>([]);
  const audioRef = useRef<any>(null);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  // Filters for containers
  const [containerSearch, setContainerSearch] = useState('');
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

  const loadData = async () => {
    try {
      const data = await api.get('/admin/dashboard');
      const { containers: c, requests: rq, reports: rp, donations: d, products: prodRes, issues: iss } = data;
      
      setContainers(c);
      
      // enrich requests with container names
      const cMap = new Map();
      c.forEach((x: any) => cMap.set(x.id, x.containerFullId));
      
      const pMap = new Map();
      prodRes.forEach((x: any) => pMap.set(x.id, x.name));

      const enrichedReqs = rq.map((r: any) => ({ ...r, containerName: cMap.get(r.containerId) || 'Bilinmiyor', productName: pMap.get(r.productId) || 'Bilinmeyen Ürün' }));
      
      setRequests(enrichedReqs);
      setReports(rp);
      setDonations(d);
      setIssues(iss);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // 3 seconds fast polling
    
    audioRef.current = new SirenSynth();

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    const currentNew = reports.filter(r => r.status === 'new').length;
    const prevNew = previousReportsRef.current.filter(r => r.status === 'new').length;
    
    if (currentNew > prevNew) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {}); // Might fail due to autoplay policies if user didn't interact
        setSirenPlaying(true);
      }
    } else if (currentNew === 0 && sirenPlaying) {
      stopSiren();
    }
    
    previousReportsRef.current = reports;
  }, [reports]);

  const stopSiren = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSirenPlaying(false);
    }
  };

  const updateRequest = async (id: string, status: string) => {
    try {
      await api.put(`/requests/${id}`, { status });
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const updateDonation = async (id: string, status: string) => {
    try {
      await api.put(`/donations/${id}`, { status });
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const updateReport = async (id: string, status: string) => {
    try {
      await api.put(`/reports/${id}`, { status });
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await api.delete(`/reports/${id}`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await api.delete(`/requests/${id}`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
    }
  };

  const deleteDonation = async (id: string) => {
    try {
      await api.delete(`/donations/${id}`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
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
    try {
      await api.put(`/issues/${id}`, { status });
      loadData();
    } catch (e: any) {
      showToast("Hata oluştu: " + e.message, 'error');
    }
  };

  const deleteIssue = async (id: string) => {
    try {
      await api.delete(`/issues/${id}`);
      loadData();
    } catch (e: any) {
      console.error("Hata oluştu: " + e.message);
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

  return (
    <div className="space-y-6">
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
          <div className="font-bold">⚠️ YENİ ACİL BİLDİRİM(LER) GELDİ!</div>
          <button onClick={() => { stopSiren(); setTab('reports'); }} className="bg-white text-red-600 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100">
            <BellOff className="w-5 h-5" />
            Sesi Sustur & İncele
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
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{new Date(r.createdAt).toLocaleString('tr-TR')}</div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' ? (
                  <>
                    <button onClick={() => updateRequest(r.id, 'approved')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Onayla</button>
                    <button onClick={() => updateRequest(r.id, 'rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Reddet</button>
                  </>
                ) : (
                  <span className={`px-2 py-1 font-bold rounded-md flex items-center gap-2 ${r.status === 'approved' || r.status === 'fulfilled' || r.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : r.status === 'cancelled' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {r.status === 'approved' ? 'KARŞILANDI' : r.status === 'rejected' ? 'REDDEDİLDİ' : r.status === 'fulfilled' ? 'KARŞILANDI' : r.status === 'delivered' ? 'TESLİM EDİLDİ' : r.status === 'cancelled' ? 'İPTAL EDİLDİ' : (r.status || '').toUpperCase()}
                  </span>
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
                    <span className={`px-2 py-1 font-bold rounded-md flex items-center gap-2 ${r.status === 'dispatched' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {r.status === 'dispatched' ? '✅ YÖNLENDİRİLDİ' : r.status === 'rejected' ? '❌ ASILSIZ İHBAR' : (r.status || '').toUpperCase()}
                    </span>
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
                    <span className={`px-2 py-1 font-bold rounded-md flex items-center gap-2 ${d.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : d.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : d.status === 'cancelled' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {d.status === 'approved' ? 'KARŞILANDI' : d.status === 'rejected' ? 'REDDEDİLDİ' : d.status === 'cancelled' ? 'İPTAL EDİLDİ' : (d.status || '').toUpperCase()}
                    </span>
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
                    <span className={`px-3 py-1.5 font-bold rounded-lg ${i.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {i.status === 'resolved' ? 'Karşılandı' : 'Onaylanmadı'}
                    </span>
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
    </div>
  );
}
