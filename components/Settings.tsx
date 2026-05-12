
import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, Check, Bell, DollarSign, Clock, Shield, AlertTriangle, 
  Lock, CalendarRange, Cpu, Trash2, Database, Image as ImageIcon, 
  Upload, Key, Building2, Fingerprint, ChevronRight, CreditCard, Server, Calculator, Hash, User, Copy
} from 'lucide-react';
import { updateGlobalFees, GLOBAL_CONFIG, ACADEMIC_MONTHS, resetDatabase, initializeDefaultData, subscribeToDataChanges } from '../services/dataService';
import LegalDocs from './LegalDocs';
import { useToast } from '../contexts/ToastContext';
import { User as UserType } from '../types';

type SettingsTab = 'GENERAL' | 'FINANCE' | 'ACCESS' | 'SYSTEM';

const Settings: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');
  const [showLegal, setShowLegal] = useState<'PRIVACY' | 'TERMS' | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addToast } = useToast();

  // Configuration State
  const [instName, setInstName] = useState(GLOBAL_CONFIG.institutionName || 'UCAO / ISG');
  const [logoUrl, setLogoUrl] = useState(GLOBAL_CONFIG.logoUrl || '');
  
  const [regFee, setRegFee] = useState(GLOBAL_CONFIG.registrationFee);
  const [monthlySchedule, setMonthlySchedule] = useState<Record<string, number>>({...GLOBAL_CONFIG.monthlySchedule});
  const [gracePeriod, setGracePeriod] = useState(GLOBAL_CONFIG.gracePeriodDays);
  // Force VERIFICATION mode as Identification is deprecated
  const [bioMode, setBioMode] = useState<'IDENTIFICATION' | 'VERIFICATION'>('VERIFICATION');

  // Init Data
  useEffect(() => {
    // Initial fetch
    setInstName(GLOBAL_CONFIG.institutionName || 'UCAO / ISG');
    setLogoUrl(GLOBAL_CONFIG.logoUrl || '');
    setRegFee(GLOBAL_CONFIG.registrationFee);
    setMonthlySchedule({...GLOBAL_CONFIG.monthlySchedule});
    setGracePeriod(GLOBAL_CONFIG.gracePeriodDays);

    // Subscription
    const unsubscribe = subscribeToDataChanges(() => {
        setInstName(GLOBAL_CONFIG.institutionName || 'UCAO / ISG');
        setLogoUrl(GLOBAL_CONFIG.logoUrl || '');
        setRegFee(GLOBAL_CONFIG.registrationFee);
        setMonthlySchedule({...GLOBAL_CONFIG.monthlySchedule});
        setGracePeriod(GLOBAL_CONFIG.gracePeriodDays);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = () => {
      // Save settings (idPrefix removed from UI, passing existing/default)
      updateGlobalFees(regFee, monthlySchedule, gracePeriod, bioMode, instName, logoUrl, undefined, undefined, GLOBAL_CONFIG.studentIdPrefix);
      
      addToast('Configuration sauvegardée.', 'SUCCESS');
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleScheduleChange = (month: string, amount: number) => {
      setMonthlySchedule(prev => ({
          ...prev,
          [month]: amount
      }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (file.size > 500000) { // Limit 500KB
              addToast("L'image est trop lourde. Max 500Ko.", 'ERROR');
              return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setLogoUrl(ev.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleResetDatabase = () => {
      if(window.confirm("ATTENTION : ACTION DESTRUCTRICE !\n\nCela va effacer TOUS les étudiants, logs et départements de la base de données.\n\nÊtes-vous sûr ?")) {
          resetDatabase();
          addToast('Base de données remise à zéro.', 'WARNING');
      }
  };

  const handleInitializeData = () => {
       if(window.confirm("Installer les données de démo (Départements Informatique, Gestion...) ?")) {
          initializeDefaultData();
          addToast('Structure académique installée.', 'SUCCESS');
       }
  };

  const NavItem = ({ id, label, icon: Icon, subLabel }: { id: SettingsTab, label: string, icon: any, subLabel: string }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center justify-between group ${activeTab === id ? 'bg-white shadow-md border border-slate-100' : 'hover:bg-white/50 border border-transparent'}`}
      >
          <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg transition-colors ${activeTab === id ? 'bg-[#1a237e] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                  <Icon className="w-5 h-5" />
              </div>
              <div>
                  <span className={`block text-sm font-bold ${activeTab === id ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
                  <span className="block text-[10px] text-slate-400 font-medium">{subLabel}</span>
              </div>
          </div>
          {activeTab === id && <ChevronRight className="w-4 h-4 text-[#1a237e]" />}
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 pb-6 animate-fade-in relative">
      
      {/* Top Bar with Save Action */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Paramètres</h2>
          <p className="text-sm text-slate-500">Configuration globale de l'application</p>
        </div>
        <button 
            onClick={handleSaveSettings}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all transform active:scale-95 ${showSaveSuccess ? 'bg-emerald-600 shadow-emerald-200' : 'bg-[#1a237e] hover:bg-blue-800 shadow-blue-900/20'}`}
        >
            {showSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {showSaveSuccess ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0">
              <NavItem id="GENERAL" label="Établissement" subLabel="Identité & Logo" icon={Building2} />
              <NavItem id="FINANCE" label="Finances" subLabel="Frais & Échéancier" icon={CreditCard} />
              <NavItem id="ACCESS" label="Contrôle d'Accès" subLabel="Biométrie & Règles" icon={Fingerprint} />
              {(currentUser.role === 'GHOST' || (currentUser.role === 'ADMIN' && currentUser.matricule === 'ADMIN')) && (
                <NavItem id="SYSTEM" label="Système & Sécurité" subLabel="Admin & Maintenance" icon={Server} />
              )}
              
              <div className="mt-auto pt-6 border-t border-slate-200/60 px-2">
                  <button onClick={() => setShowLegal('PRIVACY')} className="text-xs text-slate-400 hover:text-[#1a237e] hover:underline flex items-center gap-2 mb-2">
                      <Lock className="w-3 h-3" /> Politique de Confidentialité
                  </button>
                  <p className="text-[10px] text-slate-300">v1.3.0 • Secure Build</p>
              </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-y-auto custom-scrollbar relative">
              
              {/* TAB: GENERAL */}
              {activeTab === 'GENERAL' && (
                  <div className="space-y-8 animate-fade-in">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Identité Visuelle</h3>
                          <p className="text-sm text-slate-500 mb-6">Personnalisez l'apparence de l'application pour votre établissement.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom de l'institution</label>
                                  <div className="relative mb-6">
                                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                      <input 
                                        type="text" 
                                        value={instName}
                                        onChange={(e) => setInstName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1a237e] transition-all"
                                        placeholder="Ex: UCAO / ISG"
                                      />
                                  </div>

                                  {/* Préfixe Matricule retiré car génération numérique désormais */}
                                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                      <p className="text-xs text-blue-800 font-bold mb-1">Information</p>
                                      <p className="text-xs text-blue-600">
                                          Le système utilise désormais une génération automatique de matricules numériques (ex: 1060101) pour simplifier la saisie.
                                      </p>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo</label>
                                  <div className="flex items-center gap-6">
                                      <div className="w-20 h-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center p-2 relative overflow-hidden group">
                                          {logoUrl ? (
                                              <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
                                          ) : (
                                              <ImageIcon className="w-8 h-8 text-slate-300" />
                                          )}
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <Upload className="w-6 h-6 text-white" />
                                          </div>
                                          <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleLogoUpload} 
                                            className="absolute inset-0 cursor-pointer opacity-0" 
                                            accept="image/*"
                                          />
                                      </div>
                                      <div className="flex-1">
                                          <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm font-bold text-[#1a237e] hover:underline"
                                          >
                                              Télécharger un logo
                                          </button>
                                          <p className="text-xs text-slate-400 mt-1">Recommandé: PNG transparent, max 500Ko.</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* TAB: FINANCE */}
              {activeTab === 'FINANCE' && (
                  <div className="space-y-8 animate-fade-in">
                       <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Politique Tarifaire</h3>
                          <p className="text-sm text-slate-500 mb-6">Définissez les montants standards pour les nouvelles inscriptions.</p>

                          <div className="mb-8">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Frais d'Inscription (Annuel)</label>
                                <div className="relative max-w-sm">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                                    <input 
                                        type="number" 
                                        value={regFee}
                                        onChange={(e) => setRegFee(Number(e.target.value))}
                                        className="w-full pl-10 pr-12 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">FCFA</span>
                                </div>
                          </div>

                          <div className="border-t border-slate-100 pt-6">
                              <div className="flex items-center gap-2 mb-4">
                                  <CalendarRange className="w-5 h-5 text-slate-400" />
                                  <h4 className="font-bold text-slate-700">Échéancier Mensuel</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {ACADEMIC_MONTHS.map((month) => (
                                      <div key={month} className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200 focus-within:ring-2 focus-within:ring-[#1a237e] transition-all">
                                          <div className="px-3 py-2 text-xs font-bold text-slate-500 w-24 shrink-0 truncate border-r border-slate-200">
                                              {month.split(' ')[0]}
                                          </div>
                                          <input 
                                              type="number"
                                              value={monthlySchedule[month] || 0}
                                              onChange={(e) => handleScheduleChange(month, Number(e.target.value))}
                                              className="w-full bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 text-right pr-2"
                                          />
                                          <span className="text-xs text-slate-400 pr-2">F</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                       </div>
                  </div>
              )}

              {/* TAB: ACCESS */}
              {activeTab === 'ACCESS' && (
                  <div className="space-y-8 animate-fade-in">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Mode Biométrique</h3>
                          <p className="text-sm text-slate-500 mb-6">Paramétrage du lecteur d'empreintes.</p>
                          
                          <div className="mb-8">
                                <div 
                                    className="relative p-5 rounded-xl border-2 border-[#1a237e] bg-blue-50/50 transition-all cursor-default"
                                >
                                    <div className="absolute top-3 right-3 text-[#1a237e]"><Check className="w-5 h-5" /></div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100"><Cpu className="w-5 h-5 text-blue-600" /></div>
                                        <span className="font-bold text-slate-800">Vérification (1:1) - Mode Standard</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        L'étudiant saisit son ID puis pose son doigt. Ce mode permet une capacité illimitée d'étudiants et garantit une rapidité de traitement optimale pour l'université.
                                    </p>
                                </div>
                          </div>

                          <div className="border-t border-slate-100 pt-6">
                              <h3 className="text-lg font-bold text-slate-800 mb-1">Règles de Tolérance</h3>
                              <p className="text-sm text-slate-500 mb-4">Combien de jours de retard de paiement sont tolérés avant le blocage ?</p>
                              
                              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 max-w-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                                            <Clock className="w-5 h-5" />
                                            <span>Période de grâce</span>
                                        </div>
                                        <span className="text-2xl font-black text-amber-600">{gracePeriod} Jours</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" max="30" 
                                        value={gracePeriod}
                                        onChange={(e) => setGracePeriod(Number(e.target.value))}
                                        className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-amber-700/60 font-bold mt-2">
                                        <span>0 (Immédiat)</span>
                                        <span>30 Jours</span>
                                    </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* TAB: SYSTEM */}
              {activeTab === 'SYSTEM' && (currentUser.role === 'GHOST' || (currentUser.role === 'ADMIN' && currentUser.matricule === 'ADMIN')) && (
                  <div className="space-y-8 animate-fade-in">
                      
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                          <p>
                              <strong>Note :</strong> La gestion des comptes administrateurs et comptables (création, modification de mot de passe, suppression) se fait désormais exclusivement via le menu <strong className="font-bold">"Gestion Utilisateurs"</strong> accessible dans la barre latérale.
                          </p>
                      </div>

                      {/* Danger Zone */}
                      <div className="border border-red-100 rounded-xl overflow-hidden">
                          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              <h4 className="font-bold text-red-900">Zone de Danger</h4>
                          </div>
                          <div className="p-6 bg-white space-y-4">
                              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                  <div>
                                      <h5 className="font-bold text-slate-700 text-sm">Initialiser les données</h5>
                                      <p className="text-xs text-slate-500">Crée les départements par défaut si la base est vide.</p>
                                  </div>
                                  <button onClick={handleInitializeData} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100">
                                      <Database className="w-3 h-3 inline mr-1" /> Installer
                                  </button>
                              </div>

                              <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50/30 rounded-lg">
                                  <div>
                                      <h5 className="font-bold text-red-900 text-sm">Réinitialisation Complète</h5>
                                      <p className="text-xs text-red-700/70">Supprime définitivement tous les étudiants et l'historique.</p>
                                  </div>
                                  <button onClick={handleResetDatabase} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 shadow-sm">
                                      <Trash2 className="w-3 h-3 inline mr-1" /> Tout Effacer
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>

      {showLegal && (
        <LegalDocs 
          initialTab={showLegal} 
          onClose={() => setShowLegal(null)} 
        />
      )}
    </div>
  );
};

export default Settings;
