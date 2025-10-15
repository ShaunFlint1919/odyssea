<?php
/**
 * Plugin Name: Odyssea Lymphea
 * Plugin URI: https://odyssealymphea.be
 * Description: Plugin complet pour le site du cabinet de kinésithérapie Odyssea Lymphea - Drainage lymphatique, soins de cicatrices et épilation laser à Waterloo
 * Version: 1.0.0
 * Author: Odyssea Lymphea
 * Author URI: https://odyssealymphea.be
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: odyssea-lymphea
 * Domain Path: /languages
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ODYSSEA_VERSION', '1.0.0');
define('ODYSSEA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ODYSSEA_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ODYSSEA_PLUGIN_FILE', __FILE__);

/**
 * Main Plugin Class
 */
class Odyssea_Lymphea_Plugin {
    
    /**
     * Instance of this class
     */
    private static $instance = null;
    
    /**
     * Get instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->load_dependencies();
        $this->define_hooks();
    }
    
    /**
     * Load required files
     */
    private function load_dependencies() {
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-activator.php';
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-deactivator.php';
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-assets.php';
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-blocks.php';
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-shortcodes.php';
        require_once ODYSSEA_PLUGIN_DIR . 'includes/class-settings.php';
    }
    
    /**
     * Define WordPress hooks
     */
    private function define_hooks() {
        // Assets
        $assets = new Odyssea_Assets();
        add_action('wp_enqueue_scripts', array($assets, 'enqueue_frontend_assets'));
        add_action('admin_enqueue_scripts', array($assets, 'enqueue_admin_assets'));
        
        // Blocks
        $blocks = new Odyssea_Blocks();
        add_action('init', array($blocks, 'register_blocks'));
        
        // Shortcodes
        $shortcodes = new Odyssea_Shortcodes();
        add_action('init', array($shortcodes, 'register_shortcodes'));
        
        // Settings
        $settings = new Odyssea_Settings();
        add_action('admin_menu', array($settings, 'add_settings_page'));
        add_action('admin_init', array($settings, 'register_settings'));
    }
}

/**
 * Activation hook
 */
register_activation_hook(__FILE__, array('Odyssea_Activator', 'activate'));

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, array('Odyssea_Deactivator', 'deactivate'));

/**
 * Initialize the plugin
 */
function odyssea_lymphea_init() {
    return Odyssea_Lymphea_Plugin::get_instance();
}

// Start the plugin
odyssea_lymphea_init();
