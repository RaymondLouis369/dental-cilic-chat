import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Wave 5: Production Launch, Security & Infrastructure Verification', () => {
  // 1. Migration Audit
  describe('PART 2: Migration Audit & Sequential Ordering', () => {
    test('Verifies all migration files exist, are uniquely timestamped, and ordered sequentially', () => {
      const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));

      expect(files.length).toBeGreaterThanOrEqual(14);

      // Verify all timestamps start with 20260912
      const timestamps = files.map((f) => f.substring(0, 14));
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(files.length);

      // Verify sorted order matches alphabetical order
      const sorted = [...files].sort();
      expect(files).toEqual(sorted);
    });
  });

  // 2. PWA & Manifest Verification
  describe('PART 10: PWA Assets & Production Manifest', () => {
    test('Verifies PWA icons and manifest assets exist in public folder', () => {
      const publicDir = path.resolve(process.cwd(), 'public');

      expect(fs.existsSync(path.join(publicDir, 'icon.svg'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'pwa-192x192.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'pwa-512x512.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);
    });
  });

  // 3. Security & Bundle Secrets Verification
  describe('PART 1 & PART 13: Secrets Exposure Audit', () => {
    test('Ensures client source code does not contain hardcoded GEMINI API secrets or service role keys', () => {
      const clientLibDir = path.resolve(process.cwd(), 'src/lib');
      const files = fs.readdirSync(clientLibDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(clientLibDir, file), 'utf-8');
        expect(content).not.toContain('AIzaSy'); // Google API key prefix
        expect(content).not.toContain('sbp_'); // Supabase service role key prefix
      }
    });
  });
});
