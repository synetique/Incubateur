import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { 
    getDepartmentsStructure, 
    addDepartment, addMajor, addClass,
    deleteDepartment, deleteMajor, deleteClass,
    updateDepartment, updateMajor, updateClass,
    subscribeToDataChanges
} from '../services/dataService';
import { DepartmentStructure } from '../types';

import DepartmentColumn from './academic-structure/DepartmentColumn';
import MajorColumn from './academic-structure/MajorColumn';
import ClassColumn from './academic-structure/ClassColumn';
import EditDeleteModal from './academic-structure/EditDeleteModal';

interface ModalState {
  isOpen: boolean;
  type: 'EDIT' | 'DELETE' | null;
  level: 'DEPT' | 'MAJOR' | 'CLASS' | null;
  data: {
    deptName?: string;
    majorName?: string;
    currentName: string;
  } | null;
}

const AcademicStructure: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentStructure[]>([]);
  
  // Selection State (Drill-down)
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');

  // Modal State
  const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, level: null, data: null });

  useEffect(() => {
    setDepartments(getDepartmentsStructure());
    const unsubscribe = subscribeToDataChanges(() => {
        setDepartments([...getDepartmentsStructure()]);
    });
    return () => unsubscribe();
  }, []);

  const refreshData = () => {
      setDepartments([...getDepartmentsStructure()]);
  };

  // --- SELECTION LOGIC ---
  const handleSelectDept = (deptName: string) => {
    if (selectedDept === deptName) {
        // Deselect
        setSelectedDept('');
        setSelectedMajor('');
    } else {
        // Select
        setSelectedDept(deptName);
        setSelectedMajor(''); // Reset major when dept changes
    }
  };

  const handleSelectMajor = (majorName: string, deptName: string) => {
      setSelectedDept(deptName); // Ensure consistency
      if (selectedMajor === majorName) {
          setSelectedMajor('');
      } else {
          setSelectedMajor(majorName);
      }
  };

  // --- ADD ACTIONS ---
  const handleAddDept = (name: string) => {
      addDepartment(name);
      refreshData();
  };
  const handleAddMajor = (name: string) => {
      if(selectedDept) { addMajor(selectedDept, name); refreshData(); }
  };
  const handleAddClass = (name: string) => {
      if(selectedDept && selectedMajor) { addClass(selectedDept, selectedMajor, name); refreshData(); }
  };

  // --- MODAL TRIGGERS ---
  const triggerEdit = (level: 'DEPT' | 'MAJOR' | 'CLASS', name: string, deptName?: string, majorName?: string) => {
      setModal({ 
          isOpen: true, type: 'EDIT', level, 
          data: { currentName: name, deptName, majorName } 
      });
  };

  const triggerDelete = (level: 'DEPT' | 'MAJOR' | 'CLASS', name: string, deptName?: string, majorName?: string) => {
      setModal({ 
          isOpen: true, type: 'DELETE', level, 
          data: { currentName: name, deptName, majorName } 
      });
  };

  const handleConfirmAction = (editValue?: string) => {
      if (!modal.data || !modal.level) return;

      if (modal.type === 'DELETE') {
          if (modal.level === 'DEPT') deleteDepartment(modal.data.currentName);
          if (modal.level === 'MAJOR' && modal.data.deptName) deleteMajor(modal.data.deptName, modal.data.currentName);
          if (modal.level === 'CLASS' && modal.data.deptName && modal.data.majorName) deleteClass(modal.data.deptName, modal.data.majorName, modal.data.currentName);
      } 
      else if (modal.type === 'EDIT' && editValue) {
          if (!editValue.trim()) return;
          if (modal.level === 'DEPT') updateDepartment(modal.data.currentName, editValue);
          if (modal.level === 'MAJOR' && modal.data.deptName) updateMajor(modal.data.deptName, modal.data.currentName, editValue);
          if (modal.level === 'CLASS' && modal.data.deptName && modal.data.majorName) updateClass(modal.data.deptName, modal.data.majorName, modal.data.currentName, editValue);
      }

      refreshData();
      setModal({ isOpen: false, type: null, level: null, data: null });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col relative">
       
       <EditDeleteModal 
         isOpen={modal.isOpen}
         type={modal.type}
         level={modal.level}
         data={modal.data}
         onClose={() => setModal({ isOpen: false, type: null, level: null, data: null })}
         onConfirm={handleConfirmAction}
       />

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a237e] flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Structure Académique
          </h2>
          <p className="text-sm text-gray-500">Gérez l'organisation hiérarchique. Cliquez sur un élément pour filtrer les niveaux inférieurs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          <DepartmentColumn 
             departments={departments}
             selectedDept={selectedDept}
             onSelect={handleSelectDept}
             onAdd={handleAddDept}
             onEdit={(name) => triggerEdit('DEPT', name)}
             onDelete={(name) => triggerDelete('DEPT', name)}
          />

          <MajorColumn 
             departments={departments}
             selectedDept={selectedDept}
             selectedMajor={selectedMajor}
             onSelectDept={(d) => { setSelectedDept(d); setSelectedMajor(''); }}
             onSelectMajor={handleSelectMajor}
             onAdd={handleAddMajor}
             onEdit={(name, dept) => triggerEdit('MAJOR', name, dept)}
             onDelete={(name, dept) => triggerDelete('MAJOR', name, dept)}
          />

          <ClassColumn 
             departments={departments}
             selectedDept={selectedDept}
             selectedMajor={selectedMajor}
             onSelectDept={(d) => { setSelectedDept(d); setSelectedMajor(''); }}
             onSelectMajor={(m) => setSelectedMajor(m)}
             onAdd={handleAddClass}
             onEdit={(name, dept, major) => triggerEdit('CLASS', name, dept, major)}
             onDelete={(name, dept, major) => triggerDelete('CLASS', name, dept, major)}
          />
      </div>
    </div>
  );
};

export default AcademicStructure;