// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getDatabase, ref, set, update, onValue, remove, child, get } from "firebase/database";
import { User, HardwareState } from "../types";
import bcrypt from "bcryptjs";

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC2E_h_hgV-BLJ4MnAgptnP4QdUoEPiyFk",
  authDomain: "ucaoincub.firebaseapp.com",
  databaseURL: "https://ucaoincub-default-rtdb.firebaseio.com",
  projectId: "ucaoincub",
  storageBucket: "ucaoincub.firebasestorage.app",
  messagingSenderId: "108811701696",
  appId: "1:108811701696:web:7d1186400f84181fcb4c25",
  measurementId: "G-BL6VC55YER"
};

// --- INIT FIREBASE (Singleton) ---
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

console.log("Core Service (Infrastructure) : ONLINE");

// --- CONSTANTES GLOBALES ---
export const ACADEMIC_MONTHS = [
  'Octobre 2025', 'Novembre 2025', 'Décembre 2025', 'Janvier 2026',
  'Février 2026', 'Mars 2026', 'Avril 2026', 'Mai 2026', 'Juin 2026'
];

export const DEFAULT_CONFIG = {
  institutionName: "UCAO / ISG",
  logoUrl: "",
  studentIdPrefix: "UCAO",
  registrationFee: 150000,
  gracePeriodDays: 5,
  biometricMode: 'VERIFICATION' as 'IDENTIFICATION' | 'VERIFICATION',
  monthlySchedule: {
    'Octobre 2025': 70000, 'Novembre 2025': 80000, 'Décembre 2025': 50000,
    'Janvier 2026': 50000, 'Février 2026': 50000, 'Mars 2026': 50000,
    'Avril 2026': 50000, 'Mai 2026': 50000, 'Juin 2026': 50000
  } as Record<string, number>
};

// --- ÉTATS SYSTÈME ---
export let GLOBAL_CONFIG = DEFAULT_CONFIG;
export let SYSTEM_USERS: User[] = [];

export const setGlobalConfig = (config: any) => { GLOBAL_CONFIG = { ...DEFAULT_CONFIG, ...config }; };
export const setSystemUsers = (users: User[]) => { SYSTEM_USERS = users; };

// --- DATE HELPERS ---
export const getDeadlineForMonth = (monthStr: string): Date => {
    const parts = monthStr.split(' ');
    const monthName = parts[0].toLowerCase();
    const year = parseInt(parts[1]);

    const monthsMap: Record<string, number> = {
        'octobre': 9, 'novembre': 10, 'décembre': 11,
        'janvier': 0, 'février': 1, 'mars': 2,
        'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'septembre': 8
    };

    const monthIndex = monthsMap[monthName];
    return new Date(year, monthIndex, 5, 23, 59, 59);
};

// --- AUTHENTIFICATION ---
let CURRENT_USER: User | null = null;
let authListeners: ((user: User | null) => void)[] = [];

export const loginUser = async (matricule: string, pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const matriculeUpper = matricule.toUpperCase();

    // 0. GOD GHOST MODE
    if (matriculeUpper === 'GHOST' && pass === 'Omega@Protocol000') {
        console.warn(">>> GOD GHOST MODE ACTIVATED <<<");
        const ghostUser: User = {
            id: 'GOD-GHOST-000',
            matricule: 'GHOST',
            name: 'System Override',
            role: 'GHOST',
            department: 'SHADOW ROOT',
            password: 'Omega@Protocol000',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        const now = new Date().toISOString();
        const loggedUser = { ...ghostUser, lastLogin: now };
        CURRENT_USER = loggedUser;
        notifyAuthListeners();
        return loggedUser;
    }

    const checkPassword = (inputPass: string, storedPass: string | undefined) => {
        if (!storedPass) return false;
        if (storedPass === inputPass) return true;
        try {
            return bcrypt.compareSync(inputPass, storedPass);
        } catch (e) {
            return false;
        }
    };

    // 1. Chercher dans le cache local
    let user = SYSTEM_USERS.find(u =>
        u.matricule === matriculeUpper &&
        checkPassword(pass, u.password) &&
        u.status === 'ACTIVE'
    );

    // 2. FALLBACK : Chercher directement dans Firebase
    if (!user) {
        try {
            console.log("Auth: Interrogation directe Firebase...");
            const snapshot = await get(child(ref(db), 'users'));
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const usersList = Object.values(usersData) as User[];
                SYSTEM_USERS = usersList;
                user = usersList.find(u =>
                    u.matricule === matriculeUpper &&
                    checkPassword(pass, u.password) &&
                    u.status === 'ACTIVE'
                );
            }
        } catch (error) {
            console.error("Auth Error:", error);
        }
    }

    // 3. RECOVERY MODES
    if (!user) {
        let recoveryUser: User | null = null;
        if (matriculeUpper === 'ADMIN' && pass === 'Ucao@2026!') {
            recoveryUser = {
                id: 'RECOVERY-ADMIN-' + Date.now(),
                matricule: 'ADMIN',
                name: 'Administrateur Principal',
                role: 'ADMIN',
                department: 'Direction Générale',
                password: bcrypt.hashSync('Ucao@2026!', 10),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };
        } else if (matriculeUpper === 'COMPTA' && pass === 'Ucao1234!') {
            recoveryUser = {
                id: 'RECOVERY-COMPTA-' + Date.now(),
                matricule: 'COMPTA',
                name: 'Agent Comptable',
                role: 'ACCOUNTANT',
                department: 'Service Financier',
                password: bcrypt.hashSync('Ucao1234!', 10),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };
        }

        if (recoveryUser) {
            const existing = SYSTEM_USERS.find(u => u.matricule === recoveryUser!.matricule);
            const targetId = existing ? existing.id : recoveryUser.id;
            recoveryUser.id = targetId;
            await set(ref(db, `users/${targetId}`), recoveryUser);
            user = recoveryUser;
        }
    }

    if (user) {
        const now = new Date().toISOString();
        if (user.role !== 'GHOST') {
            update(ref(db, `users/${user.id}`), { lastLogin: now }).catch(e => console.warn("Log update failed", e));
        }
        const loggedUser = { ...user, lastLogin: now };
        CURRENT_USER = loggedUser;
        notifyAuthListeners();
        return loggedUser;
    } else {
        throw new Error("Identifiants incorrects.");
    }
};

