/**
 * Build script for WordPress theme
 * This script builds the React app and copies assets to the wordpress-theme directory
 */

import { execSync } from 'child_process';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Building WordPress theme...\n');

// Step 1: Build the Vite app
console.log('📦 Building React application...');
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ React app built successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy built assets to WordPress theme
console.log('📁 Copying assets to WordPress theme...');

const distDir = join(__dirname, 'dist/public');
const themeAssetsDir = join(__dirname, 'wordpress-theme/assets');

// Ensure theme assets directories exist
['css', 'js', 'images'].forEach(dir => {
  const dirPath = join(themeAssetsDir, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
});

// Copy CSS files
function copyDirectory(src, dest) {
  if (!existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return;
  }

  const files = readdirSync(src);
  
  files.forEach(file => {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    const stat = statSync(srcPath);
    
    if (stat.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`  ✓ Copied: ${file}`);
    }
  });
}

// Copy assets
const assetsDist = join(distDir, 'assets');
if (existsSync(assetsDist)) {
  const files = readdirSync(assetsDist);
  
  files.forEach(file => {
    const srcPath = join(assetsDist, file);
    
    if (file.endsWith('.css')) {
      copyFileSync(srcPath, join(themeAssetsDir, 'css', 'main.css'));
      console.log(`  ✓ Copied CSS: ${file} → main.css`);
    } else if (file.endsWith('.js')) {
      copyFileSync(srcPath, join(themeAssetsDir, 'js', 'main.js'));
      console.log(`  ✓ Copied JS: ${file} → main.js`);
    }
  });
}

// Copy index.html as reference (optional)
if (existsSync(join(distDir, 'index.html'))) {
  copyFileSync(
    join(distDir, 'index.html'), 
    join(__dirname, 'wordpress-theme', 'index.html.reference')
  );
  console.log('  ✓ Copied index.html as reference');
}

// Copy attached assets/images
const attachedAssetsDir = join(__dirname, 'attached_assets');
const themeImagesDir = join(themeAssetsDir, 'images');

if (existsSync(attachedAssetsDir)) {
  console.log('\n📸 Copying images...');
  copyDirectory(attachedAssetsDir, themeImagesDir);
}

console.log('\n✅ WordPress theme build complete!');
console.log('\n📦 Theme location: ./wordpress-theme/');
console.log('📖 See wordpress-theme/README.md for installation instructions\n');
