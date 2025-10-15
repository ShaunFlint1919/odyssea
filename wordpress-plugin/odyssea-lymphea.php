<?php
/**
 * Plugin Name: Odyssea Lymphea
 * Plugin URI: https://odyssealymphea.be
 * Description: Site complet pour Odyssea Lymphea - Kinésithérapie à Waterloo
 * Version: 1.0.1
 * Author: Odyssea Lymphea
 * Author URI: https://odyssealymphea.be
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: odyssea-lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define constants
define('ODYSSEA_VERSION', '1.0.1');
define('ODYSSEA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ODYSSEA_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include only essential files
require_once ODYSSEA_PLUGIN_DIR . 'includes/class-activator.php';
require_once ODYSSEA_PLUGIN_DIR . 'includes/class-shortcodes.php';
require_once ODYSSEA_PLUGIN_DIR . 'includes/class-settings.php';

// Activation hook
register_activation_hook(__FILE__, array('Odyssea_Activator', 'activate'));

// Register shortcodes
add_action('init', function() {
    $shortcodes = new Odyssea_Shortcodes();
    $shortcodes->register_shortcodes();
});

// Add settings page
add_action('admin_menu', function() {
    $settings = new Odyssea_Settings();
    $settings->add_settings_page();
});

add_action('admin_init', function() {
    $settings = new Odyssea_Settings();
    $settings->register_settings();
});

// Enqueue styles and scripts
add_action('wp_enqueue_scripts', function() {
    global $post;
    
    if (!is_a($post, 'WP_Post')) {
        return;
    }
    
    $odyssea_shortcodes = array('odyssea_home', 'odyssea_renata_franca', 'odyssea_drainage', 'odyssea_cicatrices', 'odyssea_epilation');
    
    foreach ($odyssea_shortcodes as $shortcode) {
        if (has_shortcode($post->post_content, $shortcode)) {
            wp_enqueue_style('odyssea-main', ODYSSEA_PLUGIN_URL . 'assets/css/odyssea-style.css', array(), ODYSSEA_VERSION);
            wp_enqueue_style('odyssea-fonts', 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap', array(), null);
            wp_enqueue_script('odyssea-animations', ODYSSEA_PLUGIN_URL . 'assets/js/animations.js', array(), ODYSSEA_VERSION, true);
            break;
        }
    }
});
