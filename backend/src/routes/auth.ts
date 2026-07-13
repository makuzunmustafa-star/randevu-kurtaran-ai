import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();
const BCRYPT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Geçersiz istek verisi', fields: result.error.issues.map(i => i.path.join('.')) });
    return;
  }

  const { email, password, businessName } = result.data;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const stmt = db.prepare('INSERT INTO users (email, password_hash, business_name) VALUES (?, ?, ?)');
  const info = stmt.run(email, passwordHash, businessName);

  res.status(201).json({ id: info.lastInsertRowid, email, businessName });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Geçersiz istek verisi' });
    return;
  }

  const { email, password } = result.data;
  const db = getDb();

  const user = db.prepare('SELECT id, email, password_hash, business_name FROM users WHERE email = ?').get(email) as
    | { id: number; email: string; password_hash: string; business_name: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    return;
  }

  const secret = process.env.JWT_SECRET!;
  const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '8h' });

  res.json({ token, user: { id: user.id, email: user.email, businessName: user.business_name } });
});

export default router;
