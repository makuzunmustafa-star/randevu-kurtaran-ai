import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { createAppointmentSchema } from '../schemas/appointment.schema';
import { requireAuth } from '../middleware/auth';
import { handleCancellation } from '../services/cancellation.service';

const router = Router();

// GET /api/appointments?weekStart=YYYY-MM-DD
router.get('/', requireAuth, (req: Request, res: Response) => {
  const { weekStart } = req.query;
  const db = getDb();
  const userId = req.user!.userId;

  let appointments;
  if (weekStart && typeof weekStart === 'string') {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    appointments = db.prepare(
      `SELECT * FROM appointments WHERE user_id = ? AND appointment_date >= ? AND appointment_date < ? AND status = 'active' ORDER BY appointment_date, appointment_time`
    ).all(userId, weekStart, weekEndStr);
  } else {
    appointments = db.prepare(
      `SELECT * FROM appointments WHERE user_id = ? AND status = 'active' ORDER BY appointment_date, appointment_time`
    ).all(userId);
  }

  res.json(appointments);
});

// POST /api/appointments
router.post('/', requireAuth, (req: Request, res: Response) => {
  const result = createAppointmentSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues;
    const isPastDate = issues.some(i => i.message.includes('Geçmiş tarih'));
    if (isPastDate) {
      res.status(422).json({ error: 'Geçmiş tarih ve saate randevu eklenemez' });
      return;
    }
    const isPhoneError = issues.some(i => i.path.includes('customerPhone'));
    if (isPhoneError) {
      res.status(422).json({ error: 'Telefon numarası geçersiz. 10 rakam ve 5 ile başlamalıdır.' });
      return;
    }
    const isFeeError = issues.some(i => i.path.includes('serviceFee'));
    if (isFeeError) {
      res.status(422).json({ error: 'Hizmet ücreti sıfırdan büyük olmalıdır.' });
      return;
    }
    res.status(400).json({ error: 'Zorunlu alanlar eksik veya geçersiz', fields: issues.map(i => i.path.join('.')) });
    return;
  }

  const db = getDb();
  const userId = req.user!.userId;
  const { customerName, customerPhone, serviceType, serviceFee, appointmentDate, appointmentTime } = result.data;

  // Çakışma kontrolü
  const conflict = db.prepare(
    `SELECT id FROM appointments WHERE user_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'active'`
  ).get(userId, appointmentDate, appointmentTime);
  if (conflict) {
    res.status(409).json({ error: 'Bu tarih ve saatte zaten bir randevu mevcut' });
    return;
  }

  const stmt = db.prepare(
    `INSERT INTO appointments (user_id, customer_name, customer_phone, service_type, service_fee, appointment_date, appointment_time) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(userId, customerName, customerPhone, serviceType, serviceFee, appointmentDate, appointmentTime);

  const created = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// DELETE /api/appointments/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;
  const id = parseInt(req.params.id, 10);

  const appointment = db.prepare(
    `SELECT * FROM appointments WHERE id = ? AND user_id = ?`
  ).get(id, userId) as { id: number; customer_name: string; service_type: string; service_fee: number; appointment_date: string; appointment_time: string; status: string } | undefined;

  if (!appointment) {
    res.status(404).json({ error: 'Randevu bulunamadı' });
    return;
  }

  db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(id);

  // İptal servisini asenkron olarak tetikle (yanıtı bloklamadan)
  setImmediate(() => {
    handleCancellation(userId, appointment).catch(console.error);
  });

  res.json({ message: 'Randevu iptal edildi', id });
});

export default router;
