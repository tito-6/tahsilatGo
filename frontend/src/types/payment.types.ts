// Raw payment data from Excel import
export interface RawPaymentData {
  musteri_adi_soyadi: string; // "Müşteri Adı Soyadı"
  tarih: string;              // "Tarih" - DD/MM/YYYY format
  tahsilat_sekli: string;     // "Tahsilat Şekli"
  hesap_adi: string;          // "Hesap Adı"
  odenen_tutar: number;       // "Ödenen Tutar(Σ:...)"
  odenen_doviz: string;       // "Ödenen Döviz"
  proje_adi: string;          // "Proje Adı"
}

// Processed payment record
export interface PaymentRecord {
  id?: number;
  customer_name: string;
  payment_date: string;
  amount: number;
  currency: string; // TL, USD, EUR
  payment_method: string; // Nakit, Banka Havalesi, Çek
  location: string; // ÇARŞI, KUYUMCUKENT, OFİS, BANKA HAVALESİ
  project: string; // MKM, MSM
  account_name: string;
  amount_usd: number;
  exchange_rate: number;
  created_at?: string;
}

export interface WeeklyReport {
  start_date: string;
  end_date: string;
  customer_summary: Record<string, number>;
  payment_methods: Record<string, PaymentMethodTotal>;
  project_summary: ProjectTotal;
  location_summary: Record<string, LocationTotal>;
  payments: PaymentRecord[];
}

export interface PaymentMethodTotal {
  tl: number;
  usd: number;
  total_usd: number; // Grand total in USD (TL converted + USD)
}

export interface ProjectTotal {
  mkm: number;
  msm: number;
}

export interface LocationTotal {
  mkm: number;
  msm: number;
  total: number;
}

export interface MonthlyReport {
  month: string;
  project_summary: ProjectTotal;
  location_summary: Record<string, LocationTotal>;
  daily_totals: Record<string, number>; // date string -> USD amount
  payment_methods: Record<string, PaymentMethodTotal>; // payment method breakdown
  mkm_payment_methods: Record<string, PaymentMethodTotal>; // MKM project payment methods
  msm_payment_methods: Record<string, PaymentMethodTotal>; // MSM project payment methods
}

export interface YearlyReport {
  year: number;
  project_summary: ProjectTotal;
  location_summary: Record<string, LocationTotal>;
  payment_methods: Record<string, PaymentMethodTotal>; // payment method breakdown
  mkm_payment_methods: Record<string, PaymentMethodTotal>; // MKM project payment methods
  msm_payment_methods: Record<string, PaymentMethodTotal>; // MSM project payment methods
  monthly_reports?: MonthlyReport[];
}

export interface UploadRequest {
  raw_payments: RawPaymentData[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  processed: number;
  errors?: string[];
  weekly_reports?: WeeklyReport[];
}

export interface ReportsResponse {
  weekly_reports: WeeklyReport[];
  monthly_reports: MonthlyReport[];
}

// Constants
export const CURRENCIES = {
  TL: 'TL',
  USD: 'USD',
  EUR: 'EUR',
} as const;

export const PAYMENT_METHODS = {
  CASH: 'Nakit',
  TRANSFER: 'Banka Havalesi',
  CHECK: 'Çek',
} as const;

export const PROJECTS = {
  MKM: 'MKM',
  MSM: 'MSM',
} as const;

export const LOCATIONS = {
  CARSI: 'CARŞI',
  KUYUMCUKENT: 'KUYUMCUKENT',
  OFIS: 'OFİS',
  BANKA: 'BANKA HAVALESİ',
  CEK: 'ÇEK',
} as const;
