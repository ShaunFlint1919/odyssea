<?php
/**
 * Shortcodes Handler
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shortcodes Class
 */
class Odyssea_Shortcodes {
    
    /**
     * Register all shortcodes
     */
    public function register_shortcodes() {
        add_shortcode('odyssea_home', array($this, 'render_home_page'));
        add_shortcode('odyssea_renata_franca', array($this, 'render_renata_franca_page'));
        add_shortcode('odyssea_drainage', array($this, 'render_drainage_page'));
        add_shortcode('odyssea_cicatrices', array($this, 'render_cicatrices_page'));
        add_shortcode('odyssea_epilation', array($this, 'render_epilation_page'));
    }
    
    /**
     * Get plugin settings
     */
    private function get_settings() {
        return get_option('odyssea_settings', array(
            'clinic_name' => 'Odyssea Lymphea',
            'address' => 'Rue de la station, 70 - 1410 Waterloo',
            'phone' => '+32 494 74 17 77',
            'email' => 'odyssea.lymphea@gmail.com',
            'hours' => 'Lun-Ven: 9h-18h | Sam: 9h-13h'
        ));
    }
    
    /**
     * Render homepage
     */
    public function render_home_page($atts) {
        $settings = $this->get_settings();
        ob_start();
        include ODYSSEA_PLUGIN_DIR . 'templates/page-home.php';
        return ob_get_clean();
    }
    
    /**
     * Render Renata Franca page
     */
    public function render_renata_franca_page($atts) {
        $settings = $this->get_settings();
        ob_start();
        include ODYSSEA_PLUGIN_DIR . 'templates/page-renata-franca.php';
        return ob_get_clean();
    }
    
    /**
     * Render Drainage page
     */
    public function render_drainage_page($atts) {
        $settings = $this->get_settings();
        ob_start();
        include ODYSSEA_PLUGIN_DIR . 'templates/page-drainage.php';
        return ob_get_clean();
    }
    
    /**
     * Render Cicatrices page
     */
    public function render_cicatrices_page($atts) {
        $settings = $this->get_settings();
        ob_start();
        include ODYSSEA_PLUGIN_DIR . 'templates/page-cicatrices.php';
        return ob_get_clean();
    }
    
    /**
     * Render Epilation page
     */
    public function render_epilation_page($atts) {
        $settings = $this->get_settings();
        ob_start();
        include ODYSSEA_PLUGIN_DIR . 'templates/page-epilation.php';
        return ob_get_clean();
    }
}
