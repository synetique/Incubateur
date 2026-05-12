import React from 'react';
import { Eye, Check, AlertCircle } from 'lucide-react';
import { Student, PaymentStatus } from '../../types';

interface StudentTableProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  isLoading?: boolean;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, onSelectStudent, isLoading }) => {
  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiant</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Académique</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut Fin.</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscription</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.length === 0 ? (
              <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {isLoading ? "Chargement des données..." : "Aucun étudiant trouvé pour ces critères."}
                  </td>
              </tr>
          ) : (
           students.map((student) => {
            const isRegistered = student.registration.status === 'PAID';

            return (
            <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-gray-500 font-mono">{student.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm font-bold text-gray-700">{student.className}</p>
                <p className="text-xs text-gray-500">{student.major}</p>
              </td>
              <td className="px-6 py-4">
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                  ${student.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-800' : ''}
                  ${student.status === PaymentStatus.WARNING ? 'bg-amber-100 text-amber-800' : ''}
                  ${student.status === PaymentStatus.OVERDUE ? 'bg-rose-100 text-rose-800' : ''}
                `}>
                  {student.status === PaymentStatus.PAID && 'À Jour'}
                  {student.status === PaymentStatus.WARNING && 'Retard (Accès OK)'}
                  {student.status === PaymentStatus.OVERDUE && 'Bloqué'}
                </span>
              </td>
              <td className="px-6 py-4">
                  {isRegistered ? (
                      <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold bg-emerald-50 px-2 py-1 rounded max-w-fit">
                          <Check className="w-3 h-3" /> OK
                      </span>
                  ) : (
                      <span className="text-[#c62828] flex items-center gap-1 text-xs font-bold bg-red-50 px-2 py-1 rounded max-w-fit">
                          <AlertCircle className="w-3 h-3" /> À Payer
                      </span>
                  )}
              </td>
              <td className="px-6 py-4 text-right">
                 <button 
                  onClick={() => onSelectStudent(student)}
                  className="text-gray-400 hover:text-[#1a237e] p-1 rounded-full hover:bg-blue-50 transition-colors"
                  title="Voir dossier"
                 >
                   <Eye className="w-5 h-5" />
                 </button>
              </td>
            </tr>
          )}))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;