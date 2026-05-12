import React, { useState, useMemo, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { getStudents, getDepartmentsStructure, subscribeToDataChanges } from '../services/dataService';
import { PaymentStatus, Student, DepartmentStructure } from '../types';

import StudentFilters from './student-directory/StudentFilters';
import StudentTable from './student-directory/StudentTable';
import RegistrationModal from './student-directory/RegistrationModal';
import StudentDetailsModal from './student-directory/StudentDetailsModal';

const StudentDirectory: React.FC = () => {
  // State Global
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Filtres
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Data
  const [departments, setDepartments] = useState<DepartmentStructure[]>([]);

  // Modals
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Initialisation et Abonnement
  useEffect(() => {
    setDepartments(getDepartmentsStructure());
    const unsubscribe = subscribeToDataChanges(() => {
        setDepartments(getDepartmentsStructure());
        setLastUpdate(Date.now());
    });
    return () => unsubscribe();
  }, []);

  // Dérivation des listes pour les filtres
  const filterMajors = useMemo(() => {
     if(!selectedDept) return [];
     const d = departments.find(d => d.name === selectedDept);
     // Sécurité : utiliser d?.majors || [] pour éviter le crash si 'majors' est undefined dans Firebase
     return d?.majors || [];
  }, [selectedDept, departments]);

  const filterClasses = useMemo(() => {
     if(!selectedMajor) return [];
     const m = filterMajors.find(m => m.name === selectedMajor);
     // Sécurité : utiliser m?.classes || []
     return m?.classes || [];
  }, [selectedMajor, filterMajors]);

  // Récupération des étudiants filtrés
  const { data: students } = useMemo(() => 
    getStudents(page, 50, searchTerm, statusFilter, selectedDept, selectedMajor, selectedClass), 
    [page, searchTerm, statusFilter, selectedDept, selectedMajor, selectedClass, lastUpdate]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[600px]">
      
      {/* Header & Filters */}
      <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Annuaire des Étudiants</h2>
            <button 
                onClick={() => setShowRegistration(true)}
                className="flex items-center gap-2 bg-[#1a237e] hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouvelle Inscription</span>
            </button>
        </div>
        
        <StudentFilters 
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            departments={departments}
            selectedDept={selectedDept} onDeptChange={(val) => { setSelectedDept(val); setSelectedMajor(''); setSelectedClass(''); }}
            selectedMajor={selectedMajor} onMajorChange={(val) => { setSelectedMajor(val); setSelectedClass(''); }}
            selectedClass={selectedClass} onClassChange={setSelectedClass}
            statusFilter={statusFilter} onStatusChange={setStatusFilter}
            filterMajors={filterMajors} filterClasses={filterClasses}
        />
      </div>

      {/* Table */}
      <StudentTable 
        students={students} 
        onSelectStudent={setSelectedStudent} 
      />

      {/* Modals */}
      {showRegistration && (
          <RegistrationModal 
            onClose={() => setShowRegistration(false)} 
            departments={departments} 
          />
      )}

      {selectedStudent && (
          <StudentDetailsModal 
            student={selectedStudent} 
            onClose={() => setSelectedStudent(null)}
            onUpdate={(updated) => {
                setSelectedStudent(updated);
                setLastUpdate(Date.now());
            }}
          />
      )}
    </div>
  );
};

export default StudentDirectory;