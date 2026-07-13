import { google } from 'googleapis';

export class CalendarService {
  static async listUpcomingAppointments(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    try {
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items;
      if (!events || events.length === 0) {
        console.log('[TAKVİM] Yaklaşan randevu bulunamadı.');
        return [];
      }

      console.log(`[TAKVİM] ${events.length} adet yaklaşan randevu başarıyla okundu.`);
      return events;
    } catch (error) {
      console.error('[Takvim Hatası]:', error.message);
      throw error;
    }
  }
}
