import 'dotenv/config';
import app from './app';
import { getDb } from './db';

const PORT = parseInt(process.env.PORT || '4000', 10);

// Veritabanını başlat (migration çalıştırır)
getDb();

app.listen(PORT, () => {
  console.log(`✅ RandevuKurtaran AI backend ${PORT} portunda çalışıyor`);
});
