import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getSummary, getDailyBreakdown, getServiceBreakdown, exportJSON } from '../services/financial.service';

const router = Router();

function getDateParams(req: Request): { from: string; to: string } | null {
  const { from, to } = req.query;
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') return null;
  return { from, to };
}

router.get('/summary', requireAuth, (req: Request, res: Response) => {
  const params = getDateParams(req);
  if (!params) { res.status(400).json({ error: 'from ve to parametreleri gereklidir' }); return; }
  try {
    res.json(getSummary(req.user!.userId, params.from, params.to));
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.get('/daily', requireAuth, (req: Request, res: Response) => {
  const params = getDateParams(req);
  if (!params) { res.status(400).json({ error: 'from ve to parametreleri gereklidir' }); return; }
  try {
    res.json(getDailyBreakdown(req.user!.userId, params.from, params.to));
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.get('/services', requireAuth, (req: Request, res: Response) => {
  const params = getDateParams(req);
  if (!params) { res.status(400).json({ error: 'from ve to parametreleri gereklidir' }); return; }
  try {
    res.json(getServiceBreakdown(req.user!.userId, params.from, params.to));
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.get('/export', requireAuth, (req: Request, res: Response) => {
  const params = getDateParams(req);
  if (!params) { res.status(400).json({ error: 'from ve to parametreleri gereklidir' }); return; }
  try {
    const json = exportJSON(req.user!.userId, params.from, params.to);
    res.setHeader('Content-Disposition', `attachment; filename="finansal-rapor-${params.from}-${params.to}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

export default router;
