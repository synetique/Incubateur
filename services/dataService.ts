
import { Student, DepartmentStructure, AccessLog, User, TuitionRule, GlobalStats, DepartmentStats, PaymentStatus } from '../types';
import { 
    db, 
    setGlobalConfig, 
    setSystemUsers, 
    GLOBAL_CONFIG, 
    ACADEMIC_MONTHS, 
    getDeadlineForMonth, 
    DEFAULT_CONFIG
} from './core'; 
// @ts-ignore
import { ref, set, onValue, update, push, remove, get, child } from "firebase/database";
import bcrypt from "bcryptjs";

// --- RE-EXPORTS DEPUIS CORE (POUR COMPATIBILITÉ) ---
export * from './core';

// --- VARIABLES D'ÉTAT MÉTIER ---
export let ALL_STUDENTS: Student[] = [];
export let DEPARTMENTS: DepartmentStructure[] = [];
export let ACCESS_LOGS: AccessLog[] = [];
export let TUITION_RULES: Record<string, TuitionRule> = {}; 

console.log("Data Service (Business Logic) : ONLINE");

// --- SYSTÈME DE NOTIFICATION REACT ---
let dataListeners: (() => void)[] = [];

export const notifyListeners = () => {
  dataListeners.forEach(l => l());
};

export const subscribeToDataChanges = (callback: () => void) => {
  dataListeners.push(callback);
  if (dataListeners.length === 1) {
      initFirebaseListeners();
  }
  callback();
  return () => {
      dataListeners = dataListeners.filter(l => l !== callback);
  };
};

// --- INITIALISATION AUTOMATIQUE ---
export const initializeDefaultData = () => {
    console.log("Initialisation de la structure UCAO par défaut...");
    const defaultDepts: DepartmentStructure[] = [
        {
            name: "Informatique",
            majors: [
                { name: "Réseaux & Télécoms", classes: ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"] },
                { name: "Génie Logiciel", classes: ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"] }
            ]
        },
        {
            name: "Gestion",
            majors: [
                { name: "Comptabilité", classes: ["Licence 1", "Licence 2", "Licence 3"] },
                { name: "Marketing", classes: ["Licence 1", "Licence 2", "Licence 3"] }
            ]
        }
    ];

    set(ref(db, 'departments'), defaultDepts);
    set(ref(db, 'config'), DEFAULT_CONFIG);
    
    update(ref(db, 'hardware/ESP32_READER_01'), {
        mode: 'SCAN',
        status: 'IDLE',
        target_slot: 0,
        scanned_biometric_id: null,
        generated_id: null,
        last_heartbeat: Date.now()
    });

    // Création des admins par défaut si inexistant
    get(child(ref(db), 'users')).then((snapshot) => {
        if (!snapshot.exists()) {
             const adminId = 'USR-' + Date.now();
             set(ref(db, `users/${adminId}`), {
                id: adminId,
                matricule: 'ADMIN',
                name: 'Administrateur Principal',
                role: 'ADMIN',
                department: 'Direction Générale',
                password: bcrypt.hashSync('Ucao@2026!', 10),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            });

            const comptaId = 'USR-' + (Date.now() + 100);
            set(ref(db, `users/${comptaId}`), {
                id: comptaId,
                matricule: 'COMPTA',
                name: 'Agent Comptable',
                role: 'ACCOUNTANT',
                department: 'Service Financier',
                password: bcrypt.hashSync('Ucao1234!', 10),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            });
        }
    });
};

export const calculateStudentStatus = (student: Student): PaymentStatus => {
    // 1. Check registration
    if (student.registration && student.registration.status !== 'PAID') {
        return PaymentStatus.OVERDUE;
    }

    // 2. Check monthly payments
    const now = Date.now();
    let hasWarning = false;

    if (student.payments) {
        for (const p of student.payments) {
            if (p.status !== 'PAID') {
                const deadline = new Date(p.deadline).getTime();
                if (now > deadline + (GLOBAL_CONFIG.gracePeriodDays * 86400000)) {
                    return PaymentStatus.OVERDUE;
                } else if (now > deadline) {
                    hasWarning = true;
                }
            }
        }
    }

    return hasWarning ? PaymentStatus.WARNING : PaymentStatus.PAID;
};

// --- ÉCOUTEURS FIREBASE (REALTIME) ---
let firebaseInitialized = false;

export const initFirebaseListeners = () => {
    if (firebaseInitialized) return;
    firebaseInitialized = true;

    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
            ALL_STUDENTS = Object.values(data) as Student[];
            // Recalculate status for all students dynamically
            ALL_STUDENTS.forEach(student => {
                const currentStatus = calculateStudentStatus(student);
                if (student.status !== currentStatus) {
                    student.status = currentStatus;
                    // Optionally update in Firebase if we want to persist it,
                    // but doing it in memory is safer to avoid infinite loops
                }
            });
        } else {
            ALL_STUDENTS = [];
        }
        notifyListeners();
    });

    const deptsRef = ref(db, 'departments');
    onValue(deptsRef, (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
            DEPARTMENTS = Object.values(data);
        } else {
            DEPARTMENTS = [];
            get(child(ref(db), 'departments')).then((snap) => {
                if (!snap.exists()) initializeDefaultData();
            });
        }
        notifyListeners();
    });

    const logsRef = ref(db, 'access_logs');
    onValue(logsRef, (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
            ACCESS_LOGS = Object.values(data) as AccessLog[];
            ACCESS_LOGS.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } else {
            ACCESS_LOGS = [];
        }
        notifyListeners();
    });
    
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
            const users = Object.values(data) as User[];
            setSystemUsers(users); // Mise à jour de l'état dans core.ts
        } else {
            setSystemUsers([]);
            initializeDefaultData();
        }
        notifyListeners();
    });

    const configRef = ref(db, 'config');
    onValue(configRef, (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
            setGlobalConfig(data); // Mise à jour de l'état dans core.ts
        }
        notifyListeners();
    });

    const rulesRef = ref(db, 'tuition_rules');
    onValue(rulesRef, (snapshot: any) => {
        const data = snapshot.val();
        TUITION_RULES = data || {};
        notifyListeners();
    });
};

