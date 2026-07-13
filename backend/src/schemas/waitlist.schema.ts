import { z } from 'zod';

const turkishPhoneRegex = /^5\d{9}$/;

export const addWaitlistSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().regex(turkishPhoneRegex, 'Telefon 10 rakam ve 5 ile başlamalıdır'),
  preferredService: z.string().max(100).optional(),
}).strict();

export type AddWaitlistInput = z.infer<typeof addWaitlistSchema>;
