const path = require('node:path');
const fs = require('node:fs');

const lockPath = path.resolve('apps/web/.next-web/lock-test');
fs.mkdirSync(path.dirname(lockPath), { recursive: true });

try {
  const { Lockfile } = require('next/dist/build/lockfile');
  const lf = Lockfile.tryAcquire(lockPath);
  console.log('acquired?', lf !== undefined, 'path', lockPath);
  if (lf) {
    lf.unlockSync();
    console.log('unlocked');
  }
} catch (e) {
  console.error('error', e);
}
