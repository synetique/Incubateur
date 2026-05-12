import React from 'react';
import { Search } from 'lucide-react';
import { DepartmentStructure, PaymentStatus } from '../../types';

interface StudentFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  departments: DepartmentStructure[];
  selectedDept: string;
  onDeptChange: (val: string) => void;
  selectedMajor: string;
  onMajorChange: (val: string) => void;
  selectedClass: string;
  onClassChange: (val: string) => void;
  statusFilter: PaymentStatus | 'ALL';
  onStatusChange: (val: PaymentStatus | 'ALL') => void;
  filterMajors: any[];
  filterClasses: string[];
}

const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchTerm, onSearchChange,
  departments,
  selectedDept, onDeptChange,
  selectedMajor, onMajorChange,
  selectedClass, onClassChange,
  statusFilter, onStatusChange,
  filterMajors, filterClasses
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Rechercher par nom, matricule ou téléphone..." 
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2 flex-wrap">
         {/* Department Filter */}
        <select 
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
        >
            <option value="">Département...</option>
            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>

        {/* Major Filter */}
        <select 
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={selectedMajor}
            onChange={(e) => onMajorChange(e.target.value)}
            disabled={!selectedDept}
        >
            <option value="">Filière...</option>
            {filterMajors.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
        </select>

        {/* Class Filter */}
         <select 
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            disabled={!selectedMajor}
        >
            <option value="">Classe...</option>
            {filterClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status Filter */}
        <select 
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as PaymentStatus | 'ALL')}
        >
            <option value="ALL">Statut: Tous</option>
            <option value={PaymentStatus.PAID}>En Règle</option>
            <option value={PaymentStatus.WARNING}>Avertissement</option>
            <option value={PaymentStatus.OVERDUE}>Bloqué</option>
        </select>
      </div>
    </div>
  );
};

export default StudentFilters;