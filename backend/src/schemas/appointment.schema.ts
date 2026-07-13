import { z } from 'zod';

const turkishPhoneRegex = /^5\d{9}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

export const createAppointmentSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().regex(turkishPhoneRegex, 'Telefon 10 rakam ve 5 ile başlamalıdır'),
  serviceType: z.string().min(1).max(100),
  serviceFee: z.number().positive('Hizmet ücreti sıfırdan büyük olmalıdır'),
  appointmentDate: z.string().regex(dateRegex, 'Tarih YYYY-MM-DD formatında olmalıdır'),
  appointmentTime: z.string().regex(timeRegex, 'Saat HH:MM formatında olmalıdır'),
}).strict().refine(
  (data) => {
    const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}:00`);
    return appointmentDateTime > new Date();
  },
  { message: 'Geçmiş tarih ve saate randevu eklenemez', path: ['appointmentDate'] }
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
