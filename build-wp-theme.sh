#!/bin/bash

# Build WordPress Theme Script
# Usage: bash build-wp-theme.sh

echo "🚀 Building WordPress theme..."
echo ""

# Build the Vite app
echo "📦 Building React application..."
vite build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ React app built successfully"
echo ""

# Copy built assets to WordPress theme
echo "📁 Copying assets to WordPress theme..."

# Create directories if they don't exist
mkdir -p wordpress-theme/assets

# Remove old assets to prevent stale files
rm -rf wordpress-theme/assets/*

# Copy ALL assets from Vite build (preserving hashed filenames)
if [ -d "dist/public/assets" ]; then
    cp -r dist/public/assets/* wordpress-theme/assets/
    echo "  ✓ Copied all Vite assets (CSS, JS, images) with original filenames"
fi

# Copy attached assets/images
if [ -d "attached_assets" ]; then
    mkdir -p wordpress-theme/assets/images
    cp -r attached_assets/* wordpress-theme/assets/images/ 2>/dev/null || true
    echo "  ✓ Copied attached images"
fi

# Copy reference index.html and extract asset filenames
if [ -f dist/public/index.html ]; then
    cp dist/public/index.html wordpress-theme/index.html.reference
    echo "  ✓ Copied index.html as reference"
    
    # Extract CSS and JS filenames for manifest
    CSS_FILE=$(grep -oP 'assets/[^"]+\.css' dist/public/index.html | head -1)
    JS_FILE=$(grep -oP 'assets/[^"]+\.js' dist/public/index.html | head -1)
    
    # Create a manifest file for functions.php to read
    cat > wordpress-theme/asset-manifest.php <<EOF
<?php
// Auto-generated asset manifest
// Do not edit manually - regenerate with build-wp-theme.sh
return array(
    'css' => '${CSS_FILE}',
    'js' => '${JS_FILE}',
);
EOF
    echo "  ✓ Created asset manifest"
fi

echo ""
echo "✅ WordPress theme build complete!"
echo ""
echo "📦 Theme location: ./wordpress-theme/"
echo "📖 See wordpress-theme/README.md for installation instructions"
echo ""
