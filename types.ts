

export enum PaymentStatus {
  PAID = 'PAID',       // Green (Current month is paid)
  WARNING = 'WARNING', // Orange (Late but within grace period)
  OVERDUE = 'OVERDUE'  // Red (Access denied, current month unpaid > grace period)
}

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'GHOST';

export interface User {
  id: string; // Unique DB ID
  matricule: string; // Login ID (ex: ADMIN, COMPTA-01)
  name: string;
  role: UserRole;
  department: string;
  password?: string; // Only used for auth checks/updates
  lastLogin?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface MonthlyPayment {
  month: string;      // e.g., "Octobre 2024"
  amountDue: number;  // Editable amount
  amountPaid: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
  paidDate?: string;
  deadline: string;   // ISO Date
}

export interface RegistrationFee {
  amountDue: number;
  amountPaid: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
  paidDate?: string;
}

export interface AccessLog {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  status: 'GRANTED' | 'DENIED' | 'WARNING';
  reason?: string;
}

export interface Student {
  id: string;
  biometricId?: string; 
  firstName: string;
  lastName: string;
  
  // État Civil Complet
  birthDate?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: 'M' | 'F';
  maritalStatus?: 'SINGLE' | 'MARRIED';
  idCardNumber?: string; // NNI / Passeport

  // Coordonnées
  email: string;
  phone?: string;
  address?: string;
  city?: string;

  // Tuteurs / Parents
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string; // Père, Mère, Oncle...

  // Parcours Académique & Antécédents
  department: string;
  major: string; 
  className: string;
  previousSchool?: string; // Dernier établissement fréquenté
  bacSeries?: string; // Série du BAC
  bacYear?: string; // Année d'obtention

  // Divers / Santé
  bloodType?: string;
  medicalInfo?: string; // Allergies, Handicap...
  
  photoUrl: string;
  
  // Dynamic Status based on current month AND registration
  status: PaymentStatus;
  daysOverdue: number;
  enrollmentDate?: string;

  // Financials
  registration: RegistrationFee; // New: Frais d'inscription séparés
  payments: MonthlyPayment[]; 
}

export interface DepartmentStats {
  name: string;
  total: number;
  paid: number;
  warning: number;
  overdue: number;
}

export interface GlobalStats {
  totalStudents: number;
  accessGranted: number;
  gracePeriod: number;
  accessDenied: number;
  dailyScans: number;
}

// Nouvelle structure hiérarchique
export interface MajorStructure {
  name: string;
  classes: string[];
}

export interface DepartmentStructure {
  name: string;
  majors: MajorStructure[];
}

// --- NOUVEAU : RÈGLES DE PRIX SPÉCIFIQUES ---
export interface TuitionRule {
    registrationFee: number; // Frais d'inscription spécifiques
    monthlyFee: number;      // Mensualité spécifique (si mode statique)
    customSchedule?: Record<string, number>; // NOUVEAU: Échéancier spécifique (si mode dynamique)
}

export type DeviceStatus = 'CONNECTED' | 'DISCONNECTED' | 'SCANNING' | 'ERROR';

export interface HardwareState {
    mode: 'SCAN' | 'ENROLL';
    status: 'IDLE' | 'WAITING_FINGER' | 'ENROLL_STEP_1' | 'ENROLL_STEP_2' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    target_slot: number;
    scanned_biometric_id: string;
    last_heartbeat: number;
    generated_id?: string;
}