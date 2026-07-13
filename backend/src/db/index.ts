import { runMigrations } from './migrate';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = runMigrations();
  }
  return db;
}
