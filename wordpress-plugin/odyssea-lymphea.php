<?php
/**
 * Plugin Name: Odyssea Lymphea
 * Description: Cabinet de kinésithérapie Odyssea Lymphea - Waterloo
 * Version: 1.0.2
 * Author: Odyssea Lymphea
 * Text Domain: odyssea-lymphea
 */

if (!defined('ABSPATH')) exit;

define('ODYSSEA_VERSION', '1.0.2');
define('ODYSSEA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ODYSSEA_PLUGIN_URL', plugin_dir_url(__FILE__));

// Activation
register_activation_hook(__FILE__, 'odyssea_activate');
function odyssea_activate() {
    $pages = array(
        array('title' => 'Accueil', 'slug' => 'accueil', 'content' => '[odyssea_home]'),
        array('title' => 'Renata Franca', 'slug' => 'renata-franca', 'content' => '[odyssea_renata_franca]'),
        array('title' => 'Drainage Lymphatique', 'slug' => 'drainage-lymphatique', 'content' => '[odyssea_drainage]'),
        array('title' => 'Soins de Cicatrices', 'slug' => 'soins-cicatrices', 'content' => '[odyssea_cicatrices]'),
        array('title' => 'Épilation Laser', 'slug' => 'epilation-laser', 'content' => '[odyssea_epilation]')
    );
    
    $page_ids = array();
    foreach ($pages as $page) {
        $existing = get_page_by_path($page['slug']);
        if (!$existing) {
            $page_id = wp_insert_post(array(
                'post_title' => $page['title'],
                'post_name' => $page['slug'],
                'post_content' => $page['content'],
                'post_status' => 'publish',
                'post_type' => 'page'
            ));
            $page_ids[] = $page_id;
        }
    }
    
    if (!empty($page_ids)) {
        update_option('page_on_front', $page_ids[0]);
        update_option('show_on_front', 'page');
    }
}

// Shortcodes
add_action('init', 'odyssea_register_shortcodes');
function odyssea_register_shortcodes() {
    add_shortcode('odyssea_home', 'odyssea_home_shortcode');
    add_shortcode('odyssea_renata_franca', 'odyssea_renata_shortcode');
    add_shortcode('odyssea_drainage', 'odyssea_drainage_shortcode');
    add_shortcode('odyssea_cicatrices', 'odyssea_cicatrices_shortcode');
    add_shortcode('odyssea_epilation', 'odyssea_epilation_shortcode');
}

function odyssea_home_shortcode() {
    ob_start();
    include ODYSSEA_PLUGIN_DIR . 'templates/page-home.php';
    return ob_get_clean();
}

function odyssea_renata_shortcode() {
    ob_start();
    include ODYSSEA_PLUGIN_DIR . 'templates/page-renata-franca.php';
    return ob_get_clean();
}

function odyssea_drainage_shortcode() {
    ob_start();
    include ODYSSEA_PLUGIN_DIR . 'templates/page-drainage.php';
    return ob_get_clean();
}

function odyssea_cicatrices_shortcode() {
    ob_start();
    include ODYSSEA_PLUGIN_DIR . 'templates/page-cicatrices.php';
    return ob_get_clean();
}

function odyssea_epilation_shortcode() {
    ob_start();
    include ODYSSEA_PLUGIN_DIR . 'templates/page-epilation.php';
    return ob_get_clean();
}

// Enqueue styles
add_action('wp_enqueue_scripts', 'odyssea_enqueue_assets');
function odyssea_enqueue_assets() {
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'odyssea_')) {
        wp_enqueue_style('odyssea-style', ODYSSEA_PLUGIN_URL . 'assets/css/odyssea-style.css', array(), ODYSSEA_VERSION);
        wp_enqueue_style('odyssea-fonts', 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap');
        wp_enqueue_script('odyssea-js', ODYSSEA_PLUGIN_URL . 'assets/js/animations.js', array(), ODYSSEA_VERSION, true);
    }
}
