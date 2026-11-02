const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const isRoot = fs.existsSync('pwa') && fs.existsSync('pwa/package.json');

console.log(`[Build Runner] Starting build process... Current directory: ${process.cwd()}`);

if (isRoot) {
  console.log('[Build Runner] Running from repository root. Entering pwa directory to build...');
  try {
    // 確保 api 與 pwa/api 雙向同步
    const rootApi = path.join(process.cwd(), 'api');
    const pwaApi = path.join(process.cwd(), 'pwa', 'api');
    if (fs.existsSync(rootApi)) {
      if (!fs.existsSync(pwaApi)) fs.mkdirSync(pwaApi, { recursive: true });
      fs.cpSync(rootApi, pwaApi, { recursive: true });
    }

    execSync('npm install --prefix pwa', { stdio: 'inherit' });
    execSync('npm --prefix pwa run build', { stdio: 'inherit' });

    const pwaDist = path.join(process.cwd(), 'pwa', 'dist');
    const rootDist = path.join(process.cwd(), 'dist');

    if (fs.existsSync(pwaDist)) {
      if (!fs.existsSync(rootDist)) {
        fs.mkdirSync(rootDist, { recursive: true });
      }
      fs.cpSync(pwaDist, rootDist, { recursive: true });
      console.log(`[Build Runner] Successfully mirrored build artifacts from ${pwaDist} to ${rootDist}`);
    }
  } catch (err) {
    console.error('[Build Runner] Root build failed:', err);
    process.exit(1);
  }
} else {
  console.log('[Build Runner] Running inside pwa directory directly...');
  try {
    // 確保根目錄 api 鏡像存在
    const pwaApi = path.join(process.cwd(), 'api');
    const rootApi = path.join(process.cwd(), '..', 'api');
    if (fs.existsSync(pwaApi) && !fs.existsSync(rootApi)) {
      fs.mkdirSync(rootApi, { recursive: true });
      fs.cpSync(pwaApi, rootApi, { recursive: true });
    }
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('[Build Runner] PWA build failed:', err);
    process.exit(1);
  }
}

console.log('[Build Runner] Build completed successfully.');
