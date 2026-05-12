import { GoogleGenAI, Type } from "@google/genai";
import { Student } from "../types";

const createClient = () => {
    // Only attempt to create client if API key exists to prevent immediate crashes
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeStudentSituation = async (student: Student): Promise<string> => {
    const ai = createClient();
    if (!ai) return "Configuration API manquante. Veuillez configurer la clé API Gemini.";

    // Calculate financial totals from payments array
    const tuitionTotal = student.payments.reduce((acc, curr) => acc + curr.amountDue, 0);
    const tuitionPaid = student.payments.reduce((acc, curr) => acc + curr.amountPaid, 0);

    const prompt = `
    Agis en tant qu'assistant administratif universitaire senior. 
    Analyse la situation de l'étudiant suivant pour un tableau de bord de gestion:
    
    Nom: ${student.firstName} ${student.lastName}
    Département: ${student.department}
    Statut Financier: ${student.status === 'OVERDUE' ? 'Bloqué (Retard > 10 jours)' : student.status === 'WARNING' ? 'Avertissement (Retard < 10 jours)' : 'En règle'}
    Jours de retard: ${student.daysOverdue}
    Montant payé: ${tuitionPaid} / ${tuitionTotal}
    
    Rédige un court paragraphe (max 80 mots) en français formel expliquant la mesure à prendre (accès autorisé ou refusé) et propose une ébauche de message très courte (SMS/Email) à envoyer à l'étudiant pour régulariser sa situation.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "Analyse non disponible.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Erreur lors de l'analyse du dossier étudiant.";
    }
};

export const generateDraftMessage = async (student: Student, type: 'EMAIL' | 'SMS'): Promise<{ subject?: string, body: string }> => {
    const ai = createClient();

    // Calculate financial totals from payments array
    const tuitionTotal = student.payments.reduce((acc, curr) => acc + curr.amountDue, 0);
    const tuitionPaid = student.payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const debt = tuitionTotal - tuitionPaid;

    // Fallback templates if no AI
    if (!ai) {
        if (student.status === 'PAID') return { subject: 'Confirmation de paiement', body: `Bonjour ${student.firstName}, nous confirmons que votre situation est en règle.` };
        if (student.status === 'WARNING') return { subject: 'Rappel de paiement', body: `Bonjour ${student.firstName}, sauf erreur de notre part, votre échéance est dépassée. Merci de régulariser.` };
        return { subject: 'Suspension d\'accès', body: `URGENT ${student.firstName}: Votre accès au campus est suspendu pour non-paiement. Veuillez vous rendre à la comptabilité.` };
    }

    const prompt = `
    Rédige un message de relance formel et professionnel (Type: ${type}) pour l'étudiant ${student.firstName} ${student.lastName}.
    Contexte: 
    - Statut: ${student.status}
    - Dette: ${debt} FCFA
    - Retard: ${student.daysOverdue} jours
    
    Si c'est un EMAIL, fournis un objet et le corps.
    Si c'est un SMS, fournis un texte court (max 160 caractères) sans objet.
    Ton: ${student.status === 'OVERDUE' ? 'Ferme et urgent' : 'Courtois et informatif'}.
    Retourne uniquement le JSON suivant: { "subject": "...", "body": "..." }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        body: { type: Type.STRING }
                    },
                    required: ["body"]
                }
            }
        });
        
        const json = JSON.parse(response.text || "{}");
        return {
            subject: json.subject || (type === 'EMAIL' ? 'Information Scolarité' : undefined),
            body: json.body || "Impossible de générer le message."
        };
    } catch (error) {
        console.error("Gemini Generate Error:", error);
        return { subject: "Relance", body: `Bonjour ${student.firstName}, merci de passer à la comptabilité.` };
    }
};