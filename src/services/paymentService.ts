import Iyzipay from 'iyzipay';

// iyzico API anahtarlarını tanımlıyoruz
const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-test-api-key',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-test-secret-key',
  uri: 'https://iyzipay.com' // Test (Sandbox) ortamı adresi
});

export class PaymentService {
  /**
   * İşletmenin kredi kartından abonelik ücretini veya kullanım bedelini tahsil eder.
   */
  static async createPayment(businessId: string, amount: string, email: string, cardHolderName: string) {
    return new Promise((resolve, reject) => {
      const request = {
        locale: 'tr',
        conversationId: Math.floor(Math.random() * 100000000).toString(),
        price: amount,
        paidPrice: amount,
        currency: 'TRY',
        basketId: `B_${businessId}_${Date.now()}`,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        buyer: {
          id: businessId,
          name: 'Randevu Kurtaran Üyesi',
          surname: 'İşletme',
          gsmNumber: '+905555555555',
          email: email,
          identityNumber: '11111111111',
          lastLoginDate: '2026-01-01 00:00:00',
          registrationDate: '2026-01-01 00:00:00',
          registrationAddress: 'İstanbul, Türkiye',
          ip: '85.105.0.1',
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34000'
        },
        shippingAddress: {
          contactName: cardHolderName,
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000'
        },
        billingAddress: {
          contactName: cardHolderName,
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000'
        },
        basketItems: [
          {
            id: 'BI_01',
            name: 'Randevu Kurtaran Aylık Kullanım Bedeli',
            category1: 'SaaS Hizmeti',
            itemType: 'VIRTUAL',
            price: amount
          }
        ]
      };

      // iyzico API'sine ödeme isteği gönderiliyor
      iyzipay.payment.create(request, (err: any, result: any) => {
        if (err) {
          console.error('[iyzico Hata]:', err);
          return reject(err);
        }
        if (result.status === 'success') {
          console.log(`[ÖDEME BAŞARILI] İşletme ID: ${businessId}, Tutar: ${amount} TL`);
          resolve(result);
        } else {
          console.error('[ÖDEME BAŞARISIZ]:', result.errorMessage);
          reject(new Error(result.errorMessage));
        }
      });
    });
  }
}
