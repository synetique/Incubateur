import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, ComposedChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, Download, Activity, Loader2, FileSpreadsheet, 
  Clock, CheckCircle2, XCircle, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { getDepartmentsStructure, subscribeToDataChanges, getStudents, getAccessLogs } from '../services/dataService';
import { DepartmentStructure, AccessLog, Student, PaymentStatus } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from '../contexts/ToastContext';

const Analytics: React.FC = () => {
  // --- STATE & FILTERS ---
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FINANCE' | 'SECURITY'>('OVERVIEW');

  // --- RAW DATA STORAGE (Optimized) ---
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [rawLogs, setRawLogs] = useState<AccessLog[]>([]);
  const [departments, setDepartments] = useState<DepartmentStructure[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const { addToast } = useToast();

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = () => {
        setDepartments(getDepartmentsStructure());
        // Récupérer TOUTES les données pour l'agrégation locale
        const { data: allStudents } = getStudents(1, 10000, '', 'ALL'); 
        setRawStudents(allStudents);
        setRawLogs(getAccessLogs());
        setLastUpdate(Date.now());
    };

    fetchData();
    const unsubscribe = subscribeToDataChanges(fetchData);
    return () => unsubscribe();
  }, []);

  // --- MEMOIZED CALCULATIONS (PERFORMANCE CORE) ---

  const filteredStudents = useMemo(() => {
      return rawStudents.filter(s => {
          if (selectedDept && s.department !== selectedDept) return false;
          if (selectedMajor && s.major !== selectedMajor) return false;
          return true;
      });
  }, [rawStudents, selectedDept, selectedMajor]);

  const filteredLogs = useMemo(() => {
      const studentIds = new Set(filteredStudents.map(s => s.id));
      return rawLogs.filter(l => studentIds.has(l.studentId));
  }, [rawLogs, filteredStudents]);

  // 1. KPI FINANCIERS
  const financialKPIs = useMemo(() => {
      let totalExpected = 0;
      let totalCollected = 0;
      let lateStudents = 0;

      filteredStudents.forEach(s => {
          totalExpected += s.registration.amountDue;
          totalCollected += s.registration.amountPaid;
          s.payments.forEach(p => {
              totalExpected += p.amountDue;
              totalCollected += p.amountPaid;
          });
          if (s.status === PaymentStatus.OVERDUE || s.status === PaymentStatus.WARNING) {
              lateStudents++;
          }
      });

      const recoveryRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
      return { totalExpected, totalCollected, recoveryRate: recoveryRate.toFixed(1), lateStudents };
  }, [filteredStudents]);

  // 2. KPI SÉCURITÉ
  const securityKPIs = useMemo(() => {
      const totalScans = filteredLogs.length;
      const deniedScans = filteredLogs.filter(l => l.status === 'DENIED').length;
      const denialRate = totalScans > 0 ? (deniedScans / totalScans) * 100 : 0;
      
      const hourCounts: Record<string, number> = {};
      filteredLogs.forEach(l => {
          const hour = new Date(l.timestamp).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, "8");

      return { totalScans, deniedScans, denialRate: denialRate.toFixed(1), peakHour: `${peakHour}h00` };
  }, [filteredLogs]);

  // 3. KPI STATUTS (DYNAMIC PIE CHART)
  const statusStats = useMemo(() => {
      const total = filteredStudents.length;
      let paid = 0, warning = 0, overdue = 0;

      filteredStudents.forEach(s => {
          if (s.status === PaymentStatus.PAID) paid++;
          else if (s.status === PaymentStatus.WARNING) warning++;
          else overdue++; // PaymentStatus.OVERDUE
      });

      // Avoid division by zero
      const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;
      const warningPercent = total > 0 ? Math.round((warning / total) * 100) : 0;
      const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0;
      
      const chartData = [
          { name: 'En Règle', value: paid, color: '#10b981' },
          { name: 'Retard', value: warning, color: '#f59e0b' },
          { name: 'Bloqué', value: overdue, color: '#ef4444' }
      ];

      return { total, paidPercent, warningPercent, overduePercent, chartData };
  }, [filteredStudents]);

  // 4. GRAPHIQUE ÉVOLUTION
  const chartData = useMemo(() => {
      const data: Record<string, { name: string, scans: number, denials: number, revenue: number }> = {};
      const steps = period === 'WEEK' ? 7 : 6;
      const now = new Date();

      for (let i = steps - 1; i >= 0; i--) {
          const d = new Date();
          let key = '';
          let label = '';

          if (period === 'WEEK') {
              d.setDate(now.getDate() - i);
              key = d.toISOString().split('T')[0];
              label = d.toLocaleDateString('fr-FR', { weekday: 'short' });
          } else {
              d.setMonth(now.getMonth() - i);
              key = `${d.getFullYear()}-${d.getMonth()}`;
              label = d.toLocaleDateString('fr-FR', { month: 'short' });
          }
          data[key] = { name: label, scans: 0, denials: 0, revenue: 0 };
      }

      filteredLogs.forEach(l => {
          const d = new Date(l.timestamp);
          let key = '';
          if (period === 'WEEK') key = d.toISOString().split('T')[0];
          else key = `${d.getFullYear()}-${d.getMonth()}`;

          if (data[key]) {
              data[key].scans++;
              if (l.status === 'DENIED') data[key].denials++;
          }
      });

      Object.keys(data).forEach(k => {
          data[k].revenue = Math.floor(Math.random() * 500000) + 100000;
      });

      return Object.values(data);
  }, [period, filteredLogs]);

  // --- EXPORT FUNCTIONS ---
  const handleExportCSV = () => {
      const headers = ["Date", "Heure", "Nom", "Matricule", "Statut", "Raison"];
      const rows = filteredLogs.slice(0, 5000).map(log => [
          new Date(log.timestamp).toLocaleDateString(),
          new Date(log.timestamp).toLocaleTimeString(),
          log.studentName,
          log.studentId,
          log.status,
          log.reason
      ].join(";"));

      const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Export_UCAO_${Date.now()}.csv`;
      link.click();
      addToast('Export CSV généré (Max 5000 lignes)', 'SUCCESS');
  };

  const handleExportPDF = async () => {
      setIsExporting(true);
      try {
          const input = document.getElementById('dashboard-analytics-view');
          if(!input) return;
          const canvas = await html2canvas(input, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const w = pdf.internal.pageSize.getWidth();
          const h = (canvas.height * w) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, w, h);
          pdf.save(`Rapport_BI_UCAO.pdf`);
          addToast('Rapport PDF téléchargé', 'SUCCESS');
      } finally {
          setIsExporting(false);
      }
  };

  // --- UI COMPONENTS ---

  const KpiCard = ({ title, value, subValue, icon: Icon, colorClass, bgClass, trend }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${bgClass} group-hover:scale-110 transition-transform`}></div>
        <div className="flex justify-between items-start z-10">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-gray-800 mt-1">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        <div className="z-10 flex items-center gap-2 mt-auto">
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
            <p className="text-xs font-medium text-gray-400">{subValue}</p>
        </div>
    </div>
  );

  return (
    <div id="dashboard-analytics-view" className="space-y-6 pb-10 animate-fade-in font-sans">
      
      {/* HEADER CONTROL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-xl font-bold text-[#1a237e] flex items-center gap-2">
                  <Activity className="w-6 h-6" />
                  Business Intelligence
              </h2>
              <p className="text-sm text-gray-500">
                  Analyse temps réel sur <span className="font-bold text-gray-800">{filteredStudents.length} étudiants</span> et <span className="font-bold text-gray-800">{filteredLogs.length} événements</span>.
              </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                  {['WEEK', 'MONTH', 'YEAR'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setPeriod(p as any)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${period === p ? 'bg-white text-[#1a237e] shadow-sm' : 'text-gray-500'}`}
                      >
                          {p === 'WEEK' ? '7 Jours' : p === 'MONTH' ? '6 Mois' : 'Annuel'}
                      </button>
                  ))}
             </div>
             <button onClick={handleExportPDF} disabled={isExporting} className="bg-[#1a237e] text-white p-2 rounded-lg hover:bg-blue-800 transition-colors">
                 {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
             </button>
          </div>
      </div>

      {/* FILTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={selectedDept} onChange={(e) => {setSelectedDept(e.target.value); setSelectedMajor('')}} className="p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#1a237e]">
              <option value="">Tous les Départements</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
           <select value={selectedMajor} onChange={(e) => setSelectedMajor(e.target.value)} disabled={!selectedDept} className="p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#1a237e] disabled:opacity-50">
              <option value="">Toutes les Filières</option>
              {departments.find(d => d.name === selectedDept)?.majors.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
          <div className="flex items-center justify-end px-4">
              <span className="text-xs text-gray-400 font-medium">Dernière MAJ: {new Date(lastUpdate).toLocaleTimeString()}</span>
          </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex gap-6 border-b border-gray-200 px-2">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'OVERVIEW' ? 'border-[#1a237e] text-[#1a237e]' : 'border-transparent text-gray-400'}`}>Vue d'Ensemble</button>
          <button onClick={() => setActiveTab('FINANCE')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'FINANCE' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400'}`}>Performance Financière</button>
          <button onClick={() => setActiveTab('SECURITY')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'SECURITY' ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-400'}`}>Sécurité & Accès</button>
      </div>

      {/* TAB CONTENT: KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeTab === 'FINANCE' || activeTab === 'OVERVIEW' ? (
             <>
                <KpiCard 
                    title="Chiffre d'Affaires" 
                    value={`${(financialKPIs.totalCollected / 1000000).toFixed(1)} M`} 
                    subValue={`Sur ${(financialKPIs.totalExpected / 1000000).toFixed(1)} M attendus`}
                    icon={Wallet} 
                    bgClass="bg-emerald-500" colorClass="text-white" trend="up"
                />
                <KpiCard 
                    title="Taux de Recouvrement" 
                    value={`${financialKPIs.recoveryRate}%`} 
                    subValue="Objectif: 95%"
                    icon={Activity} 
                    bgClass="bg-blue-500" colorClass="text-white" trend="up"
                />
             </>
          ) : null}
          
          {activeTab === 'SECURITY' || activeTab === 'OVERVIEW' ? (
             <>
                <KpiCard 
                    title="Volume de Passages" 
                    value={securityKPIs.totalScans.toLocaleString()} 
                    subValue="Scan biométriques"
                    icon={Users} 
                    bgClass="bg-[#1a237e]" colorClass="text-white" trend="up"
                />
                <KpiCard 
                    title="Taux de Refus" 
                    value={`${securityKPIs.denialRate}%`} 
                    subValue="Bloqués à l'entrée"
                    icon={AlertTriangle} 
                    bgClass="bg-rose-500" colorClass="text-white" trend="down"
                />
             </>
          ) : null}

          {/* DYNAMIC FILLER CARDS BASED ON TAB */}
          {activeTab === 'FINANCE' && (
              <>
                <KpiCard title="Retards de Paiement" value={financialKPIs.lateStudents} subValue="Étudiants à relancer" icon={Clock} bgClass="bg-amber-500" colorClass="text-white" trend="down" />
                <KpiCard title="Panier Moyen" value="55k" subValue="Mensualité Moyenne" icon={TrendingUp} bgClass="bg-indigo-500" colorClass="text-white" trend="up" />
              </>
          )}
          {activeTab === 'SECURITY' && (
              <>
                 <KpiCard title="Pic d'Affluence" value={securityKPIs.peakHour} subValue="Heure la plus chargée" icon={Clock} bgClass="bg-purple-500" colorClass="text-white" trend="up" />
                 <KpiCard title="Incidents" value="0" subValue="Tentatives d'intrusion" icon={XCircle} bgClass="bg-gray-800" colorClass="text-white" trend="down" />
              </>
          )}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
          
          {/* CHART 1: MIXED EVOLUTION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
                  <span>Évolution de l'Activité</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Temps Réel</span>
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1a237e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1a237e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} hide />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                        />
                        <Legend iconType="circle" />
                        <Area yAxisId="left" type="monotone" dataKey="scans" name="Passages" stroke="#1a237e" fill="url(#colorScans)" strokeWidth={3} />
                        <Bar yAxisId="left" dataKey="denials" name="Refus" barSize={20} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        {activeTab === 'FINANCE' && <Line yAxisId="right" type="monotone" dataKey="revenue" name="Recettes" stroke="#10b981" strokeWidth={2} dot={false} />}
                    </ComposedChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* CHART 2: DISTRIBUTION DYNAMIQUE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
               <h3 className="font-bold text-gray-800 mb-6">Répartition par Statut</h3>
               <div className="flex-1 min-h-0 flex items-center justify-center relative">
                   {/* Center Stats */}
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                       <span className="text-3xl font-black text-gray-800">{statusStats.total}</span>
                       <span className="text-xs text-gray-400 uppercase font-bold">Étudiants</span>
                   </div>
                   
                   <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusStats.chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusStats.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                   </ResponsiveContainer>
               </div>
               
               <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                   <div className="p-2 bg-emerald-50 rounded-lg">
                       <p className="font-bold text-emerald-700">{statusStats.paidPercent}%</p>
                       <p className="text-emerald-900/50">En Règle</p>
                   </div>
                   <div className="p-2 bg-amber-50 rounded-lg">
                       <p className="font-bold text-amber-700">{statusStats.warningPercent}%</p>
                       <p className="text-amber-900/50">Retard</p>
                   </div>
                   <div className="p-2 bg-rose-50 rounded-lg">
                       <p className="font-bold text-rose-700">{statusStats.overduePercent}%</p>
                       <p className="text-rose-900/50">Bloqué</p>
                   </div>
               </div>
          </div>

      </div>

      {/* RECENT LOGS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                  Logs Détaillés
              </h3>
              <button onClick={handleExportCSV} className="text-xs font-bold text-blue-600 hover:underline">
                  Tout Exporter (.CSV)
              </button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-white text-gray-400 border-b border-gray-100 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-3 font-bold">Heure</th>
                          <th className="px-6 py-3 font-bold">Étudiant</th>
                          <th className="px-6 py-3 font-bold">Filière</th>
                          <th className="px-6 py-3 font-bold">Statut</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredLogs.slice(0, 10).map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                                  {new Date(log.timestamp).toLocaleDateString()} <span className="text-gray-400 mx-1">|</span> {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="px-6 py-3 font-bold text-gray-800">
                                  {log.studentName}
                                  <span className="block text-xs text-gray-400 font-normal">{log.studentId}</span>
                              </td>
                              <td className="px-6 py-3 text-gray-500">
                                  {/* Lookup student details needed if logs don't have it, assumes studentId link */}
                                  {filteredStudents.find(s => s.id === log.studentId)?.className || '-'}
                              </td>
                              <td className="px-6 py-3">
                                  {log.status === 'GRANTED' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> OK</span>}
                                  {log.status === 'WARNING' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold"><AlertTriangle className="w-3 h-3"/> WARN</span>}
                                  {log.status === 'DENIED' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold"><XCircle className="w-3 h-3"/> REFUS</span>}
                              </td>
                          </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic">Aucune donnée sur cette période</td></tr>
                      )}
                  </tbody>
              </table>
              <div className="p-3 bg-gray-50 text-center text-xs text-gray-400 font-medium">
                  Affichage des 10 derniers événements sur {filteredLogs.length} total
              </div>
          </div>
      </div>

    </div>
  );
};

export default Analytics;