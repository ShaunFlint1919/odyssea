#!/bin/bash

# Build WordPress Theme Script for Odyssea Lymphea
# This script builds the theme from within the theme directory
# Usage: bash build-theme.sh

echo "🚀 Building Odyssea Lymphea WordPress theme..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed!"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Build the Vite app
echo "📦 Building React application..."
npx vite build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ React app built successfully"
echo ""

# Verify the build output
if [ -f "client/main.js" ] && [ -f "client/style.css" ]; then
    echo "✅ Build files verified:"
    echo "   - client/main.js"
    echo "   - client/style.css"
else
    echo "⚠️  Warning: Expected build files not found"
    echo "   Looking for: client/main.js and client/style.css"
fi

echo ""
echo "✅ WordPress theme build complete!"
echo ""
echo "📦 Theme location: $(pwd)"
echo "📖 The theme is ready to be deployed to /wp-content/themes/odyssea/"
echo ""
echo "Files structure:"
echo "  - index.php (loads client/main.js and client/style.css)"
echo "  - functions.php (enqueues assets)"
echo "  - style.css (WordPress theme header)"
echo "  - client/main.js (compiled React app)"
echo "  - client/style.css (compiled styles)"
