<?php
/**
 * Odyssea Lymphea Theme Functions
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme Setup
 */
function odyssea_theme_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
    add_theme_support('custom-logo', array(
        'height'      => 64,
        'width'       => 64,
        'flex-height' => true,
        'flex-width'  => true,
    ));

    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Menu Principal', 'odyssea-lymphea'),
        'mobile'  => __('Menu Mobile', 'odyssea-lymphea'),
    ));

    // Set content width
    if (!isset($content_width)) {
        $content_width = 1280;
    }
}
add_action('after_setup_theme', 'odyssea_theme_setup');

/**
 * Enqueue scripts and styles
 */
function odyssea_enqueue_scripts() {
    // Google Fonts
    wp_enqueue_style(
        'odyssea-google-fonts',
        'https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400&family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;500&display=swap',
        array(),
        null
    );

    // Theme stylesheet
    wp_enqueue_style('odyssea-style', get_stylesheet_uri(), array(), '1.0.0');

    // Theme scripts
    wp_enqueue_script(
        'odyssea-navigation',
        get_template_directory_uri() . '/js/navigation.js',
        array(),
        '1.0.0',
        true
    );

    wp_enqueue_script(
        'odyssea-animations',
        get_template_directory_uri() . '/js/animations.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'odyssea_enqueue_scripts');

/**
 * Register widget areas
 */
function odyssea_widgets_init() {
    register_sidebar(array(
        'name'          => __('Sidebar', 'odyssea-lymphea'),
        'id'            => 'sidebar-1',
        'description'   => __('Add widgets here.', 'odyssea-lymphea'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
}
add_action('widgets_init', 'odyssea_widgets_init');

/**
 * Custom navigation walker for better HTML structure
 */
class Odyssea_Walker_Nav_Menu extends Walker_Nav_Menu {
    function start_el(&$output, $item, $depth = 0, $args = null, $id = 0) {
        $classes = empty($item->classes) ? array() : (array) $item->classes;
        $class_names = join(' ', apply_filters('nav_menu_css_class', array_filter($classes), $item));
        $class_names = $class_names ? ' class="' . esc_attr($class_names) . '"' : '';

        $output .= '<li' . $class_names . '>';

        $attributes  = !empty($item->attr_title) ? ' title="'  . esc_attr($item->attr_title) .'"' : '';
        $attributes .= !empty($item->target)     ? ' target="' . esc_attr($item->target    ) .'"' : '';
        $attributes .= !empty($item->xfn)        ? ' rel="'    . esc_attr($item->xfn       ) .'"' : '';
        $attributes .= !empty($item->url)        ? ' href="'   . esc_attr($item->url       ) .'"' : '';

        $item_output = '<span' . $attributes . '>';
        $item_output .= apply_filters('the_title', $item->title, $item->ID);
        $item_output .= '</span>';

        $output .= apply_filters('walker_nav_menu_start_el', $item_output, $item, $depth, $args);
    }
}

/**
 * Add meta tags for SEO
 */
function odyssea_add_meta_tags() {
    if (is_front_page()) {
        echo '<meta name="description" content="Cabinet de kinésithérapie spécialisé en drainage lymphatique, traitement de cicatrices et épilation laser à Waterloo. Techniques Renata Franca et Vodder. Prenez rendez-vous.">' . "\n";
        echo '<meta property="og:title" content="Odyssea Lymphea - Kinésithérapeutes à Waterloo">' . "\n";
        echo '<meta property="og:description" content="Cabinet de kinésithérapie spécialisé en drainage lymphatique, traitement de cicatrices et épilation laser à Waterloo.">' . "\n";
        echo '<meta property="og:type" content="website">' . "\n";
    }
}
add_action('wp_head', 'odyssea_add_meta_tags');

/**
 * Customize excerpt length
 */
function odyssea_excerpt_length($length) {
    return 20;
}
add_filter('excerpt_length', 'odyssea_excerpt_length');

/**
 * Customize excerpt more
 */
function odyssea_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'odyssea_excerpt_more');

/**
 * Get template part with variables
 */
function odyssea_get_template_part($slug, $name = null, $args = array()) {
    if (!empty($args)) {
        set_query_var('template_args', $args);
    }
    get_template_part($slug, $name);
}
