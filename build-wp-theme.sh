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
mkdir -p wordpress-theme/assets/css
mkdir -p wordpress-theme/assets/js
mkdir -p wordpress-theme/assets/images

# Copy CSS
if [ -f dist/public/assets/*.css ]; then
    cp dist/public/assets/*.css wordpress-theme/assets/css/main.css 2>/dev/null || true
    echo "  ✓ Copied CSS files"
fi

# Copy JS
if [ -f dist/public/assets/*.js ]; then
    cp dist/public/assets/*.js wordpress-theme/assets/js/main.js 2>/dev/null || true
    echo "  ✓ Copied JS files"
fi

# Copy attached assets/images
if [ -d "attached_assets" ]; then
    cp -r attached_assets/* wordpress-theme/assets/images/ 2>/dev/null || true
    echo "  ✓ Copied images"
fi

# Copy reference index.html
if [ -f dist/public/index.html ]; then
    cp dist/public/index.html wordpress-theme/index.html.reference
    echo "  ✓ Copied index.html as reference"
fi

echo ""
echo "✅ WordPress theme build complete!"
echo ""
echo "📦 Theme location: ./wordpress-theme/"
echo "📖 See wordpress-theme/README.md for installation instructions"
echo ""
