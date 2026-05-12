
import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Shield, ShieldAlert, Edit2, Trash2, 
    Check, X, Key, UserCheck, AlertTriangle, UserPlus, Save, Ghost, Eye, EyeOff
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getSystemUsers, addSystemUser, updateSystemUser, deleteSystemUser, subscribeToDataChanges } from '../services/dataService';
import { useToast } from '../contexts/ToastContext';

interface UserManagementProps {
    currentUser?: User | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // État pour la suppression
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    
    // Form State
    const [formData, setFormData] = useState<Partial<User>>({
        matricule: '', name: '', role: 'ACCOUNTANT', department: '', password: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const { addToast } = useToast();

    // Check privileges
    const isGhost = currentUser?.role === 'GHOST';

    useEffect(() => {
        setUsers(getSystemUsers());
        const unsubscribe = subscribeToDataChanges(() => {
            setUsers(getSystemUsers());
        });
        return () => unsubscribe();
    }, []);

    // FILTER LOGIC:
    // 1. Ghost sees everyone.
    // 2. Admin sees Admins and Accountants, BUT NOT Ghost users.
    const filteredUsers = users.filter(u => {
        // Hide Ghosts from non-Ghosts
        if (u.role === 'GHOST' && !isGhost) return false;
        
        // Search Filter
        return u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               u.matricule.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const resetForm = () => {
        setFormData({ matricule: '', name: '', role: 'ACCOUNTANT', department: '', password: '' });
        setEditingId(null);
        setShowModal(false);
        setShowPassword(false);
    };

    const handleEdit = (user: User) => {
        // Security: Prevent Normal Admin from editing Ghost (even if hacked to show up)
        if (user.role === 'GHOST' && !isGhost) return;

        // Security: Protect Root ADMIN (Principal) from modification by others
        // Si je ne suis pas le ROOT admin ET que je ne suis pas GHOST, je ne peux pas modifier le ROOT.
        if (user.matricule === 'ADMIN' && currentUser?.matricule !== 'ADMIN' && !isGhost) {
            addToast("Action refusée : Seul l'Administrateur Principal peut modifier son propre compte.", 'ERROR');
            return;
        }

        setFormData({
            matricule: user.matricule,
            name: user.name,
            role: user.role,
            department: user.department,
            password: '' // On vide le mot de passe par sécurité pour l'édition
        });
        setEditingId(user.id);
        setShowModal(true);
    };

    const handleDeleteClick = (user: User) => {
        // Security: Prevent Normal Admin from deleting Ghost
        if (user.role === 'GHOST' && !isGhost) return;
        
        // Security: Protect Root ADMIN
        if (user.matricule === 'ADMIN' && !isGhost) {
            addToast("Action refusée : L'Administrateur Principal ne peut pas être supprimé.", 'ERROR');
            return;
        }

        // Security: Ghost cannot delete themselves (to prevent lockout)
        if (user.role === 'GHOST' && user.id === currentUser?.id) {
            addToast("Action refusée : Le GHOST ne peut pas s'auto-détruire.", 'ERROR');
            return;
        }

        setDeleteTargetId(user.id);
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            deleteSystemUser(deleteTargetId);
            addToast("Utilisateur supprimé définitivement.", 'WARNING');
            setDeleteTargetId(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Validation Mot de passe (Min 8 caractères)
        // Si c'est une création (pas d'editingId) OU si on modifie le mot de passe (champ rempli)
        if ((!editingId && (!formData.password || formData.password.length < 8)) || (editingId && formData.password && formData.password.length < 8)) {
            addToast("Le mot de passe doit contenir au moins 8 caractères.", 'ERROR');
            return;
        }

        // 2. Nettoyage des données
        const cleanData = {
            ...formData,
            matricule: formData.matricule?.trim().toUpperCase(),
            name: formData.name?.trim(),
            password: formData.password?.trim()
        };
        
        if (editingId) {
            // Update
            const updatePayload = { ...cleanData };
            if (!updatePayload.password) delete updatePayload.password;

            updateSystemUser(editingId, updatePayload);
            addToast(`Mise à jour effectuée pour ${cleanData.matricule}`, 'SUCCESS');
        } else {
            // Create
            if (!cleanData.matricule || !cleanData.password || !cleanData.name) {
                addToast("Veuillez remplir tous les champs obligatoires.", 'ERROR');
                return;
            }
            addSystemUser(cleanData);
            addToast(`Nouvel utilisateur ${cleanData.matricule} créé avec succès.`, 'SUCCESS');
        }
        resetForm();
    };

    const handleToggleStatus = (user: User) => {
        if (user.role === 'GHOST' && !isGhost) return;
        
        // Protection du Root Admin
        if (user.matricule === 'ADMIN' && !isGhost) {
            addToast("Impossible de suspendre l'Administrateur Principal.", 'ERROR');
            return;
        }

        const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        updateSystemUser(user.id, { status: newStatus });
        addToast(`Compte ${newStatus === 'ACTIVE' ? 'Activé' : 'Suspendu'}`, 'INFO');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 h-full flex flex-col relative">

            {/* MODALE DE CONFIRMATION SUPPRESSION (CENTRÉE) */}
            {deleteTargetId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform scale-100 transition-all border border-red-100">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 bg-red-100 rounded-full text-red-600 shadow-sm">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Supprimer l'utilisateur ?</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    L'accès au système sera <span className="font-bold text-red-600">immédiatement révoqué</span>. Cette action est irréversible.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button 
                                    onClick={() => setDeleteTargetId(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#1a237e] flex items-center gap-2">
                        <UserCheck className="w-6 h-6" />
                        Gestion des Accès Utilisateurs
                    </h2>
                    <p className="text-sm text-gray-500">Administrez les comptes, rôles et privilèges du personnel.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors ${isGhost ? 'bg-black text-yellow-500 hover:bg-slate-900' : 'bg-[#1a237e] hover:bg-blue-800 text-white'}`}
                >
                    <UserPlus className="w-4 h-4" />
                    Nouvel Utilisateur
                </button>
            </div>

            {/* Content & Search */}
            <div className={`flex-1 bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden min-h-0 ${isGhost ? 'border-yellow-200 shadow-yellow-100' : 'border-gray-100'}`}>
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                     <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un utilisateur..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Utilisateur</th>
                                <th className="px-6 py-3">Rôle & Privilèges</th>
                                <th className="px-6 py-3">Dernière Connexion</th>
                                <th className="px-6 py-3">Statut</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredUsers.map(user => {
                                const isPrincipalAdmin = user.matricule === 'ADMIN';

                                return (
                                <tr key={user.id} className={`transition-colors group ${user.role === 'GHOST' ? 'bg-yellow-50/30' : 'hover:bg-blue-50/30'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.role === 'GHOST' ? 'bg-black text-yellow-500' : user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {user.role === 'GHOST' ? <Ghost className="w-4 h-4"/> : user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 flex items-center gap-1">
                                                    {user.name} 
                                                    {isPrincipalAdmin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1">PRINCIPAL</span>}
                                                </p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1"><Key className="w-3 h-3"/> {user.matricule}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border 
                                            ${user.role === 'GHOST' ? 'bg-black text-yellow-500 border-yellow-500' : 
                                              user.role === 'ADMIN' ? 'bg-purple-50 border-purple-100 text-purple-700' : 
                                              'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                            {user.role === 'GHOST' ? <Ghost className="w-3 h-3" /> : user.role === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                            {user.role === 'GHOST' ? 'GOD MODE' : user.role === 'ADMIN' ? (isPrincipalAdmin ? 'ADMIN PRINCIPAL' : 'ADMIN SECONDAIRE') : 'COMPTABLE'}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{user.department}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleToggleStatus(user)}
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                                            title="Cliquer pour changer le statut"
                                            disabled={(user.role === 'GHOST' && !isGhost) || (isPrincipalAdmin && !isGhost)}
                                        >
                                            {user.status === 'ACTIVE' ? 'ACTIF' : 'SUSPENDU'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {(!isPrincipalAdmin || currentUser?.matricule === 'ADMIN' || isGhost) && (
                                                <button onClick={() => handleEdit(user)} className="p-1.5 bg-white border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {(!isPrincipalAdmin) && (
                                                <button onClick={() => handleDeleteClick(user)} className="p-1.5 bg-white border border-gray-200 rounded hover:text-red-600 hover:border-red-300 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL AJOUT / EDIT */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isGhost ? 'bg-slate-900 border-yellow-900' : 'border-gray-100 bg-gray-50'}`}>
                            <h3 className={`font-bold text-lg flex items-center gap-2 ${isGhost ? 'text-yellow-500' : 'text-gray-800'}`}>
                                {editingId ? <Edit2 className="w-5 h-5"/> : <UserPlus className="w-5 h-5"/>}
                                {editingId ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Matricule (Login)</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.matricule}
                                        onChange={e => setFormData({...formData, matricule: e.target.value.toUpperCase()})}
                                        className="w-full px-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase shadow-sm"
                                        placeholder="EX: COMPTA-02"
                                        disabled={!!editingId}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-medium"
                                        placeholder="Jean Dupont"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rôle Système</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, role: 'ADMIN'})}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'ADMIN' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <ShieldAlert className="w-6 h-6" />
                                        <span className="text-xs font-bold">ADMINISTRATEUR</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, role: 'ACCOUNTANT'})}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'ACCOUNTANT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Shield className="w-6 h-6" />
                                        <span className="text-xs font-bold">COMPTABLE</span>
                                    </button>
                                </div>
                                {isGhost && (
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, role: 'GHOST'})}
                                        className={`w-full mt-2 p-2 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.role === 'GHOST' ? 'border-yellow-500 bg-black text-yellow-500 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Ghost className="w-4 h-4" />
                                        <span className="text-xs font-bold">GOD MODE (GHOST)</span>
                                    </button>
                                )}
                                <p className="text-[10px] text-gray-400 mt-2 text-center">
                                    {formData.role === 'ADMIN' 
                                        ? "Accès total : Configuration, Logs, Gestion Utilisateurs, Suppression." 
                                        : formData.role === 'GHOST'
                                        ? "ACCÈS ILLIMITÉ : Supervision Totale, Indétectable."
                                        : "Accès limité : Annuaire Étudiant, Encaisser Paiements, Voir Historique."}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Département / Service</label>
                                <input 
                                    type="text" 
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-medium"
                                    placeholder="Ex: Comptabilité, Scolarité..."
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Mot de passe</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required={!editingId}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        placeholder={editingId ? "Laisser vide pour ne pas changer" : "Créer un mot de passe fort"}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {editingId ? (
                                    <p className="text-[10px] text-orange-600 mt-2 flex items-center gap-1 font-medium">
                                        <AlertTriangle className="w-3 h-3"/> Remplir uniquement pour réinitialiser (Min. 8 car.)
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                        <Shield className="w-3 h-3"/> Minimum 8 caractères requis.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors ${isGhost ? 'bg-black hover:bg-gray-900 shadow-yellow-900/20 text-yellow-500' : 'bg-[#1a237e] hover:bg-blue-800 shadow-blue-900/20'}`}>
                                    <Save className="w-4 h-4" /> {editingId ? 'Mettre à jour' : 'Créer Compte'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserManagement;
