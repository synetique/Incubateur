import React, { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Student } from '../../../types';
import { getStudentLogs } from '../../../services/dataService';

interface HistoryPanelProps {
  student: Student;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ student }) => {
  const [filter, setFilter] = useState<'TODAY' | 'MONTH' | 'ALL'>('ALL');

  const filteredLogs = useMemo(() => {
    const logs = getStudentLogs(student.id);
    const now = new Date();
    
    return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        if (filter === 'TODAY') return logDate.toDateString() === now.toDateString();
        if (filter === 'MONTH') return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [student.id, filter]);

  return (
    <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
            <div className="flex gap-1">
                {['TODAY', 'MONTH', 'ALL'].map((f) => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f ? 'bg-white shadow text-[#1a237e]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {f === 'TODAY' ? "Aujourd'hui" : f === 'MONTH' ? 'Ce Mois' : 'Tout'}
                    </button>
                ))}
            </div>
            <div className="text-xs text-gray-400 font-medium">{filteredLogs.length} événements</div>
        </div>

        <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-4">
            {filteredLogs.length === 0 && <div className="pl-6 pt-4 text-gray-400 text-sm italic">Aucune activité.</div>}
            
            {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.status === 'GRANTED' ? 'bg-emerald-500' : log.status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    
                    <div className="flex justify-between items-start bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <p className={`text-sm font-bold ${log.status === 'GRANTED' ? 'text-emerald-700' : log.status === 'WARNING' ? 'text-yellow-700' : 'text-red-700'}`}>
                                {log.status === 'GRANTED' ? 'Entrée Validée' : log.status === 'WARNING' ? 'Entrée (Avertissement)' : 'Entrée Refusée'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{log.reason || 'Accès standard'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-800 flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" />
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HistoryPanel;