import { getDb } from '../db';

export interface FinancialSummary {
  totalCancellations: number;
  recoveredAppointments: number;
  recoveryRate: number;
  totalRecoveredRevenue: number;
}

export interface DailyRecord {
  date: string;
  recoveredRevenue: number;
  recoveredCount: number;
}

export interface ServiceBreakdown {
  serviceType: string;
  totalRevenue: number;
  count: number;
}

function validateDateRange(from: string, to: string): void {
  if (new Date(from) > new Date(to)) {
    throw Object.assign(new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz'), { statusCode: 422 });
  }
}

export function getSummary(userId: number, from: string, to: string): FinancialSummary {
  validateDateRange(from, to);
  const db = getDb();

  const cancelledRow = db.prepare(
    `SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'cancelled' AND appointment_date BETWEEN ? AND ?`
  ).get(userId, from, to) as { count: number };

  const recoveredRow = db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM financial_records WHERE user_id = ? AND record_date BETWEEN ? AND ?`
  ).get(userId, from, to) as { count: number; total: number };

  const totalCancellations = cancelledRow.count;
  const recoveredCount = recoveredRow.count;
  const rate = totalCancellations > 0
    ? Math.round((recoveredCount / totalCancellations) * 100 * 100) / 100
    : 0;

  return {
    totalCancellations,
    recoveredAppointments: recoveredCount,
    recoveryRate: rate,
    totalRecoveredRevenue: recoveredRow.total,
  };
}

export function getDailyBreakdown(userId: number, from: string, to: string): DailyRecord[] {
  validateDateRange(from, to);
  const db = getDb();
  return db.prepare(
    `SELECT record_date as date, SUM(amount) as recoveredRevenue, COUNT(*) as recoveredCount
     FROM financial_records WHERE user_id = ? AND record_date BETWEEN ? AND ?
     GROUP BY record_date ORDER BY record_date`
  ).all(userId, from, to) as DailyRecord[];
}

export function getServiceBreakdown(userId: number, from: string, to: string): ServiceBreakdown[] {
  validateDateRange(from, to);
  const db = getDb();
  return db.prepare(
    `SELECT service_type as serviceType, SUM(amount) as totalRevenue, COUNT(*) as count
     FROM financial_records WHERE user_id = ? AND record_date BETWEEN ? AND ?
     GROUP BY service_type ORDER BY totalRevenue DESC`
  ).all(userId, from, to) as ServiceBreakdown[];
}

export function exportJSON(userId: number, from: string, to: string): string {
  const summary = getSummary(userId, from, to);
  const daily = getDailyBreakdown(userId, from, to);
  const services = getServiceBreakdown(userId, from, to);
  return JSON.stringify(
    { summary, dailyBreakdown: daily, serviceBreakdown: services, exportedAt: new Date().toISOString() },
    null,
    2
  );
}
