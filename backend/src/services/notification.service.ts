import { randomUUID } from 'crypto';
import { getDb } from '../db';

interface Appointment {
  id: number;
  customer_name: string;
  service_type: string;
  service_fee: number;
  appointment_date: string;
  appointment_time: string;
}

interface Candidate {
  id: number;
  customer_name: string;
  customer_phone: string;
  preferred_service: string | null;
  queue_position: number;
}

const MAX_ATTEMPTS = 3;
const CONFIRMATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 saat

export async function sendToCandidate(
  userId: number,
  candidate: Candidate,
  appointment: Appointment,
  allCandidates: Candidate[],
  attemptNumber: number = 1
): Promise<void> {
  if (attemptNumber > MAX_ATTEMPTS) {
    // "Doldurulamadı" durumunu kaydet
    const db = getDb();
    db.prepare(`
      INSERT INTO notifications (user_id, appointment_id, recipient_name, recipient_phone, message_content, channel, status)
      VALUES (?, ?, 'İşletme Sahibi', '', 'Randevu doldurulamadı: 3 adaydan onay alınamadı', 'SMS', 'expired')
    `).run(userId, appointment.id);
    console.info(`[NotificationService] Doldurulamadı: randevu #${appointment.id}`);
    return;
  }

  const db = getDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();
  const channel: 'SMS' | 'WhatsApp' = 'SMS'; // Simülasyon: varsayılan SMS

  const message = `Sayın ${candidate.customer_name}, ${appointment.appointment_date} tarihinde saat ${appointment.appointment_time}'de ${appointment.service_type} randevunuz için bir yer açıldı. Onaylamak için: ${process.env.BASE_URL || 'http://localhost:3000'}/confirm/${token}`;

  db.prepare(`
    INSERT INTO notifications
      (user_id, appointment_id, waitlist_id, recipient_name, recipient_phone, message_content, channel, confirmation_token, token_expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
  `).run(userId, appointment.id, candidate.id, candidate.customer_name, candidate.customer_phone, message, channel, token, expiresAt);

  console.info(`[NotificationService] Bildirim gönderildi: ${candidate.customer_name} (${candidate.customer_phone}), token: ${token}`);

  // 30 dakika sonra onay gelmezse sıradaki adaya geç
  setTimeout(async () => {
    const db2 = getDb();
    const notification = db2.prepare(
      `SELECT status FROM notifications WHERE confirmation_token = ?`
    ).get(token) as { status: string } | undefined;

    if (!notification || notification.status === 'sent') {
      // Token hâlâ 'sent' → onay gelmedi, expire et ve sonraki adaya geç
      db2.prepare(`UPDATE notifications SET status = 'expired' WHERE confirmation_token = ?`).run(token);

      const nextCandidates = allCandidates.filter(c => c.queue_position > candidate.queue_position);
      if (nextCandidates.length > 0) {
        await sendToCandidate(userId, nextCandidates[0], appointment, allCandidates, attemptNumber + 1);
      } else {
        await sendToCandidate(userId, candidate, appointment, [], MAX_ATTEMPTS + 1);
      }
    }
  }, 30 * 60 * 1000); // 30 dakika
}
