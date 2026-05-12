import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { DepartmentStructure } from '../../types';

interface DepartmentColumnProps {
  departments: DepartmentStructure[];
  selectedDept: string;
  onSelect: (deptName: string) => void;
  onAdd: (name: string) => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
}

const DepartmentColumn: React.FC<DepartmentColumnProps> = ({ departments, selectedDept, onSelect, onAdd, onEdit, onDelete }) => {
  const [newDeptName, setNewDeptName] = useState('');

  const handleAdd = () => {
    if(newDeptName.trim()) {
        onAdd(newDeptName);
        setNewDeptName('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-800 font-bold">
                <Layers className="w-5 h-5" />
                <h3>1. Départements</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white rounded border border-indigo-100 text-indigo-600">
                Niveau 1
            </span>
        </div>
        
        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex gap-2">
            <input 
                type="text" 
                placeholder="Nouveau Département..." 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
            />
            <button onClick={handleAdd} disabled={!newDeptName.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <Plus className="w-5 h-5"/>
            </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {departments.map((d, i) => {
                const isSelected = selectedDept === d.name;
                return (
                <div 
                    key={i} 
                    onClick={() => onSelect(d.name)}
                    className={`
                        p-3 rounded-lg transition-all group flex justify-between items-center cursor-pointer border
                        ${isSelected 
                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                            : 'bg-gray-50 hover:bg-white hover:shadow-sm border-transparent hover:border-indigo-100'
                        }
                    `}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-500'}`}>
                            <Layers className="w-4 h-4" />
                        </div>
                        <div>
                            <span className={`font-semibold text-sm block ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{d.name}</span>
                            <span className="text-xs text-gray-400">{(d.majors || []).length} Filières</span>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(d.name); }}
                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
                                <Edit2 className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(d.name); }}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                        {isSelected && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </div>
                </div>
                );
            })}
            {departments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Aucun département</p>}
        </div>
    </div>
  );
};

export default DepartmentColumn;