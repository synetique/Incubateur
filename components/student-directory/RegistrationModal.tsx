import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Users, GraduationCap, Fingerprint, X, Check, Smartphone, DollarSign, Wifi, Ban, RefreshCw, AlertTriangle } from 'lucide-react';
import { Student, DepartmentStructure } from '../../types';
import { addStudent, GLOBAL_CONFIG, subscribeToHardware, updateHardwareState } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';

interface RegistrationModalProps {
  onClose: () => void;
  departments: DepartmentStructure[];
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ onClose, departments }) => {
  const [regStep, setRegStep] = useState(1);
  const [isEnrollingBio, setIsEnrollingBio] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'IDLE' | 'WAITING' | 'step1' | 'step2' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [deviceConnected, setDeviceConnected] = useState(false);

  const lastHeartbeatRef   = useRef<number>(0);
  const lastHeartbeatValue = useRef<number>(0);

  // FIX STALE CLOSURE : Ref stable pour isEnrollingBio
  const isEnrollingBioRef = useRef(false);
  useEffect(() => {
    isEnrollingBioRef.current = isEnrollingBio;
  }, [isEnrollingBio]);

  const { addToast } = useToast();

  const [newStudent, setNewStudent] = useState<Partial<Student> & { customRegistrationFee?: number }>({
    firstName: '', lastName: '', email: '', phone: '', gender: 'M', address: '', birthDate: '',
    placeOfBirth: '', nationality: '', maritalStatus: 'SINGLE', idCardNumber: '',
    city: '',
    guardianName: '', guardianPhone: '', guardianRelation: '',
    department: '', major: '', className: '',
    previousSchool: '', bacSeries: '', bacYear: '',
    bloodType: '', medicalInfo: '',
    biometricId: '',
    customRegistrationFee: GLOBAL_CONFIG.registrationFee,
  });

  // ============================================================
  // Listener Firebase stable — monté UNE SEULE FOIS
  // ============================================================
  useEffect(() => {
    const unsubscribe = subscribeToHardware((data) => {
      if (!data) return;

      // Heartbeat watchdog
      if (data.last_heartbeat !== undefined) {
        const hb = Number(data.last_heartbeat);
        if (hb !== lastHeartbeatValue.current) {
          lastHeartbeatValue.current = hb;
          lastHeartbeatRef.current   = Date.now();
          setDeviceConnected(true);
        }
      }

      if (!isEnrollingBioRef.current) return;

      const status = data.status;

      if (status === 'ENROLL_STEP_1') {
        setEnrollmentStatus('step1');
      }
      else if (status === 'ENROLL_STEP_2') {
        setEnrollmentStatus('step2');
      }
      else if (status === 'SUCCESS') {
        const gid = data.generated_id;

        // FIX : Valeurs à ignorer — résidus Firebase
        // "NONE"  = valeur sentinelle envoyée par l'ESP32 au reset
        // "0"     = valeur résiduelle d'une ancienne session
        // null/undefined/'' = champ absent ou vide
        const isValidId = gid && gid !== 'NONE' && gid !== '0' && gid !== 'null';

        if (isValidId) {
          setEnrollmentStatus('SUCCESS');
          setNewStudent(prev => ({ ...prev, biometricId: String(gid) }));
          addToast('Empreinte biométrique capturée avec succès.', 'SUCCESS');
          isEnrollingBioRef.current = false;
          setIsEnrollingBio(false);
        }
      }
      else if (status === 'FAILED') {
        setEnrollmentStatus('ERROR');
        addToast("Échec de la capture de l'empreinte. Réessayez.", 'ERROR');
        isEnrollingBioRef.current = false;
        setIsEnrollingBio(false);
      }
      else if (status === 'TIMEOUT') {
        setEnrollmentStatus('ERROR');
        addToast("Délai dépassé. Réessayez l'enrôlement.", 'ERROR');
        isEnrollingBioRef.current = false;
        setIsEnrollingBio(false);
      }
    });

    // Heartbeat watchdog — déconnecté si aucun heartbeat reçu depuis 15s
    const interval = setInterval(() => {
      if (lastHeartbeatRef.current === 0) {
        setDeviceConnected(false);
        return;
      }
      setDeviceConnected((Date.now() - lastHeartbeatRef.current) < 15000);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []); // ← VIDE : jamais recréé

  const availableMajors = useMemo(() => {
    const dept = departments.find(d => d.name === newStudent.department);
    return dept ? dept.majors : [];
  }, [newStudent.department, departments]);

  const availableClasses = useMemo(() => {
    const maj = availableMajors.find(m => m.name === newStudent.major);
    return maj ? maj.classes : [];
  }, [newStudent.major, availableMajors]);

  // ============================================================
  // Démarrage enrôlement — reset complet de Firebase d'abord
  // ============================================================
  const startBiometricEnrollment = () => {
    setEnrollmentStatus('WAITING');
    isEnrollingBioRef.current = true;
    setIsEnrollingBio(true);

    // On remet à SCAN d'abord pour forcer l'ESP32 à détecter
    // le changement de mode SCAN → ENROLL
    updateHardwareState({
      mode: 'SCAN',
      status: 'IDLE',
      generated_id: 'NONE',   // Sentinelle — sera ignorée par le listener
      scanned_biometric_id: 'WAITING',
      target_slot: 0,
      last_heartbeat: Date.now(),
    });

    // Léger délai pour que Firebase propage le reset
    // avant d'envoyer le vrai mode ENROLL
    setTimeout(() => {
      updateHardwareState({
        mode: 'ENROLL',
        status: 'IDLE',
        generated_id: 'NONE',
        target_slot: 0,
        last_heartbeat: Date.now(),
      });
    }, 500);
  };

  const cancelBiometricEnrollment = () => {
    isEnrollingBioRef.current = false;
    setIsEnrollingBio(false);
    setEnrollmentStatus('IDLE');

    updateHardwareState({
      mode: 'SCAN',
      status: 'IDLE',
      generated_id: 'NONE',
      scanned_biometric_id: 'WAITING',
      target_slot: 0,
      last_heartbeat: Date.now(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep < 4) {
      setRegStep(prev => prev + 1);
      return;
    }
    updateHardwareState({
      mode: 'SCAN',
      status: 'IDLE',
      generated_id: 'NONE',
      scanned_biometric_id: 'WAITING',
      target_slot: 0,
      last_heartbeat: Date.now(),
    });
    addStudent(newStudent);
    addToast(`Inscription de ${newStudent.firstName} ${newStudent.lastName} effectuée !`, 'SUCCESS');
    onClose();
  };

  const inputClass = "w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-[#1a237e]";
  const labelClass = "block text-xs font-bold text-gray-700 uppercase mb-1";

  const Steps = [
    { id: 1, title: 'État Civil',           icon: User },
    { id: 2, title: 'Contacts & Tuteurs',   icon: Users },
    { id: 3, title: 'Académique',           icon: GraduationCap },
    { id: 4, title: 'Paiement & Biométrie', icon: Fingerprint },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-[#1a237e]" />
              Dossier d'Inscription
            </h2>
            <p className="text-xs text-gray-500">Nouvelle admission</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex border-b border-gray-200 shrink-0 overflow-x-auto bg-white">
          {Steps.map((s) => (
            <div
              key={s.id}
              className={`flex-1 min-w-[120px] py-3 text-center text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors
                ${regStep >= s.id ? 'border-[#1a237e] text-[#1a237e]' : 'border-transparent text-gray-400'}`}
            >
              <s.icon className={`w-5 h-5 ${regStep >= s.id ? 'text-[#1a237e]' : 'text-gray-300'}`} />
              {s.title}
            </div>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">

          {/* ÉTAPE 1 — État Civil */}
          {regStep === 1 && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Identité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Prénom(s)</label><input required className={inputClass} value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} placeholder="Ex: Cheikh" /></div>
                  <div><label className={labelClass}>Nom</label><input required className={inputClass} value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} placeholder="Ex: DIOP" /></div>
                  <div><label className={labelClass}>Date de Naissance</label><input required type="date" className={inputClass} value={newStudent.birthDate} onChange={e => setNewStudent({...newStudent, birthDate: e.target.value})} /></div>
                  <div><label className={labelClass}>Lieu</label><input required className={inputClass} value={newStudent.placeOfBirth} onChange={e => setNewStudent({...newStudent, placeOfBirth: e.target.value})} placeholder="Ex: Dakar" /></div>
                  <div>
                    <label className={labelClass}>Genre</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="gender" value="M" checked={newStudent.gender === 'M'} onChange={() => setNewStudent({...newStudent, gender: 'M'})} /> Masculin</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="gender" value="F" checked={newStudent.gender === 'F'} onChange={() => setNewStudent({...newStudent, gender: 'F'})} /> Féminin</label>
                    </div>
                  </div>
                  <div><label className={labelClass}>Nationalité</label><input className={inputClass} value={newStudent.nationality} onChange={e => setNewStudent({...newStudent, nationality: e.target.value})} /></div>
                  <div><label className={labelClass}>Ville de résidence</label><input className={inputClass} value={newStudent.city} onChange={e => setNewStudent({...newStudent, city: e.target.value})} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Contacts & Tuteurs */}
          {regStep === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-green-600" /> Contact Étudiant
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Email</label><input required type="email" className={inputClass} value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} placeholder="etudiant@ucao.edu" /></div>
                  <div><label className={labelClass}>Téléphone</label><input required className={inputClass} value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} placeholder="77 000 00 00" /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Adresse Complète</label><input className={inputClass} value={newStudent.address} onChange={e => setNewStudent({...newStudent, address: e.target.value})} placeholder="Quartier, Rue, Lot..." /></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" /> Tuteur Légal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className={labelClass}>Lien de parenté</label><input className={inputClass} value={newStudent.guardianRelation} onChange={e => setNewStudent({...newStudent, guardianRelation: e.target.value})} placeholder="Ex: Père" /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Nom Complet du Tuteur</label><input required className={inputClass} value={newStudent.guardianName} onChange={e => setNewStudent({...newStudent, guardianName: e.target.value})} placeholder="Nom Prénoms" /></div>
                  <div className="md:col-span-3"><label className={labelClass}>Téléphone Urgence</label><input required className={inputClass} value={newStudent.guardianPhone} onChange={e => setNewStudent({...newStudent, guardianPhone: e.target.value})} placeholder="77 000 00 00" /></div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Académique */}
          {regStep === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#1a237e]">
                <h3 className="font-bold text-[#1a237e] mb-4 border-b pb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Inscription Académique
                </h3>
                {departments.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center space-y-4">
                    <div className="inline-flex p-3 bg-amber-100 rounded-full text-amber-600 mb-2"><AlertTriangle className="w-8 h-8" /></div>
                    <h3 className="text-lg font-bold text-amber-900">Structure Académique Manquante</h3>
                    <p className="text-sm text-amber-800 max-w-md mx-auto">Impossible de procéder à l'inscription académique car aucun département n'a été configuré.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className={labelClass}>Département</label>
                      <select required className={`${inputClass} mb-4`} value={newStudent.department} onChange={e => setNewStudent({...newStudent, department: e.target.value, major: '', className: ''})}>
                        <option value="">Sélectionner un département...</option>
                        {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Filière</label>
                        <select required disabled={!newStudent.department} className={inputClass} value={newStudent.major} onChange={e => setNewStudent({...newStudent, major: e.target.value, className: ''})}>
                          <option value="">Sélectionner...</option>
                          {availableMajors.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Classe</label>
                        <select required disabled={!newStudent.major} className={inputClass} value={newStudent.className} onChange={e => setNewStudent({...newStudent, className: e.target.value})}>
                          <option value="">Sélectionner...</option>
                          {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Paiement & Biométrie */}
          {regStep === 4 && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Tarification
                </h3>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <label className="block text-xs font-bold uppercase text-emerald-800 mb-1">Frais d'Inscription (Annuel)</label>
                  <input
                    type="number"
                    className="w-full h-10 px-3 border border-emerald-200 rounded-lg bg-white text-emerald-900 font-bold text-lg"
                    value={newStudent.customRegistrationFee}
                    onChange={e => setNewStudent({...newStudent, customRegistrationFee: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center relative">
                {isEnrollingBio && (
                  <button type="button" onClick={cancelBiometricEnrollment}
                    className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-full flex items-center gap-1 text-xs font-bold">
                    <Ban className="w-4 h-4" /> Annuler
                  </button>
                )}

                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-[#1a237e]" /> Enrôlement Biométrique
                  </h4>
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full
                    ${deviceConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    <Wifi className="w-3 h-3" />
                    {deviceConnected ? 'CONNECTÉ' : 'DÉCONNECTÉ'}
                  </div>
                </div>

                {enrollmentStatus === 'IDLE' && (
                  <div className="py-4">
                    <button type="button" onClick={startBiometricEnrollment}
                      className="bg-[#1a237e] hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-blue-900/20">
                      Lancer l'enrôlement biométrique
                    </button>
                  </div>
                )}
                {enrollmentStatus === 'WAITING' && (
                  <div className="flex flex-col items-center py-6">
                    <RefreshCw className="w-16 h-16 text-blue-400 mb-4 animate-spin" />
                    <p className="text-blue-800 font-bold">EN ATTENTE DE L'ESP32...</p>
                    <p className="text-blue-500 text-xs mt-1">Posez votre doigt sur le capteur</p>
                  </div>
                )}
                {enrollmentStatus === 'step1' && (
                  <div className="flex flex-col items-center py-6">
                    <Fingerprint className="w-16 h-16 text-orange-500 mb-4 animate-pulse" />
                    <p className="text-orange-800 font-bold">POSEZ LE DOIGT (1/2)</p>
                    <p className="text-orange-500 text-xs mt-1">Maintenez jusqu'au bip</p>
                  </div>
                )}
                {enrollmentStatus === 'step2' && (
                  <div className="flex flex-col items-center py-6">
                    <Fingerprint className="w-16 h-16 text-orange-500 mb-4 animate-pulse" />
                    <p className="text-orange-800 font-bold">REPOSEZ LE MÊME DOIGT (2/2)</p>
                    <p className="text-orange-500 text-xs mt-1">Pour confirmation</p>
                  </div>
                )}
                {enrollmentStatus === 'SUCCESS' && (
                  <div className="flex flex-col items-center py-4 text-emerald-600 bg-emerald-50 rounded-lg">
                    <Check className="w-12 h-12 mb-2" />
                    <p className="font-bold">Empreinte validée !</p>
                    <p className="font-mono text-xs">ID Biométrique : {newStudent.biometricId}</p>
                  </div>
                )}
                {enrollmentStatus === 'ERROR' && (
                  <div className="flex flex-col items-center py-4 text-red-600 bg-red-50 rounded-lg">
                    <X className="w-12 h-12 mb-2" />
                    <p className="font-bold">Erreur du capteur.</p>
                    <button type="button" onClick={() => setEnrollmentStatus('IDLE')}
                      className="mt-2 text-sm underline text-red-500 hover:text-red-700">
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between shrink-0">
          <button onClick={() => regStep > 1 ? setRegStep(prev => prev - 1) : onClose()}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50">
            Précédent
          </button>
          <div className="text-xs text-gray-500 flex items-center font-medium">Étape {regStep} sur 4</div>
          <button
            onClick={handleSubmit}
            disabled={
              (regStep === 4 && enrollmentStatus !== 'SUCCESS') ||
              (regStep === 3 && departments.length === 0)
            }
            className="px-6 py-2 bg-[#1a237e] text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-blue-800 shadow-md"
          >
            {regStep === 4 ? <><Check className="w-5 h-5" /> Finaliser</> : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;