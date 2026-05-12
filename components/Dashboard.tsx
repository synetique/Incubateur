
import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Users, ShieldCheck, AlertTriangle, Ban, CloudLightning } from 'lucide-react';
import { getGlobalStats, getDepartmentStats, subscribeToDataChanges } from '../services/dataService';
import StatCard from './StatCard';

const Dashboard: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // S'abonner aux changements Firebase pour mettre à jour les stats
    const unsubscribe = subscribeToDataChanges(() => {
        setRefreshTrigger(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const globalStats = useMemo(() => getGlobalStats(), [refreshTrigger]);
  const deptStats = useMemo(() => getDepartmentStats(), [refreshTrigger]);
  
  // Data for Charts
  const statusData = [
    { name: 'En Règle', value: globalStats.accessGranted, color: '#059669' }, // Emerald 600
    { name: 'Avertissement', value: globalStats.gracePeriod, color: '#d97706' }, // Amber 600
    { name: 'Bloqué', value: globalStats.accessDenied, color: '#dc2626' }, // Red 600
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Cloud Status Indicator */}
      <div className="flex justify-end">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold shadow-sm">
             <CloudLightning className="w-3 h-3" />
             Base de Données Connectée
          </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Effectif Total" 
          value={globalStats.totalStudents.toLocaleString()} 
          icon={Users} 
          colorClass="text-blue-700" 
          bgClass="bg-blue-50"
          trend="Inscrits 2025-2026"
        />
        <StatCard 
          title="Accès Validés" 
          value={globalStats.accessGranted.toLocaleString()} 
          icon={ShieldCheck} 
          colorClass="text-emerald-600" 
          bgClass="bg-emerald-50"
          trend="À jour de paiement"
        />
        <StatCard 
          title="En Sursis" 
          value={globalStats.gracePeriod.toLocaleString()} 
          icon={AlertTriangle} 
          colorClass="text-amber-600" 
          bgClass="bg-amber-50"
          trend="Période de grâce active"
        />
        <StatCard 
          title="Accès Bloqués" 
          value={globalStats.accessDenied.toLocaleString()} 
          icon={Ban} 
          colorClass="text-rose-600" 
          bgClass="bg-rose-50"
          trend="Régularisation requise"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Financial Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">Santé Financière du Campus</h3>
                    <p className="text-sm text-gray-400">Répartition des étudiants par statut de paiement</p>
                 </div>
            </div>
              
            <div className="flex-1 min-h-0 flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-4 pl-4 border-l border-gray-100">
                      {statusData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{item.name}</span>
                              </div>
                              <span className="font-bold text-gray-800">{item.value}</span>
                          </div>
                      ))}
                      <div className="pt-4 mt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passages Jour</span>
                              <span className="text-xl font-black text-[#1a237e]">{globalStats.dailyScans}</span>
                          </div>
                      </div>
                  </div>
            </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Performance par Département</h3>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="paid" name="Payé" stackId="a" fill="#059669" />
                    <Bar dataKey="warning" name="Avert." stackId="a" fill="#d97706" />
                    <Bar dataKey="overdue" name="Bloqué" stackId="a" fill="#dc2626" />
                </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
