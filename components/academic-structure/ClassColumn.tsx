import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { DepartmentStructure } from '../../types';

interface ClassColumnProps {
  departments: DepartmentStructure[];
  selectedDept: string;
  selectedMajor: string;
  onSelectDept: (dept: string) => void;
  onSelectMajor: (major: string) => void;
  onAdd: (name: string) => void;
  onEdit: (name: string, dept: string, major: string) => void;
  onDelete: (name: string, dept: string, major: string) => void;
}

const ClassColumn: React.FC<ClassColumnProps> = ({ departments, selectedDept, selectedMajor, onSelectDept, onSelectMajor, onAdd, onEdit, onDelete }) => {
  const [newClassName, setNewClassName] = useState('');

  const displayedClasses = departments
    .flatMap(d => (d.majors || []).flatMap(m => (m.classes || []).map(c => ({ className: c, majorName: m.name, deptName: d.name }))))
    .filter(c => selectedDept ? c.deptName === selectedDept : true)
    .filter(c => selectedMajor ? c.majorName === selectedMajor : true);

  const handleAdd = () => {
    if(newClassName.trim() && selectedDept && selectedMajor) {
        onAdd(newClassName);
        setNewClassName('');
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-opacity ${!selectedMajor && displayedClasses.length === 0 ? 'opacity-75' : 'opacity-100'}`}>
        <div className="p-4 border-b border-gray-100 bg-pink-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-800 font-bold">
                <Users className="w-5 h-5" />
                <h3>3. Classes</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white rounded border border-pink-100 text-pink-600">
                Niveau 3
            </span>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                        value={selectedDept}
                        onChange={(e) => onSelectDept(e.target.value)}
                    >
                        <option value="">Département...</option>
                        {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                        value={selectedMajor}
                        onChange={(e) => onSelectMajor(e.target.value)}
                        disabled={!selectedDept}
                    >
                        <option value="">Filière...</option>
                        {departments.find(d => d.name === selectedDept)?.majors?.map(m => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Nom Classe (ex: L1-INFO)" 
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    disabled={!selectedMajor}
                    className="flex-1 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50 disabled:text-gray-400 placeholder-gray-400"
                />
                <button onClick={handleAdd} disabled={!selectedMajor || !newClassName.trim()} className="bg-pink-600 text-white p-2 rounded-lg hover:bg-pink-700 disabled:opacity-50">
                    <Plus className="w-5 h-5"/>
                </button>
                </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {displayedClasses.length === 0 && selectedMajor && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    <p>Aucune classe dans cette filière.</p>
                    <p className="text-xs mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
                </div>
            )}
            {!selectedMajor && displayedClasses.length > 0 && (
                <div className="text-center py-2 text-gray-400 text-xs bg-gray-50 rounded mb-2 border border-gray-100">
                    Sélectionnez une filière pour filtrer
                </div>
            )}

            {displayedClasses.map((c, i) => (
                <div key={i} className="p-3 bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-pink-100 rounded-lg transition-all group flex justify-between items-center">
                    <div>
                        <span className="font-bold text-gray-800 block">{c.className}</span>
                        <div className="text-[10px] text-pink-600 font-medium uppercase tracking-wider">{c.majorName}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(c.className, c.deptName, c.majorName); }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
                            <Edit2 className="w-4 h-4"/>
                        </button>
                        <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(c.className, c.deptName, c.majorName); }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ClassColumn;