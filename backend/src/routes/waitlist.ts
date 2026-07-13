import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { addWaitlistSchema } from '../schemas/waitlist.schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/waitlist
router.get('/', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;
  const entries = db.prepare(
    `SELECT * FROM waitlist WHERE user_id = ? ORDER BY queue_position ASC`
  ).all(userId);
  res.json(entries);
});

// POST /api/waitlist
router.post('/', requireAuth, (req: Request, res: Response) => {
  const result = addWaitlistSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Geçersiz istek verisi', fields: result.error.issues.map(i => i.path.join('.')) });
    return;
  }

  const db = getDb();
  const userId = req.user!.userId;
  const { customerName, customerPhone, preferredService } = result.data;

  // Mükerrer telefon kontrolü
  const existing = db.prepare(
    `SELECT id FROM waitlist WHERE user_id = ? AND customer_phone = ?`
  ).get(userId, customerPhone);
  if (existing) {
    res.status(409).json({ error: 'Bu telefon numarası zaten yedek listesinde' });
    return;
  }

  // Sıra numarası: mevcut en yüksek + 1
  const maxPos = db.prepare(
    `SELECT MAX(queue_position) as maxPos FROM waitlist WHERE user_id = ?`
  ).get(userId) as { maxPos: number | null };
  const queuePosition = (maxPos.maxPos ?? 0) + 1;

  const stmt = db.prepare(
    `INSERT INTO waitlist (user_id, customer_name, customer_phone, preferred_service, queue_position) VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(userId, customerName, customerPhone, preferredService ?? null, queuePosition);

  const created = db.prepare('SELECT * FROM waitlist WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// DELETE /api/waitlist/:id
router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;
  const id = parseInt(req.params.id, 10);

  const entry = db.prepare(
    `SELECT id, queue_position FROM waitlist WHERE id = ? AND user_id = ?`
  ).get(id, userId) as { id: number; queue_position: number } | undefined;

  if (!entry) {
    res.status(404).json({ error: 'Kayıt bulunamadı' });
    return;
  }

  const deletedPosition = entry.queue_position;

  db.prepare('DELETE FROM waitlist WHERE id = ?').run(id);

  // Sıra numaralarını yeniden düzenle
  db.prepare(
    `UPDATE waitlist SET queue_position = queue_position - 1 WHERE user_id = ? AND queue_position > ?`
  ).run(userId, deletedPosition);

  res.json({ message: 'Yedek liste kaydı silindi', id });
});

export default router;
