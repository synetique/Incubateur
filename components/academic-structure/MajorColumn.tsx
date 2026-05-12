import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, ChevronRight, Layers } from 'lucide-react';
import { DepartmentStructure } from '../../types';

interface MajorColumnProps {
  departments: DepartmentStructure[];
  selectedDept: string;
  selectedMajor: string;
  onSelectDept: (dept: string) => void;
  onSelectMajor: (major: string, dept: string) => void;
  onAdd: (name: string) => void;
  onEdit: (name: string, dept: string) => void;
  onDelete: (name: string, dept: string) => void;
}

const MajorColumn: React.FC<MajorColumnProps> = ({ departments, selectedDept, selectedMajor, onSelectDept, onSelectMajor, onAdd, onEdit, onDelete }) => {
  const [newMajorName, setNewMajorName] = useState('');

  const displayedMajors = departments
    .flatMap(d => (d.majors || []).map(m => ({...m, deptName: d.name})))
    .filter(m => selectedDept ? m.deptName === selectedDept : true);

  const handleAdd = () => {
    if(newMajorName.trim() && selectedDept) {
        onAdd(newMajorName);
        setNewMajorName('');
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-opacity ${!selectedDept && displayedMajors.length === 0 ? 'opacity-75' : 'opacity-100'}`}>
        <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-800 font-bold">
                <BookOpen className="w-5 h-5" />
                <h3>2. Filières</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white rounded border border-purple-100 text-purple-600">
                Niveau 2
            </span>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-3">
            {/* Dropdown acts as both selection and visual confirmation of filter */}
            <select 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={selectedDept}
            onChange={(e) => onSelectDept(e.target.value)}
            >
            <option value="">Tous les Départements...</option>
            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            
            <div className="flex gap-2">
            <input 
                type="text" 
                placeholder="Nouvelle Filière..." 
                value={newMajorName}
                onChange={(e) => setNewMajorName(e.target.value)}
                disabled={!selectedDept}
                className="flex-1 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400 placeholder-gray-400"
            />
            <button onClick={handleAdd} disabled={!selectedDept || !newMajorName.trim()} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                <Plus className="w-5 h-5"/>
            </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {displayedMajors.length === 0 && selectedDept && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    <p>Aucune filière dans ce département.</p>
                    <p className="text-xs mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
                </div>
            )}
            {!selectedDept && displayedMajors.length > 0 && (
                <div className="text-center py-2 text-gray-400 text-xs bg-gray-50 rounded mb-2 border border-gray-100">
                    Sélectionnez un département pour filtrer
                </div>
            )}
            
            {displayedMajors.map((m, i) => {
                const isSelected = selectedMajor === m.name;
                return (
                <div 
                    key={i} 
                    onClick={() => onSelectMajor(m.name, m.deptName)}
                    className={`
                        p-3 rounded-lg transition-all group flex justify-between items-start cursor-pointer border
                        ${isSelected 
                            ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200' 
                            : 'bg-gray-50 hover:bg-white hover:shadow-sm border-transparent hover:border-purple-100'
                        }
                    `}
                >
                    <div className="flex-1">
                        <div className={`font-semibold text-sm ${isSelected ? 'text-purple-900' : 'text-gray-800'}`}>{m.name}</div>
                        <div className="text-xs text-purple-500 flex items-center gap-1 mt-1">
                            <Layers className="w-3 h-3" /> {m.deptName}
                            <span className="mx-1">•</span>
                            {(m.classes || []).length} Classes
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(m.name, m.deptName); }}
                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
                                <Edit2 className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(m.name, m.deptName); }}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                        {isSelected && <ChevronRight className="w-4 h-4 text-purple-400" />}
                    </div>
                </div>
                );
            })}
        </div>
    </div>
  );
};

export default MajorColumn;