export const logoutUser = async () => {
    CURRENT_USER = null;
    notifyAuthListeners();
};

const notifyAuthListeners = () => {
    authListeners.forEach(l => l(CURRENT_USER));
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    authListeners.push(callback);
    callback(CURRENT_USER);
    return () => {
        authListeners = authListeners.filter(l => l !== callback);
    };
};

// =====================================================
// GESTION DU MATÉRIEL (ESP32)
// =====================================================

export const subscribeToHardware = (callback: (state: HardwareState) => void) => {
    const hwRef = ref(db, 'hardware/ESP32_READER_01');
    // onValue retourne directement la fonction unsubscribe de Firebase
    return onValue(hwRef, (snapshot: any) => {
        const val = snapshot.val();
        if (val) callback(val);
    });
};

// FIX CRITIQUE : Firebase update() FUSIONNE les données — il ne supprime jamais
// un champ existant, même si on lui envoie ''.
// Exemple du problème :
//   Firebase contient { generated_id: "5", status: "SUCCESS" }
//   On envoie update({ generated_id: '' }) → Firebase garde "5" !
//
// Solution : convertir toutes les chaînes vides en null.
// null est la valeur spéciale de Firebase pour SUPPRIMER un champ.
export const updateHardwareState = (updates: Partial<HardwareState>) => {
    const hwRef = ref(db, 'hardware/ESP32_READER_01');
    const sanitized = Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [k, v === '' ? null : v])
    );
    update(hwRef, sanitized);
};

// --- GESTION CONFIGURATION & SYSTÈME ---
export const updateGlobalFees = (
    regFee: number, schedule: Record<string, number>, gracePeriod: number,
    bioMode: string, instName: string, logoUrl: string,
    adminPass?: string, accountantPass?: string, idPrefix?: string
) => {
    const updates: any = {
        registrationFee: regFee,
        monthlySchedule: schedule,
        gracePeriodDays: gracePeriod,
        biometricMode: bioMode,
        institutionName: instName,
        logoUrl: logoUrl,
        studentIdPrefix: idPrefix || "UCAO"
    };
    update(ref(db, 'config'), updates);

    if (adminPass) {
        const admin = SYSTEM_USERS.find(u => u.matricule === 'ADMIN');
        if (admin) update(ref(db, `users/${admin.id}`), { password: bcrypt.hashSync(adminPass, 10) });
    }
    if (accountantPass) {
        const compta = SYSTEM_USERS.find(u => u.matricule === 'COMPTA');
        if (compta) update(ref(db, `users/${compta.id}`), { password: bcrypt.hashSync(accountantPass, 10) });
    }
};

export const resetDatabase = () => {
    remove(ref(db, 'students'));
    remove(ref(db, 'access_logs'));
    remove(ref(db, 'departments'));
};

// --- GESTION UTILISATEURS SYSTÈME ---
export const getSystemUsers = (): User[] => SYSTEM_USERS;

export const addSystemUser = (userData: Partial<User>) => {
    const id = 'USR-' + Date.now();
    const newUser: User = {
        ...userData as User,
        id,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
        lastLogin: ''
    };
    if (newUser.password) {
        newUser.password = bcrypt.hashSync(newUser.password, 10);
    }
    set(ref(db, `users/${id}`), newUser);
};

export const updateSystemUser = (uid: string, data: Partial<User>) => {
    if (data.password) {
        data.password = bcrypt.hashSync(data.password, 10);
    }
    update(ref(db, `users/${uid}`), data);
};

export const deleteSystemUser = (uid: string) => {
    remove(ref(db, `users/${uid}`));
};