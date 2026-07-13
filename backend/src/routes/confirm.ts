import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db';

const router = Router();

const confirmActionSchema = z.object({
  action: z.enum(['confirm', 'reject']),
}).strict();

// GET /api/confirm/:token
router.get('/:token', (req: Request, res: Response) => {
  const db = getDb();
  const { token } = req.params;

  const notification = db.prepare(`
    SELECT n.*, a.customer_name as original_customer, a.service_type, a.service_fee,
           a.appointment_date, a.appointment_time
    FROM notifications n
    LEFT JOIN appointments a ON n.appointment_id = a.id
    WHERE n.confirmation_token = ?
  `).get(token) as any;

  if (!notification) {
    res.status(404).json({ error: 'Onay bağlantısı bulunamadı' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(notification.token_expires_at);

  if (now > expiresAt || notification.status !== 'sent') {
    if (notification.status === 'confirmed') {
      res.status(410).json({ error: 'Bu randevu zaten onaylanmıştır' });
    } else {
      res.status(410).json({ error: 'Bu bağlantının süresi dolmuştur' });
    }
    return;
  }

  res.json({
    recipientName: notification.recipient_name,
    serviceType: notification.service_type,
    serviceFee: notification.service_fee,
    appointmentDate: notification.appointment_date,
    appointmentTime: notification.appointment_time,
    expiresAt: notification.token_expires_at,
  });
});

// POST /api/confirm/:token
router.post('/:token', (req: Request, res: Response) => {
  const result = confirmActionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Geçersiz istek: action "confirm" veya "reject" olmalıdır' });
    return;
  }

  const db = getDb();
  const { token } = req.params;
  const { action } = result.data;

  const notification = db.prepare(`
    SELECT n.*, a.service_type, a.service_fee, a.appointment_date, a.appointment_time, a.user_id
    FROM notifications n
    LEFT JOIN appointments a ON n.appointment_id = a.id
    WHERE n.confirmation_token = ?
  `).get(token) as any;

  if (!notification) {
    res.status(404).json({ error: 'Onay bağlantısı bulunamadı' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(notification.token_expires_at);

  if (now > expiresAt || notification.status !== 'sent') {
    res.status(410).json({ error: 'Bu bağlantının süresi dolmuştur' });
    return;
  }

  if (action === 'confirm') {
    // Yeni randevu oluştur
    const newAppointment = db.prepare(`
      INSERT INTO appointments (user_id, customer_name, customer_phone, service_type, service_fee, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'recovered')
    `).run(
      notification.user_id,
      notification.recipient_name,
      notification.recipient_phone,
      notification.service_type,
      notification.service_fee,
      notification.appointment_date,
      notification.appointment_time,
    );

    // Finansal kayıt oluştur
    db.prepare(`
      INSERT INTO financial_records (user_id, appointment_id, service_type, amount, record_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      notification.user_id,
      newAppointment.lastInsertRowid,
      notification.service_type,
      notification.service_fee,
      notification.appointment_date,
    );

    // Bildirimi güncelle
    db.prepare(`UPDATE notifications SET status = 'confirmed' WHERE confirmation_token = ?`).run(token);

    res.json({ message: 'Randevunuz onaylandı', appointmentId: newAppointment.lastInsertRowid });
  } else {
    // Reddet
    db.prepare(`UPDATE notifications SET status = 'rejected' WHERE confirmation_token = ?`).run(token);
    res.json({ message: 'Randevu reddedildi' });
  }
});

export default router;
