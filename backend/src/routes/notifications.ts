import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { status } = req.query;

  let notifications;
  if (status && typeof status === 'string') {
    notifications = db.prepare(
      `SELECT * FROM notifications WHERE user_id = ? AND status = ? ORDER BY sent_at DESC`
    ).all(userId, status);
  } else {
    notifications = db.prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC`
    ).all(userId);
  }

  res.json(notifications);
});

export default router;