// --- STATISTIQUES ---
export const getGlobalStats = (): GlobalStats => {
    const today = new Date().toDateString();
    return {
        totalStudents: ALL_STUDENTS.length,
        accessGranted: ALL_STUDENTS.filter(s => s.status === PaymentStatus.PAID).length,
        gracePeriod: ALL_STUDENTS.filter(s => s.status === PaymentStatus.WARNING).length,
        accessDenied: ALL_STUDENTS.filter(s => s.status === PaymentStatus.OVERDUE).length,
        dailyScans: ACCESS_LOGS.filter(l => new Date(l.timestamp).toDateString() === today).length
    };
};

export const getDepartmentStats = (): DepartmentStats[] => {
    return DEPARTMENTS.map(dept => {
        const deptStudents = ALL_STUDENTS.filter(s => s.department === dept.name);
        return {
            name: dept.name,
            total: deptStudents.length,
            paid: deptStudents.filter(s => s.status === PaymentStatus.PAID).length,
            warning: deptStudents.filter(s => s.status === PaymentStatus.WARNING).length,
            overdue: deptStudents.filter(s => s.status === PaymentStatus.OVERDUE).length
        };
    });
};

// --- GESTION DES ÉTUDIANTS ---
export const getStudents = (
    page: number = 1, 
    limit: number = 50, 
    search: string = '', 
    statusFilter: string = 'ALL', 
    deptFilter: string = '', 
    majorFilter: string = '', 
    classFilter: string = ''
): { data: Student[], total: number } => {
    let filtered = ALL_STUDENTS;

    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(st => 
            st.firstName.toLowerCase().includes(s) || 
            st.lastName.toLowerCase().includes(s) || 
            st.id.toLowerCase().includes(s) ||
            (st.phone && st.phone.includes(s))
        );
    }

    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(st => st.status === statusFilter);
    }
    if (deptFilter) filtered = filtered.filter(st => st.department === deptFilter);
    if (majorFilter) filtered = filtered.filter(st => st.major === majorFilter);
    if (classFilter) filtered = filtered.filter(st => st.className === classFilter);

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return { data: paginated, total: filtered.length };
};

