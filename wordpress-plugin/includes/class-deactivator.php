<?php
/**
 * Plugin Deactivation Handler
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Deactivator Class
 */
class Odyssea_Deactivator {
    
    /**
     * Run on plugin deactivation
     */
    public static function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Note: We don't delete pages or settings on deactivation
        // This preserves content if the user reactivates the plugin
        // Cleanup happens on uninstall (uninstall.php)
    }
}
