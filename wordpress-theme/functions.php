<?php
/**
 * Odyssea Lymphea Theme Functions
 * 
 * @package Odyssea_Lymphea
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme Setup
 */
function odyssea_lymphea_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
}
add_action('after_setup_theme', 'odyssea_lymphea_setup');

/**
 * Enqueue React App Scripts and Styles
 */
function odyssea_lymphea_enqueue_scripts() {
    $theme_version = wp_get_theme()->get('Version');
    $theme_uri = get_template_directory_uri();
    
    // Enqueue compiled CSS from Vite build
    wp_enqueue_style(
        'odyssea-lymphea-main',
        $theme_uri . '/assets/css/main.css',
        array(),
        $theme_version
    );
    
    // Enqueue React app JavaScript
    wp_enqueue_script(
        'odyssea-lymphea-react-app',
        $theme_uri . '/assets/js/main.js',
        array(),
        $theme_version,
        true // Load in footer
    );
    
    // Pass WordPress data to React
    wp_localize_script('odyssea-lymphea-react-app', 'wpData', array(
        'siteUrl' => get_site_url(),
        'themePath' => $theme_uri,
        'siteName' => get_bloginfo('name'),
        'siteDescription' => get_bloginfo('description'),
        'restUrl' => rest_url(),
        'nonce' => wp_create_nonce('wp_rest'),
    ));
}
add_action('wp_enqueue_scripts', 'odyssea_lymphea_enqueue_scripts');

/**
 * Remove unnecessary WordPress elements for React SPA
 */
function odyssea_lymphea_clean_head() {
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'rsd_link');
    remove_action('wp_head', 'wp_shortlink_wp_head');
}
add_action('init', 'odyssea_lymphea_clean_head');

/**
 * Custom REST API endpoint for theme data (optional)
 */
function odyssea_lymphea_register_rest_routes() {
    register_rest_route('odyssea-lymphea/v1', '/settings', array(
        'methods' => 'GET',
        'callback' => 'odyssea_lymphea_get_settings',
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'odyssea_lymphea_register_rest_routes');

function odyssea_lymphea_get_settings() {
    return array(
        'siteName' => get_bloginfo('name'),
        'siteDescription' => get_bloginfo('description'),
        'address' => get_option('odyssea_address', 'Rue de la station, 70<br>1410 Waterloo'),
        'phone' => get_option('odyssea_phone', '+32 494 74 17 77'),
        'email' => get_option('odyssea_email', 'odyssea.lymphea@gmail.com'),
        'hours' => get_option('odyssea_hours', array(
            'monday_thursday' => '9h - 19h',
            'friday' => '9h - 18h',
            'saturday' => '9h30 - 13h',
            'sunday' => 'Fermé'
        )),
    );
}

/**
 * Add custom settings page in WordPress admin (optional)
 */
function odyssea_lymphea_add_admin_menu() {
    add_theme_page(
        'Odyssea Lymphea Settings',
        'Theme Settings',
        'manage_options',
        'odyssea-lymphea-settings',
        'odyssea_lymphea_settings_page'
    );
}
add_action('admin_menu', 'odyssea_lymphea_add_admin_menu');

function odyssea_lymphea_settings_page() {
    ?>
    <div class="wrap">
        <h1>Odyssea Lymphea Theme Settings</h1>
        <p>This theme is powered by React. Contact information and settings can be customized here or directly in the React source files.</p>
        <p><strong>Note:</strong> Currently, all content is managed within the React application. Future versions may add WordPress admin integration.</p>
    </div>
    <?php
}
