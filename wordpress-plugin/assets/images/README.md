# Plugin Images

All images from the original Replit React site have been included in the WordPress plugin.

## Image List

| File | Size | Used On |
|------|------|---------|
| `logo.png` | 161KB | Site logo/branding |
| `hero-1.jpg` | 167KB | Homepage hero section (main image) |
| `hero-2.jpg` | 659KB | Homepage hero section (secondary) |
| `renata-logo.jpg` | 801KB | Renata Franca page - official logo |
| `renata-products.jpg` | 439KB | Renata Franca page - products |
| `drainage-results.jpg` | 467KB | Drainage page - before/after results |
| `drainage-conventional.jpg` | 633KB | Drainage page - treatment image |
| `scar-treatment.jpg` | 252KB | Soins Cicatrices page - treatment |
| `laser-epilation.jpg` | 358KB | Épilation Laser page - equipment |
| `cabinet.jpg` | 270KB | Multiple pages - salon interior |
| `results-image.jpg` | 78KB | Homepage - results showcase |
| `art-soin-image.jpg` | 203KB | Homepage - art of care section |

**Total:** 4.5MB

## Notes

- All images are optimized for web use
- Images maintain the same quality as the React site
- File names are simplified for WordPress compatibility
- Original images preserved in attached_assets folder

## Image Usage in Plugin

Images are referenced in the PHP templates using:
```php
<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/hero-1.jpg'); ?>
```

This automatically generates the correct URL regardless of WordPress installation path.