export const addStudent = (studentData: any) => {
    const id = Date.now().toString(); 
    const matricule = Math.floor(1000000 + Math.random() * 9000000).toString(); 

    const payments = ACADEMIC_MONTHS.map(month => ({
        month,
        amountDue: GLOBAL_CONFIG.monthlySchedule[month] || 0,
        amountPaid: 0,
        status: 'PENDING' as const,
        deadline: getDeadlineForMonth(month).toISOString()
    }));

    // Override with custom rule
    const ruleId = `${studentData.department}_${studentData.major}_${studentData.className}`.replace(/\s+/g, '_');
    const rule = TUITION_RULES[ruleId];
    if (rule) {
        if (rule.customSchedule) {
             payments.forEach(p => {
                 if (rule.customSchedule && rule.customSchedule[p.month] !== undefined) {
                     p.amountDue = rule.customSchedule[p.month];
                 }
             });
        } else if (rule.monthlyFee > 0) {
            payments.forEach(p => {
                p.amountDue = rule.monthlyFee;
            });
        }
    }

    const newStudent: Student = {
        ...studentData,
        id: matricule,
        photoUrl: studentData.photoUrl || "https://via.placeholder.com/150",
        status: PaymentStatus.WARNING, // Will be recalculated below
        daysOverdue: 0,
        createdAt: new Date().toISOString(),
        registration: {
            amountDue: studentData.customRegistrationFee || GLOBAL_CONFIG.registrationFee,
            amountPaid: 0,
            status: 'PENDING'
        },
        payments
    };
    
    newStudent.status = calculateStudentStatus(newStudent);

    set(ref(db, `students/${matricule}`), newStudent);
    return newStudent;
};

export const deleteStudent = (studentId: string) => {
    remove(ref(db, `students/${studentId}`));
};

export const updateStudentInfo = (studentId: string, data: Partial<Student>) => {
    update(ref(db, `students/${studentId}`), data);
    return ALL_STUDENTS.find(s => s.id === studentId); 
};

// --- LOGS & ACCESS ---
export const addAccessLog = (student: Student, status: 'GRANTED' | 'DENIED' | 'WARNING', reason?: string) => {
    const newLog: AccessLog = {
        id: Date.now().toString(),
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        timestamp: new Date().toISOString(),
        status,
        reason
    };
    push(ref(db, 'access_logs'), newLog);
};

export const getAccessLogs = (): AccessLog[] => {
    return ACCESS_LOGS;
};

export const getStudentLogs = (studentId: string): AccessLog[] => {
    return ACCESS_LOGS.filter(l => l.studentId === studentId);
};

// --- STRUCTURE ACADÉMIQUE ---
export const getDepartmentsStructure = (): DepartmentStructure[] => {
    return DEPARTMENTS;
};

export const addDepartment = (name: string) => {
    const newDepts = [...DEPARTMENTS, { name, majors: [] }];
    set(ref(db, 'departments'), newDepts);
};

