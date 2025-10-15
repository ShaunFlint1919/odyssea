<?php
/**
 * Full Page Template - Complete control over page display
 * This template bypasses the theme completely
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get page content
global $post;
$content = apply_filters('the_content', $post->post_content);

// Get settings
$settings = get_option('odyssea_settings', array(
    'clinic_name' => 'Odyssea Lymphea',
    'address' => 'Rue de la station, 70 - 1410 Waterloo',
    'phone' => '+32 494 74 17 77',
    'email' => 'odyssea.lymphea@gmail.com',
    'hours' => 'Lun-Ven: 9h-18h | Sam: 9h-13h',
    'facebook' => '',
    'instagram' => ''
));

// Get menu items
$menu_locations = get_nav_menu_locations();
$menu_items = array();
if (isset($menu_locations['primary'])) {
    $menu_items = wp_get_nav_menu_items($menu_locations['primary']);
}

// If no menu, create default menu from pages
if (empty($menu_items)) {
    $page_ids = get_option('odyssea_page_ids', array());
    $menu_items = array();
    foreach ($page_ids as $key => $page_id) {
        $page = get_post($page_id);
        if ($page) {
            $menu_items[] = (object) array(
                'ID' => $page->ID,
                'title' => $page->post_title,
                'url' => get_permalink($page->ID)
            );
        }
    }
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html($post->post_title); ?> - <?php echo esc_html($settings['clinic_name']); ?></title>
    
    <!-- Preconnect to Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
    
    <!-- Plugin Styles -->
    <link rel="stylesheet" href="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/css/odyssea-style.css?v=' . ODYSSEA_VERSION); ?>">
    
    <?php wp_head(); ?>
    
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--odyssea-font-body, 'EB Garamond', Georgia, serif);
            background: var(--odyssea-background, hsl(45 25% 96%));
            color: var(--odyssea-foreground, hsl(30 15% 25%));
            line-height: 1.6;
        }
        
        /* Remove WordPress admin bar space */
        body.admin-bar {
            margin-top: 0 !important;
        }
        
        /* Navigation */
        .odyssea-navigation {
            background: var(--odyssea-background, hsl(45 25% 96%));
            border-bottom: 1px solid var(--odyssea-border, hsl(45 18% 88%));
            position: sticky;
            top: 0;
            z-index: 50;
            padding: 1rem 0;
        }
        
        .odyssea-nav-container {
            max-width: 1536px;
            margin: 0 auto;
            padding: 0 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .odyssea-nav-brand {
            font-family: var(--odyssea-font-heading, 'Optima', sans-serif);
            font-size: 1.5rem;
            font-weight: 300;
            color: var(--odyssea-primary, hsl(38 45% 55%));
            text-decoration: none;
        }
        
        .odyssea-nav-menu {
            display: flex;
            gap: 2rem;
            list-style: none;
            flex-wrap: wrap;
        }
        
        .odyssea-nav-menu a {
            color: var(--odyssea-foreground);
            text-decoration: none;
            transition: color 0.2s;
        }
        
        .odyssea-nav-menu a:hover {
            color: var(--odyssea-primary);
        }
        
        .odyssea-nav-menu a.active {
            color: var(--odyssea-primary);
            font-weight: 500;
        }
        
        /* Mobile Navigation */
        .odyssea-nav-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--odyssea-foreground);
        }
        
        @media (max-width: 768px) {
            .odyssea-nav-toggle {
                display: block;
            }
            
            .odyssea-nav-menu {
                display: none;
                width: 100%;
                flex-direction: column;
                gap: 1rem;
            }
            
            .odyssea-nav-menu.active {
                display: flex;
            }
        }
        
        /* Main content */
        main {
            min-height: calc(100vh - 200px);
        }
        
        /* Footer */
        .odyssea-footer {
            background: var(--odyssea-card, hsl(45 25% 97%));
            border-top: 1px solid var(--odyssea-border);
            padding: 3rem 0 2rem;
            margin-top: 4rem;
        }
        
        .odyssea-footer-container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 1rem;
            text-align: center;
        }
        
        .odyssea-footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
            text-align: left;
        }
        
        .odyssea-footer h3 {
            font-family: var(--odyssea-font-heading);
            font-weight: 500;
            margin-bottom: 1rem;
            color: var(--odyssea-primary);
        }
        
        .odyssea-footer p {
            color: var(--odyssea-muted-foreground);
            font-size: 0.875rem;
        }
        
        .odyssea-footer a {
            color: var(--odyssea-muted-foreground);
            transition: color 0.2s;
        }
        
        .odyssea-footer a:hover {
            color: var(--odyssea-primary);
        }
        
        .odyssea-footer-bottom {
            padding-top: 2rem;
            border-top: 1px solid var(--odyssea-border);
            color: var(--odyssea-muted-foreground);
            font-size: 0.875rem;
        }
    </style>
</head>
<body <?php body_class('odyssea-full-page'); ?>>

<!-- Navigation -->
<nav class="odyssea-navigation">
    <div class="odyssea-nav-container">
        <a href="<?php echo esc_url(home_url('/')); ?>" class="odyssea-nav-brand">
            <?php echo esc_html($settings['clinic_name']); ?>
        </a>
        
        <button class="odyssea-nav-toggle" onclick="this.nextElementSibling.classList.toggle('active')">
            ☰
        </button>
        
        <ul class="odyssea-nav-menu">
            <?php 
            $current_url = get_permalink();
            foreach ($menu_items as $item): 
                $is_active = ($current_url === $item->url) ? 'active' : '';
            ?>
                <li>
                    <a href="<?php echo esc_url($item->url); ?>" class="<?php echo $is_active; ?>">
                        <?php echo esc_html($item->title); ?>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
</nav>

<!-- Main Content -->
<main>
    <?php echo $content; ?>
</main>

<!-- Footer -->
<footer class="odyssea-footer">
    <div class="odyssea-footer-container">
        <div class="odyssea-footer-grid">
            <div>
                <h3>Emplacement</h3>
                <p><?php echo nl2br(esc_html($settings['address'])); ?></p>
            </div>
            
            <div>
                <h3>Heures d'ouverture</h3>
                <p><?php echo nl2br(esc_html($settings['hours'])); ?></p>
            </div>
            
            <div>
                <h3>Contact</h3>
                <p>
                    <a href="tel:<?php echo esc_attr($settings['phone']); ?>"><?php echo esc_html($settings['phone']); ?></a><br>
                    <a href="mailto:<?php echo esc_attr($settings['email']); ?>"><?php echo esc_html($settings['email']); ?></a>
                </p>
                <?php if (!empty($settings['facebook']) || !empty($settings['instagram'])): ?>
                    <p style="margin-top: 0.5rem;">
                        <?php if (!empty($settings['facebook'])): ?>
                            <a href="<?php echo esc_url($settings['facebook']); ?>" target="_blank">Facebook</a>
                        <?php endif; ?>
                        <?php if (!empty($settings['facebook']) && !empty($settings['instagram'])): ?>
                            |
                        <?php endif; ?>
                        <?php if (!empty($settings['instagram'])): ?>
                            <a href="<?php echo esc_url($settings['instagram']); ?>" target="_blank">Instagram</a>
                        <?php endif; ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="odyssea-footer-bottom">
            <p>&copy; <?php echo date('Y'); ?> <?php echo esc_html($settings['clinic_name']); ?>. Tous droits réservés.</p>
        </div>
    </div>
</footer>

<!-- Plugin Scripts -->
<script src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/js/animations.js?v=' . ODYSSEA_VERSION); ?>"></script>

<?php wp_footer(); ?>

</body>
</html>
