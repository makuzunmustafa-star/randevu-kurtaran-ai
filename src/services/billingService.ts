import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BillingService {
  /**
   * Randevu Kurtaran bir randevuyu başarıyla kurtardığında bu fonksiyon çağrılır.
   * İşletmenin kullanım limitini kontrol eder ve log kaydı oluşturur.
   */
  static async trackUsage(businessId: string, appointmentId: string) {
    try {
      // 1. İşletmenin aktif aboneliğini getir
      const subscription = await prisma.subscription.findUnique({
        where: { businessId },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        throw new Error('İşletmenin aktif bir aboneliği bulunamadı!');
      }

      // 2. Mevcut fatura dönemindeki toplam kullanım sayısını bul
      const currentUsageCount = await prisma.usageLog.count({
        where: {
          businessId,
          savedAt: {
            gte: subscription.currentPeriodStart,
            lte: subscription.currentPeriodEnd,
          },
        },
      });

      // 3. Limit Kontrolü (Örn: Başlangıç planı limiti 3 ise uyar)
      if (subscription.planName === 'free' && currentUsageCount >= 3) {
        console.log(`[UYARI] ${businessId} kodlu işletme ücretsiz limitini doldurdu. Ekstra ücretlendirilecek.`);
      }

      // 4. Kullanımı veritabanına log olarak kaydet
      const log = await prisma.usageLog.create({
        data: {
          businessId,
          appointmentId,
        },
      });

      console.log(`[BAŞARILI] Randevu kurtarıldı ve faturaya işlendi. Log ID: ${log.id}`);
      return log;
    } catch (error: any) {
      console.error('Kullanım takibi kaydedilirken hata oluştu:', error.message);
      throw error;
    }
  }
}
