
import React, { useState } from 'react';
import { Check, Edit2, X, DollarSign } from 'lucide-react';
import { Student } from '../../../types';
import { processMonthlyPayment, processRegistrationPayment, updateMonthlyAmount } from '../../../services/dataService';
import { useToast } from '../../../contexts/ToastContext';

interface FinancialPanelProps {
  student: Student;
  onUpdate: (updatedStudent: Student) => void;
}

const FinancialPanel: React.FC<FinancialPanelProps> = ({ student, onUpdate }) => {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<number>(0);
  const { addToast } = useToast();

  const handlePayRegistration = () => {
      const updated = processRegistrationPayment(student.id);
      if(updated) {
          onUpdate(updated);
          addToast("Frais d'inscription encaissés avec succès.", 'SUCCESS');
      }
  };

  const handlePayMonth = (month: string) => {
      const updated = processMonthlyPayment(student.id, month);
      if(updated) {
          onUpdate(updated);
          addToast(`Paiement de ${month} enregistré pour ${student.firstName}.`, 'SUCCESS');
      }
  };

  const startEditingAmount = (month: string, currentAmount: number) => {
      setEditingMonth(month);
      setEditAmountValue(currentAmount);
  };

  const saveEditedAmount = (month: string) => {
      const updated = updateMonthlyAmount(student.id, month, editAmountValue);
      if(updated) {
          onUpdate(updated);
          addToast(`Montant de ${month} mis à jour : ${editAmountValue} FCFA`, 'INFO');
      }
      setEditingMonth(null);
  };

  return (
    <div className="animate-fade-in">
        {/* Registration Card */}
        <div className={`mb-6 p-4 rounded-xl border ${student.registration.status === 'PAID' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h4 className={`font-bold uppercase text-xs tracking-wider ${student.registration.status === 'PAID' ? 'text-emerald-800' : 'text-red-800'}`}>Frais d'Inscription</h4>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{student.registration.amountDue.toLocaleString()} FCFA</div>
                </div>
                {student.registration.status === 'PAID' ? (
                    <div className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" /> Payé
                    </div>
                ) : (
                    <button onClick={handlePayRegistration} className="bg-[#c62828] hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
                        Encaisser Maintenant
                    </button>
                )}
            </div>
        </div>
        
        {/* Monthly Schedule */}
        <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Échéancier Mensuel</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500">
                    <tr>
                        <th className="px-4 py-2 font-medium">Mois</th>
                        <th className="px-4 py-2 font-medium">Montant</th>
                        <th className="px-4 py-2 font-medium">Statut</th>
                        <th className="px-4 py-2 font-medium text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {student.payments.map((p, idx) => (
                        <tr key={idx} className={p.status === 'PAID' ? 'bg-emerald-50/30' : ''}>
                            <td className="px-4 py-3 font-medium text-gray-700">{p.month}</td>
                            <td className="px-4 py-3 text-gray-600">
                                {editingMonth === p.month && p.status !== 'PAID' ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-24 px-2 py-1 border border-blue-300 bg-white rounded text-sm"
                                            value={editAmountValue}
                                            onChange={(e) => setEditAmountValue(Number(e.target.value))}
                                            autoFocus
                                        />
                                        <button onClick={() => saveEditedAmount(p.month)} className="text-emerald-600"><Check className="w-4 h-4"/></button>
                                        <button onClick={() => setEditingMonth(null)} className="text-gray-400"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="font-bold text-gray-800">{p.amountDue.toLocaleString()}</span>
                                        {p.status !== 'PAID' && (
                                            <button onClick={() => startEditingAmount(p.month, p.amountDue)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {p.status === 'PAID' && <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><Check className="w-3 h-3"/> Payé</span>}
                                {p.status === 'PENDING' && <span className="text-rose-500 font-bold text-xs">Non Payé</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {p.status !== 'PAID' && (
                                    <button 
                                        onClick={() => handlePayMonth(p.month)}
                                        disabled={student.registration.status !== 'PAID'} 
                                        className="bg-[#1a237e] hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded transition-colors"
                                    >
                                        Encaisser
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default FinancialPanel;
