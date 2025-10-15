<?php
/**
 * Uninstall handler
 * Fired when the plugin is uninstalled
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly or not uninstalling
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete plugin pages
$page_ids = get_option('odyssea_page_ids', array());
foreach ($page_ids as $page_id) {
    wp_delete_post($page_id, true);
}

// Delete menu
$menu_id = get_option('odyssea_menu_id');
if ($menu_id) {
    wp_delete_nav_menu($menu_id);
}

// Delete options
delete_option('odyssea_pages_created');
delete_option('odyssea_page_ids');
delete_option('odyssea_menu_id');
delete_option('odyssea_settings');

// Clear transients (if any in future)
delete_transient('odyssea_cache');
