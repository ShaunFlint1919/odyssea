<?php
/**
 * Asset Management
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Assets Class
 */
class Odyssea_Assets {
    
    /**
     * Enqueue frontend assets
     * Only enqueued when Odyssea shortcodes/content is present
     */
    public function enqueue_frontend_assets() {
        global $post;
        
        // Check if any Odyssea shortcodes are present on the current page
        $odyssea_shortcodes = array(
            'odyssea_home',
            'odyssea_renata_franca',
            'odyssea_drainage',
            'odyssea_cicatrices',
            'odyssea_epilation'
        );
        
        $has_shortcode = false;
        
        if (is_a($post, 'WP_Post')) {
            foreach ($odyssea_shortcodes as $shortcode) {
                if (has_shortcode($post->post_content, $shortcode)) {
                    $has_shortcode = true;
                    break;
                }
            }
        }
        
        // Also check if we're on one of the plugin pages
        $page_ids = get_option('odyssea_page_ids', array());
        if (is_page() && in_array(get_the_ID(), $page_ids)) {
            $has_shortcode = true;
        }
        
        // Only enqueue if Odyssea content is present
        if (!$has_shortcode) {
            return;
        }
        
        // Main stylesheet - scoped to .odyssea-page
        wp_enqueue_style(
            'odyssea-main-style',
            ODYSSEA_PLUGIN_URL . 'assets/css/odyssea-style.css',
            array(),
            ODYSSEA_VERSION
        );
        
        // Google Fonts
        wp_enqueue_style(
            'odyssea-google-fonts',
            'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
            array(),
            null
        );
        
        // Navigation script
        wp_enqueue_script(
            'odyssea-navigation',
            ODYSSEA_PLUGIN_URL . 'assets/js/navigation.js',
            array(),
            ODYSSEA_VERSION,
            true
        );
        
        // Animations script
        wp_enqueue_script(
            'odyssea-animations',
            ODYSSEA_PLUGIN_URL . 'assets/js/animations.js',
            array(),
            ODYSSEA_VERSION,
            true
        );
    }
    
    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our settings page
        if ('settings_page_odyssea-lymphea' !== $hook) {
            return;
        }
        
        wp_enqueue_style(
            'odyssea-admin-style',
            ODYSSEA_PLUGIN_URL . 'assets/css/admin-style.css',
            array(),
            ODYSSEA_VERSION
        );
    }
}
