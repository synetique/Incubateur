
// Utilitaire de sécurité pour le hachage des mots de passe
// Utilise l'API Web Crypto native du navigateur pour SHA-256

export const hashPassword = async (plainText: string): Promise<string> => {
    if (!plainText) return '';
    
    // Encodage du texte en buffer
    const msgBuffer = new TextEncoder().encode(plainText);
    
    // Hachage SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    // Conversion du buffer en chaîne hexadécimale
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
};
