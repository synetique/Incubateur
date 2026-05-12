
import React, { useState } from 'react';
import { X, CreditCard, History, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Student } from '../../types';
import { deleteStudent, updateStudentInfo } from '../../services/dataService';
import FinancialPanel from './details/FinancialPanel';
import HistoryPanel from './details/HistoryPanel';
import { useToast } from '../../contexts/ToastContext';

interface StudentDetailsModalProps {
  student: Student;
  onClose: () => void;
  onUpdate: (s: Student) => void;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'HISTORY'>('FINANCE');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const { addToast } = useToast();

  const handleStartEdit = () => {
      setEditForm({
          firstName: student.firstName, lastName: student.lastName,
          email: student.email, phone: student.phone,
          guardianName: student.guardianName, guardianPhone: student.guardianPhone
      });
      setIsEditingInfo(true);
  };

  const handleSaveInfo = () => {
      const updated = updateStudentInfo(student.id, editForm);
      if(updated) { 
          onUpdate(updated); 
          setIsEditingInfo(false);
          addToast('Informations étudiant mises à jour.', 'SUCCESS');
      }
  };

  const confirmDelete = () => {
      deleteStudent(student.id);
      addToast('Dossier étudiant supprimé définitivement.', 'WARNING');
      setShowDeleteConfirm(false);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        
        {/* MODALE DE CONFIRMATION SUPPRESSION CENTRÉE */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Confirmer la suppression</h3>
                        <p className="text-sm text-gray-500">
                            Voulez-vous vraiment supprimer définitivement le dossier de <span className="font-bold text-gray-800">{student.firstName} {student.lastName}</span> ? 
                            <br/>Cette action est irréversible.
                        </p>
                        <div className="flex gap-3 w-full mt-4">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-900/20"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">Dossier Étudiant</h3>
                    {!isEditingInfo && <button onClick={handleStartEdit} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:text-blue-600"><Edit2 className="w-3 h-3"/> Modifier</button>}
                    {!isEditingInfo && <button onClick={() => setShowDeleteConfirm(true)} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:text-red-600 text-red-500"><Trash2 className="w-3 h-3"/> Supprimer</button>}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
                {/* Sidebar Info */}
                <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-100">
                    <div className="flex flex-col items-center text-center mb-6">
                        <img src={student.photoUrl} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4" />
                        {isEditingInfo ? (
                            <div className="space-y-2 w-full">
                                <input className="w-full text-center font-bold border rounded p-1" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} placeholder="Prénom" />
                                <input className="w-full text-center font-bold border rounded p-1" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} placeholder="Nom" />
                            </div>
                        ) : (
                            <h2 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
                        )}
                        <p className="text-[#1a237e] font-mono text-sm mt-1">{student.id}</p>
                         <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${student.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : student.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-[#c62828]'}`}>
                            {student.status === 'PAID' ? 'ACCÈS AUTORISÉ' : student.status === 'WARNING' ? 'ACCÈS AUTORISÉ (Grace)' : 'ACCÈS BLOQUÉ'}
                        </div>
                    </div>
                    {/* Infos Details */}
                    <div className="space-y-4 text-sm border-t border-gray-200 pt-4">
                         <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">Département</p>
                            <p className="font-medium text-gray-800">{student.department}</p>
                            <p className="text-gray-500">{student.major} - {student.className}</p>
                        </div>
                         <div>
                             <p className="text-gray-400 text-xs uppercase font-bold">Contact</p>
                             {isEditingInfo ? (
                                <input className="w-full text-sm border rounded p-1" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                            ) : (
                                <p className="text-gray-500">{student.phone}</p>
                            )}
                        </div>
                    </div>
                    {isEditingInfo && (
                        <div className="mt-6 flex gap-2">
                             <button onClick={handleSaveInfo} className="flex-1 bg-emerald-600 text-white py-2 rounded text-sm font-bold">Enregistrer</button>
                             <button onClick={() => setIsEditingInfo(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-bold">Annuler</button>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex border-b border-gray-100 bg-white">
                        <button onClick={() => setActiveTab('FINANCE')} className={`flex-1 py-4 text-center font-bold text-sm border-b-2 flex items-center justify-center gap-2 ${activeTab === 'FINANCE' ? 'border-[#1a237e] text-[#1a237e] bg-blue-50/30' : 'border-transparent text-gray-500'}`}><CreditCard className="w-4 h-4" /> Situation Financière</button>
                        <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-4 text-center font-bold text-sm border-b-2 flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'border-[#1a237e] text-[#1a237e] bg-blue-50/30' : 'border-transparent text-gray-500'}`}><History className="w-4 h-4" /> Historique</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {activeTab === 'FINANCE' && <FinancialPanel student={student} onUpdate={onUpdate} />}
                        {activeTab === 'HISTORY' && <HistoryPanel student={student} />}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentDetailsModal;
