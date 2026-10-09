import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(projectRoot, '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const secretLine = envContent.match(/^JWT_SECRET=(.*)$/m);

if (secretLine?.[1]) {
  if (Buffer.byteLength(secretLine[1].trim(), 'utf8') < 32) {
    throw new Error('.env contains a JWT_SECRET shorter than 32 bytes. Replace it with a secure random secret.');
  }
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString('base64url');
const nextContent = secretLine
  ? envContent.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
  : `${envContent}${envContent && !envContent.endsWith('\n') ? '\n' : ''}JWT_SECRET=${secret}\n`;

fs.writeFileSync(envPath, nextContent, { mode: 0o600 });
console.log('Created a private local JWT_SECRET in .env. It remains stable across local restarts.');
