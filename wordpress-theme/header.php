<?php
/**
 * Header Template
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<nav class="site-navigation">
    <div class="nav-container">
        <div class="site-logo">
            <?php
            if (has_custom_logo()) {
                the_custom_logo();
            } else {
                ?>
                <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/logo.png'); ?>" 
                     alt="<?php bloginfo('name'); ?>" 
                     class="logo-image">
                <?php
            }
            ?>
            <div class="site-title">
                <a href="<?php echo esc_url(home_url('/')); ?>">
                    <?php bloginfo('name'); ?>
                </a>
            </div>
        </div>

        <!-- Desktop Menu -->
        <?php
        wp_nav_menu(array(
            'theme_location' => 'primary',
            'container'      => false,
            'menu_class'     => 'main-menu',
            'fallback_cb'    => false,
            'walker'         => new Odyssea_Walker_Nav_Menu(),
        ));
        ?>

        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
    </div>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
        <?php
        wp_nav_menu(array(
            'theme_location' => 'primary',
            'container'      => false,
            'fallback_cb'    => false,
        ));
        ?>
    </div>
</nav>
