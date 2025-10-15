<?php
/**
 * Template Controller - Takes full control of page display
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Template Class
 */
class Odyssea_Template {
    
    /**
     * Initialize template filters
     */
    public function init() {
        add_filter('template_include', array($this, 'load_custom_template'), 99);
        add_action('wp_head', array($this, 'add_custom_head'), 1);
        add_filter('show_admin_bar', array($this, 'hide_admin_bar_on_odyssea_pages'));
    }
    
    /**
     * Load custom template for Odyssea pages
     */
    public function load_custom_template($template) {
        // Check if we're on an Odyssea page
        if (!$this->is_odyssea_page()) {
            return $template;
        }
        
        // Use our custom template
        $custom_template = ODYSSEA_PLUGIN_DIR . 'templates/full-page-template.php';
        
        if (file_exists($custom_template)) {
            return $custom_template;
        }
        
        return $template;
    }
    
    /**
     * Add custom head elements
     */
    public function add_custom_head() {
        if (!$this->is_odyssea_page()) {
            return;
        }
        
        // Preload Google Fonts
        echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
        echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        echo '<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">';
        
        // Add viewport meta
        echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    }
    
    /**
     * Hide admin bar on Odyssea pages
     */
    public function hide_admin_bar_on_odyssea_pages($show_admin_bar) {
        if ($this->is_odyssea_page()) {
            return false;
        }
        return $show_admin_bar;
    }
    
    /**
     * Check if current page is an Odyssea page
     */
    private function is_odyssea_page() {
        global $post;
        
        if (!is_a($post, 'WP_Post')) {
            return false;
        }
        
        $page_ids = get_option('odyssea_page_ids', array());
        return in_array(get_the_ID(), $page_ids);
    }
}
