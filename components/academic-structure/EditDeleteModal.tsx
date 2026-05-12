import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X, AlertTriangle, Save } from 'lucide-react';

interface EditDeleteModalProps {
  isOpen: boolean;
  type: 'EDIT' | 'DELETE' | null;
  level: 'DEPT' | 'MAJOR' | 'CLASS' | null;
  data: {
    currentName: string;
    deptName?: string;
    majorName?: string;
  } | null;
  onClose: () => void;
  onConfirm: (editValue?: string) => void;
}

const EditDeleteModal: React.FC<EditDeleteModalProps> = ({ isOpen, type, level, data, onClose, onConfirm }) => {
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (isOpen && data) {
      setEditValue(data.currentName);
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            {/* Modal Header */}
            <div className={`px-6 py-4 flex justify-between items-center border-b ${type === 'DELETE' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <h3 className={`font-bold text-lg flex items-center gap-2 ${type === 'DELETE' ? 'text-red-700' : 'text-blue-700'}`}>
                    {type === 'DELETE' ? <AlertTriangle className="w-5 h-5"/> : <Edit2 className="w-5 h-5"/>}
                    {type === 'DELETE' ? 'Confirmer la suppression' : 'Modifier l\'élément'}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
                {type === 'DELETE' ? (
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Êtes-vous sûr de vouloir supprimer 
                            <strong className="text-gray-900"> {data.currentName}</strong> ?
                        </p>
                        {level === 'DEPT' && (
                            <div className="text-xs bg-red-100 text-red-700 p-3 rounded-lg">
                                <strong>Attention :</strong> Cela supprimera également toutes les filières et classes associées à ce département.
                            </div>
                        )}
                        {level === 'MAJOR' && (
                            <div className="text-xs bg-red-100 text-red-700 p-3 rounded-lg">
                                <strong>Attention :</strong> Cela supprimera toutes les classes de cette filière.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'élément</label>
                            <input 
                                type="text" 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                    Annuler
                </button>
                <button 
                    onClick={() => onConfirm(editValue)}
                    className={`px-4 py-2 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors ${
                        type === 'DELETE' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {type === 'DELETE' ? <Trash2 className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
                    {type === 'DELETE' ? 'Supprimer' : 'Enregistrer'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default EditDeleteModal;