import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { UserSession, RequestItem, Report, Product, Container, Donation } from '../types';
import { api } from '../api';
import { Users, Package, AlertTriangle, Heart, Activity, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export function DashboardBelediye({ user }: { user: UserSession }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/requests'),
      api.get('/reports'),
      api.get('/products'),
      api.get('/containers'),
      api.get('/donations')
    ]).then(([reqRes, repRes, prodRes, contRes, donRes]) => {
      setRequests(reqRes);
      setReports(repRes);
      setProducts(prodRes);
      setContainers(contRes);
      setDonations(donRes);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Data for KPI Cards
  const totalContainers = containers.length;
  const totalCitizens = containers.reduce((acc, c) => acc + (c.adults || 0) + (c.children || 0) + (c.babies || 0), 0);
  
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const deliveredRequests = requests.filter(r => r.status === 'delivered' || r.status === 'fulfilled').length;
  const totalRequests = requests.length;

  const urgentReports = reports.filter(r => r.priority?.toLowerCase() === 'yüksek' || r.priority?.toLowerCase() === 'kritik' || r.type?.toLowerCase() === 'sağlık' || r.type?.toLowerCase() === 'güvenlik' || r.priority?.toLowerCase() === 'acil').length;
  
  const activeDonations = donations.filter(d => d.status === 'approved' || d.status === 'pending').length;

  // Calculate Data for Pie Chart (Categories)
  const calculateCategoryData = () => {
    let erzakCount = 0;
    let guvenlikCount = 0;
    let saglikCount = 0;
    let digerCount = 0;

    requests.forEach(req => {
      const prod = products.find(p => p.id === req.productId);
      if (prod && prod.mainCategory === 'Gıda') {
        erzakCount++;
      } else {
        digerCount++;
      }
    });

    reports.forEach(rep => {
      const type = rep.priority?.toLowerCase() || '';
      const desc = rep.description?.toLowerCase() || '';
      
      if (type.includes('sağlık') || desc.includes('hasta') || desc.includes('doktor') || desc.includes('ambulans') || desc.includes('bebek')) {
        saglikCount++;
      } else if (type.includes('kritik') || type.includes('yüksek') || desc.includes('yangın') || desc.includes('alev') || desc.includes('su') || desc.includes('güvenlik') || type.includes('acil')) {
        guvenlikCount++;
      } else {
        digerCount++;
      }
    });

    return [
      { name: 'Erzak/Gıda', value: erzakCount, color: '#8b5cf6' }, // Purple
      { name: 'Güvenlik/Acil', value: guvenlikCount, color: '#ef4444' }, // Red
      { name: 'Sağlık', value: saglikCount, color: '#10b981' }, // Green
      { name: 'Diğer', value: digerCount, color: '#64748b' } // Slate
    ].filter(d => d.value > 0);
  };

  const categoryData = calculateCategoryData();

  // Request Status Data for Bar Chart
  const statusData = [
    { name: 'Bekleyen', value: requests.filter(r => r.status === 'pending').length },
    { name: 'Onaylanan', value: requests.filter(r => r.status === 'approved').length },
    { name: 'Tamamlanan', value: requests.filter(r => r.status === 'delivered' || r.status === 'fulfilled').length },
    { name: 'Reddedilen', value: requests.filter(r => r.status === 'rejected').length }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Belediye Başkanı Yönetim Portalı</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerçek zamanlı bölge, afetzede ve talep verileri.</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold rounded-xl text-sm transition-colors shadow-sm self-start md:self-auto">
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kayıtlı Nüfus</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalCitizens} <span className="text-sm font-normal text-slate-500">Kişi</span></h3>
            <p className="text-xs text-slate-400 mt-1">{totalContainers} Aktif Konteyner</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bekleyen Talepler</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{pendingRequests} <span className="text-sm font-normal text-slate-500">/ {totalRequests} Toplam</span></h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Acil/Kritik İhbarlar</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{urgentReports} <span className="text-sm font-normal text-slate-500">/ {reports.length}</span></h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aktif Bağışlar</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{activeDonations}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Talep ve İhbar Dağılımı</h3>
          </div>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body, #fff)' }}
                    itemStyle={{ color: '#333', fontWeight: 500 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">Veri bulunmuyor</div>
            )}
          </div>
        </div>

        {/* Request Status Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Erzak Talep Durumları</h3>
          </div>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 600, color: '#333' }}
                />
                <Bar dataKey="value" name="Talep Sayısı" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Important Activity Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Son İhbarlar</h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {reports.slice(0, 10).map((r, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    r.priority === 'acil' || r.priority === 'yüksek' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {r.priority?.toUpperCase() || 'NORMAL'}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{r.description}</p>
                <div className="mt-2 text-xs text-slate-500 font-medium">Kaynak: {r.source || 'Bilinmiyor'}</div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-center py-8 text-slate-500">Kayıtlı ihbar bulunmuyor.</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6 flex-shrink-0">
            <Heart className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Son Bağışlar</h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {donations.slice(0, 10).map((d, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-emerald-200 transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{d.donorName}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{d.description || (d.items && d.items.length > 0 ? `${d.items.length} çeşit malzeme` : 'Açıklama yok')}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    d.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    d.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {d.status === 'approved' ? 'Onaylandı' : d.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(d.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            ))}
            {donations.length === 0 && (
              <div className="text-center py-8 text-slate-500">Kayıtlı bağış bulunmuyor.</div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}</style>
    </div>
  );
}
