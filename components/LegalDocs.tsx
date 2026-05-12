import React from 'react';
import { Shield, Lock, Eye, FileText, Server, UserCheck, X } from 'lucide-react';

interface LegalDocsProps {
  onClose: () => void;
  initialTab?: 'PRIVACY' | 'TERMS';
}

const LegalDocs: React.FC<LegalDocsProps> = ({ onClose, initialTab = 'PRIVACY' }) => {
  const [activeTab, setActiveTab] = React.useState<'PRIVACY' | 'TERMS'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Centre de Conformité & Légal</h2>
              <p className="text-xs text-gray-500">AccessGuard University • v1.2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('PRIVACY')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'PRIVACY' ? 'text-blue-600 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
          >
            <Lock className="w-4 h-4" />
            Politique de Confidentialité
            {activeTab === 'PRIVACY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('TERMS')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'TERMS' ? 'text-blue-600 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
          >
            <FileText className="w-4 h-4" />
            Conditions Générales d'Utilisation
            {activeTab === 'TERMS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          <div className="max-w-3xl mx-auto text-gray-700 space-y-8 leading-relaxed">
            
            {activeTab === 'PRIVACY' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 items-start">
                  <Server className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1">Protection des Données Biométriques</h4>
                    <p className="text-xs text-blue-800">
                      Les empreintes digitales collectées sont converties en "templates" chiffrés (hachage irréversible) et ne sont jamais stockées sous forme d'image brute. Aucune reconstitution de l'empreinte originale n'est possible à partir des données stockées.
                    </p>
                  </div>
                </div>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">1. Collecte des Données</h3>
                  <p className="text-sm text-gray-600">
                    Dans le cadre de la sécurisation de l'accès au campus et de la gestion administrative, AccessGuard University collecte les données suivantes :
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
                    <li>Données d'identité civile (Nom, Prénom, Date de naissance).</li>
                    <li>Données académiques (Matricule, Filière, Classe).</li>
                    <li>Données biométriques (Gabarit numérique de l'empreinte digitale).</li>
                    <li>Données financières (Historique des paiements de scolarité).</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">2. Finalité du Traitement</h3>
                  <p className="text-sm text-gray-600">
                    Ces données sont traitées exclusivement pour :
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
                    <li>Contrôler l'accès physique aux enceintes de l'université.</li>
                    <li>Gérer le recouvrement des frais de scolarité.</li>
                    <li>Produire des statistiques anonymisées de fréquentation.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">3. Durée de Conservation</h3>
                  <p className="text-sm text-gray-600">
                    Les données biométriques sont conservées pendant la durée de la scolarité de l'étudiant. Elles sont supprimées automatiquement 90 jours après la fin définitive de la scolarité (diplomation ou abandon). Les données financières sont conservées 5 ans conformément aux obligations comptables.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">4. Sécurité et Partage</h3>
                  <p className="text-sm text-gray-600">
                    L'accès aux données est strictement restreint au personnel habilité (Administration et Service Comptable). Aucune donnée n'est partagée avec des tiers commerciaux. Les serveurs sont hébergés localement avec un chiffrement AES-256.
                  </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">5. Droits des Usagers</h3>
                    <p className="text-sm text-gray-600">
                        Conformément à la législation en vigueur sur la protection des données personnelles, tout étudiant dispose d'un droit d'accès, de rectification et de suppression de ses données. Pour exercer ce droit, contactez le DPO à : <span className="font-mono bg-gray-100 px-1 rounded">dpo@accessguard.univ</span>.
                    </p>
                </section>
              </div>
            )}

            {activeTab === 'TERMS' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-4 items-start">
                  <UserCheck className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1">Responsabilité de l'Administrateur</h4>
                    <p className="text-xs text-amber-800">
                      L'utilisation de ce compte est strictement personnelle. Toute action effectuée (validation de paiement, modification de statut) est loguée et engage la responsabilité de l'agent connecté.
                    </p>
                  </div>
                </div>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">1. Conditions d'Accès</h3>
                  <p className="text-sm text-gray-600">
                    L'accès à la plateforme AccessGuard est réservé au personnel administratif et comptable autorisé. Le partage d'identifiants est strictement interdit et peut entraîner des sanctions disciplinaires.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">2. Utilisation du Scanner Biométrique</h3>
                  <p className="text-sm text-gray-600">
                    L'agent de sécurité s'engage à utiliser le dispositif biométrique uniquement aux points de contrôle désignés. Il est interdit de tenter d'extraire, de copier ou de modifier les données brutes du scanner.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">3. Gestion des Paiements</h3>
                  <p className="text-sm text-gray-600">
                    L'agent comptable certifie l'exactitude des encaissements enregistrés. Toute régularisation frauduleuse ("déblocage de complaisance") sera détectée par les audits automatiques du système.
                  </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">4. Disponibilité du Service</h3>
                    <p className="text-sm text-gray-600">
                        L'université s'efforce de maintenir le service accessible 24/7. Toutefois, des maintenances (Batchs nocturnes) peuvent interrompre momentanément l'accès aux données temps réel.
                    </p>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDocs;