import { getDb } from '../db';
import { sendToCandidate } from './notification.service';

interface Appointment {
  id: number;
  customer_name: string;
  service_type: string;
  service_fee: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export async function handleCancellation(userId: number, appointment: Appointment): Promise<void> {
  const db = getDb();

  // Geç iptal kontrolü: randevu zamanına 60 dk'dan az kaldıysa
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00`);
  const now = new Date();
  const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilAppointment < 60) {
    // Geç iptal — sadece işaretle (gerçek uygulamada WebSocket/SSE ile bildir)
    console.warn(`[CancellationService] Geç iptal: randevu #${appointment.id}, ${minutesUntilAppointment.toFixed(0)} dakika kalmıştı`);
  }

  // Hizmet türüyle eşleşen yedek adaylar
  const candidates = db.prepare(`
    SELECT * FROM waitlist
    WHERE user_id = ?
      AND (preferred_service IS NULL OR preferred_service = ?)
    ORDER BY queue_position ASC
    LIMIT 50
  `).all(userId, appointment.service_type) as Array<{
    id: number; customer_name: string; customer_phone: string;
    preferred_service: string | null; queue_position: number;
  }>;

  if (candidates.length === 0) {
    console.info(`[CancellationService] Yedek listesi boş: randevu #${appointment.id}`);
    return;
  }

  // İlk adaya bildirim gönder
  await sendToCandidate(userId, candidates[0], appointment, candidates);
}
