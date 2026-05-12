
import React, { useState, useEffect } from 'react';
import { CircleDollarSign, Save, RotateCcw, Building2, ChevronRight, Layers, GraduationCap, Grip, Calendar } from 'lucide-react';
import { DepartmentStructure, TuitionRule } from '../types';
import { 
    getDepartmentsStructure, 
    subscribeToDataChanges, 
    getTuitionRule, 
    saveTuitionRule, 
    deleteTuitionRule,
    GLOBAL_CONFIG,
    ACADEMIC_MONTHS 
} from '../services/dataService';
import { useToast } from '../contexts/ToastContext';

const TuitionRules: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentStructure[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  
  // State pour stocker les règles en cours d'édition (Clé: nomClasse)
  const [localRules, setLocalRules] = useState<Record<string, TuitionRule | null>>({});
  
  // Trigger pour refresh
  const [refresh, setRefresh] = useState(0);

  const { addToast } = useToast();

  useEffect(() => {
    setDepartments(getDepartmentsStructure());
    const unsubscribe = subscribeToDataChanges(() => {
        setDepartments(getDepartmentsStructure());
        setRefresh(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  // Chargement des données quand on sélectionne Dept et Filière
  const displayedClasses = React.useMemo(() => {
      if (!selectedDept || !selectedMajor) return [];
      
      const dept = departments.find(d => d.name === selectedDept);
      const major = dept?.majors.find(m => m.name === selectedMajor);
      return major?.classes || [];
  }, [selectedDept, selectedMajor, departments]);

  // Récupérer les règles de la DB pour les classes affichées
  const getRuleForClass = (className: string) => {
      // Si on a une version locale modifiée, on l'affiche
      if (localRules[className] !== undefined) return localRules[className];
      
      // Sinon on récupère de la DB
      return getTuitionRule(selectedDept, selectedMajor, className);
  };

  const initLocalRule = (className: string) => {
      const currentRule = getRuleForClass(className);
      const baseRule = currentRule || { registrationFee: GLOBAL_CONFIG.registrationFee, monthlyFee: 0 };
      return baseRule;
  };

  const handlePriceChange = (className: string, field: 'registrationFee' | 'monthlyFee', value: string) => {
      const numValue = parseInt(value) || 0;
      
      setLocalRules(prev => {
          const baseRule = prev[className] || initLocalRule(className);
          return {
              ...prev,
              [className]: { ...baseRule, [field]: numValue }
          };
      });
  };

  const handleModeChange = (className: string, mode: 'DEFAULT' | 'STATIC' | 'DYNAMIC') => {
      setLocalRules(prev => {
          const baseRule = prev[className] || initLocalRule(className);
          let newRule = { ...baseRule };

          if (mode === 'DEFAULT') {
              newRule.monthlyFee = 0;
              newRule.customSchedule = undefined;
          } else if (mode === 'STATIC') {
              newRule.monthlyFee = newRule.monthlyFee || 50000;
              newRule.customSchedule = undefined;
          } else if (mode === 'DYNAMIC') {
              newRule.monthlyFee = 0;
              // Pré-remplir avec l'existant ou le global
              const initialSchedule: Record<string, number> = {};
              ACADEMIC_MONTHS.forEach(m => {
                  initialSchedule[m] = GLOBAL_CONFIG.monthlySchedule[m] || 0;
              });
              newRule.customSchedule = initialSchedule;
          }
          return { ...prev, [className]: newRule };
      });
  };

  const handleScheduleItemChange = (className: string, month: string, value: string) => {
      const numValue = parseInt(value) || 0;
      setLocalRules(prev => {
          const baseRule = prev[className] || initLocalRule(className);
          const currentSchedule = baseRule.customSchedule || {};
          
          return {
              ...prev,
              [className]: { 
                  ...baseRule, 
                  customSchedule: {
                      ...currentSchedule,
                      [month]: numValue
                  } 
              }
          };
      });
  };

  const handleSave = (className: string) => {
      const ruleToSave = localRules[className];
      if (ruleToSave) {
          saveTuitionRule(selectedDept, selectedMajor, className, ruleToSave);
          addToast(`Tarifs mis à jour pour ${className}`, 'SUCCESS');
          
          // Clean local state to reflect "saved"
          setLocalRules(prev => {
              const copy = { ...prev };
              delete copy[className];
              return copy;
          });
      }
  };

  const handleReset = (className: string) => {
      if (window.confirm(`Voulez-vous vraiment rétablir les tarifs par défaut pour ${className} ?`)) {
          deleteTuitionRule(selectedDept, selectedMajor, className);
          
           // Clean local state
          setLocalRules(prev => {
              const copy = { ...prev };
              delete copy[className];
              return copy;
          });
          
          addToast(`Tarifs par défaut rétablis pour ${className}`, 'INFO');
          setRefresh(p => p + 1); // Force re-render
      }
  };

  // Helper pour déterminer le mode actif d'une règle (DB ou Locale)
  const getActiveMode = (rule: TuitionRule | null | undefined): 'DEFAULT' | 'STATIC' | 'DYNAMIC' => {
      if (!rule) return 'DEFAULT';
      if (rule.customSchedule && Object.keys(rule.customSchedule).length > 0) return 'DYNAMIC';
      if (rule.monthlyFee > 0) return 'STATIC';
      return 'DEFAULT';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col">
       
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a237e] flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6" />
            Grille Tarifaire & Scolarité
          </h2>
          <p className="text-sm text-gray-500">Définissez des frais d'inscription et mensualités spécifiques par classe.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* COL 1: SÉLECTION */}
          <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
              
              {/* DEPARTMENTS LIST */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> 1. Département
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {departments.map(d => (
                          <button
                            key={d.name}
                            onClick={() => { setSelectedDept(d.name); setSelectedMajor(''); setLocalRules({}); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${selectedDept === d.name ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                              {d.name}
                              {selectedDept === d.name && <ChevronRight className="w-4 h-4" />}
                          </button>
                      ))}
                  </div>
              </div>

              {/* MAJORS LIST */}
              <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-opacity ${!selectedDept ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" /> 2. Filière
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {selectedDept && departments.find(d => d.name === selectedDept)?.majors.map(m => (
                          <button
                            key={m.name}
                            onClick={() => { setSelectedMajor(m.name); setLocalRules({}); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${selectedMajor === m.name ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                              {m.name}
                              {selectedMajor === m.name && <ChevronRight className="w-4 h-4" />}
                          </button>
                      ))}
                      {selectedDept && departments.find(d => d.name === selectedDept)?.majors.length === 0 && (
                          <div className="p-4 text-center text-xs text-gray-400">Aucune filière trouvée.</div>
                      )}
                  </div>
              </div>

          </div>

          {/* COL 2: GRILLE PRIX */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <GraduationCap className="w-5 h-5" />
                        <h3>3. Tarification par Classe</h3>
                    </div>
                    {selectedMajor && <span className="text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded border border-emerald-100">{selectedDept} &gt; {selectedMajor}</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {!selectedMajor ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <CircleDollarSign className="w-16 h-16 mb-4 opacity-20" />
                            <p>Sélectionnez un Département puis une Filière</p>
                            <p className="text-sm">pour configurer les prix.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {displayedClasses.map(className => {
                                const dbRule = getTuitionRule(selectedDept, selectedMajor, className);
                                const isModified = localRules[className] !== undefined;
                                const currentRule = localRules[className] || dbRule;
                                const currentValues = currentRule || { registrationFee: GLOBAL_CONFIG.registrationFee, monthlyFee: 0 };
                                const isDefault = !dbRule && !isModified;
                                const activeMode = getActiveMode(currentRule);

                                return (
                                    <div key={className} className={`bg-white rounded-xl border-2 transition-all p-5 shadow-sm hover:shadow-md ${isDefault ? 'border-gray-100' : 'border-emerald-500 ring-4 ring-emerald-500/5'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800">{className}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isDefault ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isDefault ? 'Tarif Standard' : 'Tarif Spécifique'}
                                                </span>
                                            </div>
                                            {!isDefault && (
                                                <button onClick={() => handleReset(className)} className="text-gray-400 hover:text-red-500 p-1" title="Rétablir défaut">
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* Inscription */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Frais Inscription</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        value={currentValues.registrationFee}
                                                        onChange={(e) => handlePriceChange(className, 'registrationFee', e.target.value)}
                                                        className={`w-full pl-3 pr-12 py-2 rounded-lg border font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 ${isModified ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA</span>
                                                </div>
                                            </div>

                                            {/* Mensualité Toggle */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type de Mensualité</label>
                                                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                                                    <button 
                                                        onClick={() => handleModeChange(className, 'DEFAULT')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded ${activeMode === 'DEFAULT' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Défaut
                                                    </button>
                                                    <button 
                                                        onClick={() => handleModeChange(className, 'STATIC')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded ${activeMode === 'STATIC' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Fixe
                                                    </button>
                                                    <button 
                                                        onClick={() => handleModeChange(className, 'DYNAMIC')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded ${activeMode === 'DYNAMIC' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Dynamique
                                                    </button>
                                                </div>

                                                {/* MODE STATIC */}
                                                {activeMode === 'STATIC' && (
                                                    <div className="relative">
                                                        <input 
                                                            type="number"
                                                            value={currentValues.monthlyFee || 0}
                                                            onChange={(e) => handlePriceChange(className, 'monthlyFee', e.target.value)}
                                                            className={`w-full pl-3 pr-12 py-2 rounded-lg border font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 ${isModified ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA / Mois</span>
                                                    </div>
                                                )}

                                                {/* MODE DYNAMIC */}
                                                {activeMode === 'DYNAMIC' && (
                                                    <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100 grid grid-cols-2 gap-3">
                                                        {ACADEMIC_MONTHS.map(month => (
                                                            <div key={month} className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-purple-800 mb-1">{month.split(' ')[0]}</span>
                                                                <div className="relative">
                                                                    <input 
                                                                        type="number"
                                                                        value={currentValues.customSchedule?.[month] || 0}
                                                                        onChange={(e) => handleScheduleItemChange(className, month, e.target.value)}
                                                                        className="w-full pl-3 pr-6 py-1.5 text-xs font-bold border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500 bg-white text-gray-800 shadow-sm outline-none"
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">F</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* MODE DEFAULT (PREVIEW) */}
                                                {activeMode === 'DEFAULT' && (
                                                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
                                                        <p className="font-bold mb-1 text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3"/> Échéancier Global (Aperçu) :</p>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 opacity-70">
                                                            {Object.entries(GLOBAL_CONFIG.monthlySchedule).slice(0, 6).map(([m, amt]) => (
                                                                <div key={m} className="flex justify-between">
                                                                    <span>{m.split(' ')[0]}</span>
                                                                    <span className="font-mono">{amt.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {isModified && (
                                                <button 
                                                    onClick={() => handleSave(className)}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                >
                                                    <Save className="w-4 h-4" /> Sauvegarder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
          </div>

      </div>
    </div>
  );
};

export default TuitionRules;