export const addMajor = (deptName: string, majorName: string) => {
    const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
            return { ...d, majors: [...(d.majors || []), { name: majorName, classes: [] }] };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

export const addClass = (deptName: string, majorName: string, className: string) => {
    const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
            const newMajors = d.majors.map(m => {
                if (m.name === majorName) {
                    return { ...m, classes: [...(m.classes || []), className] };
                }
                return m;
            });
            return { ...d, majors: newMajors };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

export const deleteDepartment = (name: string) => {
    const newDepts = DEPARTMENTS.filter(d => d.name !== name);
    set(ref(db, 'departments'), newDepts);
};

export const deleteMajor = (deptName: string, majorName: string) => {
     const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
            return { ...d, majors: d.majors.filter(m => m.name !== majorName) };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

export const deleteClass = (deptName: string, majorName: string, className: string) => {
     const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
             const newMajors = d.majors.map(m => {
                if (m.name === majorName) {
                    return { ...m, classes: m.classes.filter(c => c !== className) };
                }
                return m;
            });
            return { ...d, majors: newMajors };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

export const updateDepartment = (oldName: string, newName: string) => {
    const newDepts = DEPARTMENTS.map(d => d.name === oldName ? { ...d, name: newName } : d);
    set(ref(db, 'departments'), newDepts);
};

export const updateMajor = (deptName: string, oldName: string, newName: string) => {
    const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
            const newMajors = d.majors.map(m => m.name === oldName ? { ...m, name: newName } : m);
            return { ...d, majors: newMajors };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

export const updateClass = (deptName: string, majorName: string, oldName: string, newName: string) => {
     const newDepts = DEPARTMENTS.map(d => {
        if (d.name === deptName) {
             const newMajors = d.majors.map(m => {
                if (m.name === majorName) {
                    return { ...m, classes: m.classes.map(c => c === oldName ? newName : c) };
                }
                return m;
            });
            return { ...d, majors: newMajors };
        }
        return d;
    });
    set(ref(db, 'departments'), newDepts);
};

// --- PAIEMENTS ---
export const processRegistrationPayment = (studentId: string) => {
    const student = ALL_STUDENTS.find(s => s.id === studentId);
    if (!student) return null;
    
    const updatedReg = { ...student.registration, status: 'PAID' as const, amountPaid: student.registration.amountDue, paidDate: new Date().toISOString() };
    const tempStudent = { ...student, registration: updatedReg };
    const newStatus = calculateStudentStatus(tempStudent);
    const updates = { registration: updatedReg, status: newStatus };
    
    update(ref(db, `students/${studentId}`), updates);
    return { ...student, ...updates };
};

export const processMonthlyPayment = (studentId: string, month: string) => {
    const student = ALL_STUDENTS.find(s => s.id === studentId);
    if (!student) return null;
    
    const newPayments = student.payments.map(p => {
        if (p.month === month) {
            return { ...p, status: 'PAID' as const, amountPaid: p.amountDue, paidDate: new Date().toISOString() };
        }
        return p;
    });
    
    const tempStudent = { ...student, payments: newPayments };
    const newStatus = calculateStudentStatus(tempStudent);
    
    const updates = { 
        payments: newPayments, 
        status: newStatus 
    };
    
    update(ref(db, `students/${studentId}`), updates);
    return { ...student, ...updates };
};

export const updateMonthlyAmount = (studentId: string, month: string, amount: number) => {
    const student = ALL_STUDENTS.find(s => s.id === studentId);
    if (!student) return null;

     const newPayments = student.payments.map(p => {
        if (p.month === month) {
            return { ...p, amountDue: amount };
        }
        return p;
    });
    
    update(ref(db, `students/${studentId}`), { payments: newPayments });
    return { ...student, payments: newPayments };
};

// --- TUITION RULES ---
export const getTuitionRule = (dept: string, major: string, className: string): TuitionRule | null => {
    const ruleId = `${dept}_${major}_${className}`.replace(/\s+/g, '_');
    return TUITION_RULES[ruleId] || null;
};

export const saveTuitionRule = (dept: string, major: string, className: string, rule: TuitionRule) => {
    const ruleId = `${dept}_${major}_${className}`.replace(/\s+/g, '_');
    set(ref(db, `tuition_rules/${ruleId}`), rule);
};

export const deleteTuitionRule = (dept: string, major: string, className: string) => {
    const ruleId = `${dept}_${major}_${className}`.replace(/\s+/g, '_');
    remove(ref(db, `tuition_rules/${ruleId}`));
};
