
import React, { useState, useEffect } from 'react';
import { GraduationCap, ArrowRight, FileText, Lock, Eye, EyeOff, AlertCircle, User as UserIcon, HelpCircle } from 'lucide-react';
import { UserRole } from '../types';
import LegalDocs from './LegalDocs';
import { loginUser, subscribeToDataChanges, GLOBAL_CONFIG } from '../services/dataService';
import { useToast } from '../contexts/ToastContext';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [showLegal, setShowLegal] = useState(false);
  
  // Auth State
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic Identity
  const [config, setConfig] = useState(GLOBAL_CONFIG);

  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
        setConfig({...GLOBAL_CONFIG});
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
          // On passe le matricule et le mot de passe, le système détermine le rôle
          await loginUser(matricule, password);
          // Redirection gérée par App.tsx via le listener
      } catch (err: any) {
          console.error("Login Error:", err);
          setError(err.message || "Échec de l'authentification.");
          setIsLoading(false);
      }
  };

  const handleForgotPassword = () => {
      addToast("Veuillez contacter la Direction Générale pour réinitialiser vos accès.", "INFO");
  };

  return (
    <div 
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden select-none"
        onCopy={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-[#1a237e]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#c62828]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full flex flex-col md:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 min-h-[550px] animate-fade-in">
        
        {/* Left Side: Branding */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#1a237e] to-[#0d47a1] p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
               <GraduationCap className="w-64 h-64" />
           </div>

           <div className="z-10 relative">
               <div className="mb-10">
                   <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 inline-block">
                       <div className="flex items-center gap-3">
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
                            ) : (
                                <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center text-[#1a237e] font-bold text-xl border-b-4 border-yellow-400 shadow-lg">
                                    U
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-black text-xl tracking-tight leading-none uppercase">{config.institutionName || 'UCAO'}</span>
                                <span className="font-bold text-xs text-blue-200 leading-none mt-1">Access Control</span>
                            </div>
                       </div>
                   </div>
               </div>
               
               <h2 className="text-3xl font-light mb-4">Portail Sécurisé</h2>
               <p className="text-blue-100 leading-relaxed text-sm border-l-2 border-yellow-400 pl-4">
                   Accès réservé au personnel administratif et comptable. 
                   <br/><br/>
                   Veuillez vous identifier pour accéder au tableau de bord.
               </p>
           </div>

           <div className="z-10 mt-12 space-y-4">
               <div className="pt-4 border-t border-white/10">
                    <button onClick={() => setShowLegal(true)} className="flex items-center gap-2 text-[10px] text-blue-300 hover:text-white transition-colors group mb-2">
                        <FileText className="w-3 h-3" />
                        <span className="group-hover:underline">Politique de Confidentialité</span>
                    </button>
                   <p className="text-[10px] text-blue-300 opacity-70">© 2026 {config.institutionName} v1.5.0</p>
               </div>
           </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:w-7/12 p-12 flex flex-col justify-center bg-white relative">
           
           <div className="w-full max-w-sm mx-auto">
               <div className="mb-8">
                   <h3 className="text-2xl font-bold text-gray-800">Connexion</h3>
                   <p className="text-sm text-gray-500 mt-1">Saisissez vos identifiants professionnels</p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                   
                   {/* Matricule Input */}
                   <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-700 uppercase ml-1">Matricule</label>
                       <div className="relative">
                           <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input 
                               type="text"
                               value={matricule}
                               onChange={(e) => setMatricule(e.target.value)}
                               className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e] transition-all font-bold placeholder-gray-400"
                               placeholder=""
                               autoFocus
                               required
                           />
                       </div>
                   </div>

                   {/* Password Input */}
                   <div className="space-y-1">
                       <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-700 uppercase ml-1">Mot de passe</label>
                            <button type="button" onClick={handleForgotPassword} className="text-[10px] text-blue-500 hover:underline">Oublié ?</button>
                       </div>
                       <div className="relative">
                           <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input 
                               type={showPassword ? "text" : "password"}
                               value={password}
                               onChange={(e) => setPassword(e.target.value)}
                               autoComplete="current-password"
                               className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a237e] transition-all text-lg tracking-widest placeholder-gray-400"
                               placeholder=""
                               required
                           />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                               {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                       </div>
                   </div>

                   {error && (
                       <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium animate-pulse border border-red-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                       </div>
                   )}

                   <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 rounded-xl text-white font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mt-2
                        ${isLoading ? 'bg-blue-400 cursor-wait' : 'bg-[#1a237e] hover:bg-blue-800'}
                    `}
                   >
                       {isLoading ? (
                           <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       ) : (
                           <>Se connecter <ArrowRight className="w-4 h-4" /></>
                       )}
                   </button>
               </form>

           </div>

        </div>
      </div>

      {showLegal && (
        <LegalDocs onClose={() => setShowLegal(false)} initialTab="PRIVACY" />
      )}
    </div>
  );
};

export default Login;
