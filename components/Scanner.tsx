import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fingerprint, Scan, CheckCircle, XCircle, RefreshCw, Server, Wifi, Clock, History, ShieldAlert, Activity, Zap, Radio } from 'lucide-react';
import { addAccessLog, getAccessLogs, GLOBAL_CONFIG, subscribeToHardware, updateHardwareState, subscribeToDataChanges, ALL_STUDENTS, calculateStudentStatus } from '../services/dataService';
import { Student, PaymentStatus, AccessLog } from '../types';

const getRelativeTime = (timestamp: string, now: number) => {
    const diff    = now - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);

    if (seconds < 60) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24)   return `Il y a ${hours} h`;
    return new Date(timestamp).toLocaleDateString();
};

const Scanner: React.FC = () => {
  const [isScanning, setIsScanning]         = useState(false);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [scanResult, setScanResult]         = useState<'IDLE' | 'SUCCESS' | 'WARNING' | 'DENIED'>('IDLE');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [logs, setLogs]       = useState<AccessLog[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const isProcessingRef  = useRef(false);
  const lastHeartbeatRef = useRef<number>(0);

  const [now, setNow]       = useState(Date.now());
  const [bioMode, setBioMode] = useState(GLOBAL_CONFIG.biometricMode || 'VERIFICATION');

  // --- INIT & DATA ---
  useEffect(() => {
    setLogs(getAccessLogs());
    const timeInterval = setInterval(() => setNow(Date.now()), 30000);
    const unsubscribeData = subscribeToDataChanges(() => {
        setBioMode(GLOBAL_CONFIG.biometricMode || 'VERIFICATION');
        setLogs(getAccessLogs());
    });
    return () => {
        unsubscribeData();
        clearInterval(timeInterval);
    };
  }, []);

  const recentLogs = useMemo(() => {
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      return logs.filter(l => new Date(l.timestamp).getTime() > oneDayAgo);
  }, [logs, now]);

  // --- ÉCOUTE MATÉRIEL (ESP32) ---
  useEffect(() => {
    const unsubscribe = subscribeToHardware((data) => {
        if (!data) return;

        if (data.last_heartbeat) {
            lastHeartbeatRef.current = data.last_heartbeat;
            setDeviceConnected(true);
        }

        if (
          data.scanned_biometric_id &&
          data.scanned_biometric_id !== 'WAITING' &&
          data.scanned_biometric_id !== 'NONE' &&  // FIX : ignore la sentinelle
          !isProcessingRef.current
        ) {
            console.log(">> SIGNAL REÇU DE L'ESP32 :", data.scanned_biometric_id);
            handleRealScan(data.scanned_biometric_id);
        }
    });

    const connectionCheckInterval = setInterval(() => {
        const timeSinceLastBeat = Date.now() - lastHeartbeatRef.current;
        setDeviceConnected(timeSinceLastBeat < 20000);
    }, 5000);

    return () => {
        unsubscribe();
        clearInterval(connectionCheckInterval);
    };
  }, []);

  const handleRealScan = async (rawBiometricId: string) => {
    isProcessingRef.current = true;
    setIsScanning(true);
    setErrorMsg('');
    setScannedStudent(null);
    setScanResult('IDLE');

    const cleanId = rawBiometricId.trim();

    const student = ALL_STUDENTS.find(s =>
        (s.biometricId && s.biometricId.toString() === cleanId) ||
        (s.biometricId && `FP_${s.biometricId}` === cleanId) ||
        (s.biometricId && s.biometricId === cleanId.replace('FP_', ''))
    );

    if (!student) {
        console.warn(`ID Inconnu reçu du capteur: ${cleanId}`);
        setErrorMsg(`Empreinte #${cleanId} non reconnue.`);
        setIsScanning(false);
        updateHardwareState({ scanned_biometric_id: 'WAITING' });
        setTimeout(() => { isProcessingRef.current = false; }, 2000);
        return;
    }

    console.log(">> ÉTUDIANT IDENTIFIÉ :", student.firstName, student.lastName);
    setScannedStudent(student);
    setIsScanning(false);

    // =========================================================
    // FIX CRITIQUE : Recalcul du statut EN TEMPS RÉEL
    //
    // Ne JAMAIS utiliser student.status (valeur en cache Firebase
    // qui peut être désynchronisée). On recalcule à partir des
    // données fraîches de paiement directement au moment du scan.
    //
    // Cas problématique sans ce fix :
    //   - Étudiant inscrit → registration.status = 'PENDING'
    //   - Firebase met quelques ms à propager
    //   - Le scan lit student.status = WARNING (ancien cache)
    //   - Résultat : accès autorisé à tort !
    // =========================================================
    const liveStatus = calculateStudentStatus(student);
    console.log(`>> STATUT RECALCULÉ : ${student.status} (cache) → ${liveStatus} (live)`);

    let accessStatus: 'GRANTED' | 'DENIED' | 'WARNING' = 'DENIED';
    let reason = '';

    if (liveStatus === PaymentStatus.PAID) {
        setScanResult('SUCCESS');
        accessStatus = 'GRANTED';
        reason = 'En règle';
    } else if (liveStatus === PaymentStatus.WARNING) {
        setScanResult('WARNING');
        accessStatus = 'WARNING';
        reason = `Période de grâce (${GLOBAL_CONFIG.gracePeriodDays} jours)`;
    } else {
        // OVERDUE — aucun paiement ou inscription non réglée
        setScanResult('DENIED');
        accessStatus = 'DENIED';
        reason = student.registration?.status !== 'PAID'
            ? 'Frais d\'inscription non réglés'
            : 'Mensualités impayées';
    }

    addAccessLog(student, accessStatus, reason);
    updateHardwareState({ scanned_biometric_id: 'WAITING' });

    setTimeout(() => { isProcessingRef.current = false; }, 2500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-fade-in relative">

      {/* Barre de Statut Matériel */}
      <div className="bg-white rounded-xl p-3 px-6 shadow-sm border border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
             <Server className="w-5 h-5 text-gray-500" />
             <span className="text-sm font-medium text-gray-700">Contrôleur UCAO:</span>
             <span className="text-sm text-emerald-600 font-bold">En Ligne</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                <ShieldAlert className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-800 uppercase font-bold">Mode:</span>
                <span className="text-xs font-bold text-blue-600">
                    {bioMode === 'VERIFICATION' ? 'VÉRIFICATION 1:1' : 'IDENTIFICATION 1:N'}
                </span>
             </div>
             <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${deviceConnected ? 'text-emerald-500 animate-pulse' : 'text-[#c62828]'}`} />
                <span className={`text-sm font-bold uppercase ${deviceConnected ? 'text-emerald-600' : 'text-[#c62828]'}`}>
                    Lecteur Optique: {deviceConnected ? 'CONNECTÉ' : 'HORS LIGNE'}
                </span>
                {deviceConnected && (
                    <span className="flex h-2 w-2 relative ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                )}
             </div>
          </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* Colonne Gauche: Historique */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <History className="w-4 h-4" /> Flux Temps Réel
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-slate-50/50">
                {recentLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center p-6">
                        <Activity className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-sm font-medium">Aucun passage détecté <br/>ces dernières 24h.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentLogs.map((log, index) => (
                            <div key={log.id} className={`p-3 hover:bg-white transition-colors flex items-start gap-3 ${index === 0 ? 'bg-blue-50/30' : ''}`}>
                                <div className="flex flex-col items-center gap-1 mt-1">
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${log.status === 'GRANTED' ? 'bg-emerald-500' : log.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    {index !== recentLogs.length - 1 && <div className="w-px h-full bg-gray-200 my-1"></div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-bold text-gray-800 truncate">{log.studentName}</p>
                                        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">
                                            {getRelativeTime(log.timestamp, now)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div className="mt-1.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${log.status === 'GRANTED' ? 'bg-emerald-100 text-emerald-700' : log.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {log.status === 'GRANTED' ? 'OK' : log.status === 'WARNING' ? 'AVERT.' : 'REFUS'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Centre: Visualisation Scanner */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden h-full group select-none border-2 border-slate-700">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

          <div className="relative z-10 text-center space-y-10 w-full flex flex-col items-center">
            <div className="flex flex-col items-center gap-2">
                {deviceConnected ? (
                    <div className="flex items-center gap-2 animate-pulse">
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <h2 className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">SYNCHRONISATION ACTIVE</h2>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                         <Wifi className="w-5 h-5 text-red-500" />
                         <h2 className="text-red-400 text-xs font-bold tracking-[0.2em] uppercase">EN ATTENTE DE CONNEXION...</h2>
                    </div>
                )}
            </div>

            <div className={`
                relative w-56 h-56 rounded-full flex items-center justify-center
                border-[6px] transition-all duration-300 mx-auto bg-slate-900
                shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]
                ${isScanning
                  ? 'border-[#fbc02d] shadow-[0_0_80px_rgba(251,192,45,0.6)] scale-105'
                  : deviceConnected
                    ? 'border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-pulse-slow'
                    : 'border-red-900/50 opacity-50'
                }
              `}
            >
              {isScanning ? (
                  <RefreshCw className="w-24 h-24 text-[#fbc02d] animate-spin" />
              ) : (
                  <Fingerprint className={`w-28 h-28 transition-colors duration-500 ${deviceConnected ? 'text-emerald-500' : 'text-slate-700'}`} />
              )}
            </div>

            <div className="font-mono text-sm max-w-xs mx-auto min-h-[50px] flex flex-col items-center gap-2">
                {isScanning && <span className="text-[#fbc02d] animate-pulse font-bold tracking-widest text-lg">IDENTIFICATION...</span>}
                {!isScanning && deviceConnected && !errorMsg && (
                    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600 mb-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-emerald-300 text-xs font-bold tracking-wide">PRÊT À SCANNER</span>
                    </div>
                )}
                {!isScanning && !deviceConnected && (
                    <div className="bg-red-900/20 border border-red-500/30 px-4 py-2 rounded-lg text-red-400 text-xs font-bold animate-pulse">
                        Veuillez brancher l'ESP32.
                    </div>
                )}
                {errorMsg && (
                    <div className="bg-red-900/40 border border-red-500/50 px-6 py-3 rounded-lg text-red-300 text-sm font-bold flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> {errorMsg}
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Droite: Panneau de Résultat */}
        <div className="lg:col-span-4 h-full flex flex-col relative">
          {!scannedStudent && !isScanning && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl bg-gray-50/50 text-gray-400 p-6 text-center animate-fade-in">
              <Scan className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Scanner Prêt</p>
              <p className="text-xs mt-2 text-gray-400 max-w-[200px]">Posez le doigt sur le lecteur physique pour voir le profil.</p>
            </div>
          )}

          {scannedStudent && !isScanning && (
            <div className={`
              h-full rounded-3xl overflow-hidden shadow-2xl border-t-8 flex flex-col animate-fade-in-up
              ${scanResult === 'SUCCESS' ? 'border-emerald-500 bg-white' : ''}
              ${scanResult === 'WARNING'  ? 'border-amber-400  bg-white'  : ''}
              ${scanResult === 'DENIED'   ? 'border-rose-600   bg-rose-50' : ''}
            `}>
              <div className={`
                p-8 text-center text-white relative overflow-hidden
                ${scanResult === 'SUCCESS' ? 'bg-emerald-600' : ''}
                ${scanResult === 'WARNING'  ? 'bg-amber-500'   : ''}
                ${scanResult === 'DENIED'   ? 'bg-rose-600'    : ''}
              `}>
                <div className="relative z-10">
                    <div className="flex justify-center mb-3">
                        {scanResult === 'SUCCESS' && <CheckCircle className="w-20 h-20" />}
                        {scanResult === 'WARNING'  && <CheckCircle className="w-20 h-20" />}
                        {scanResult === 'DENIED'   && <XCircle    className="w-20 h-20" />}
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-widest">
                        {scanResult === 'SUCCESS' ? 'AUTORISÉ'  : ''}
                        {scanResult === 'WARNING'  ? 'AUTORISÉ (Grâce)' : ''}
                        {scanResult === 'DENIED'   ? 'REFUSÉ'   : ''}
                    </h2>
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center pt-10 relative">
                <img
                  src={scannedStudent.photoUrl}
                  alt="Student"
                  className="w-28 h-28 rounded-full border-4 border-white shadow-xl absolute -top-14 bg-gray-200 object-cover"
                />
                <div className="mt-12 text-center w-full">
                    <h3 className="text-2xl font-bold text-gray-800">{scannedStudent.firstName} {scannedStudent.lastName}</h3>
                    <p className="text-gray-500 font-mono text-sm mt-1">{scannedStudent.id}</p>

                    <div className="mt-6 space-y-3 w-full bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold">Département</span>
                            <span className="text-sm font-bold text-gray-800">{scannedStudent.department || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-500 uppercase font-bold">Classe</span>
                            <span className="text-sm font-bold text-gray-800">{scannedStudent.className || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Message de raison selon le résultat */}
                <div className="mt-auto w-full">
                    {scanResult === 'DENIED' && (
                        <div className="bg-white border-2 border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-sm text-center font-bold shadow-sm">
                            {scannedStudent.registration?.status !== 'PAID'
                                ? "⚠️ Frais d'inscription non réglés."
                                : "⚠️ Mensualités impayées."}
                        </div>
                    )}
                    {scanResult === 'WARNING' && (
                        <div className="bg-amber-50 border-2 border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-sm text-center font-bold shadow-sm">
                            ⏳ Période de grâce active ({GLOBAL_CONFIG.gracePeriodDays} jours).
                        </div>
                    )}
                    {scanResult === 'SUCCESS' && (
                        <div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm text-center font-bold shadow-sm">
                            ✅ Situation financière en règle.
                        </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;