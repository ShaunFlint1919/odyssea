<?php
/**
 * Plugin Activation Handler
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Activator Class
 */
class Odyssea_Activator {
    
    /**
     * Run on plugin activation
     */
    public static function activate() {
        // Check if pages already created
        $pages_created = get_option('odyssea_pages_created', false);
        
        if (!$pages_created) {
            self::create_pages();
            self::create_menu();
            update_option('odyssea_pages_created', true);
        }
        
        // Set default options
        self::set_default_options();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Create plugin pages
     */
    private static function create_pages() {
        $pages = array(
            'accueil' => array(
                'title' => 'Accueil',
                'slug' => 'accueil',
                'content' => '[odyssea_home]',
                'is_front' => true
            ),
            'renata-franca' => array(
                'title' => 'Renata Franca',
                'slug' => 'renata-franca',
                'content' => '[odyssea_renata_franca]',
                'is_front' => false
            ),
            'drainage-lymphatique' => array(
                'title' => 'Drainage Lymphatique',
                'slug' => 'drainage-lymphatique',
                'content' => '[odyssea_drainage]',
                'is_front' => false
            ),
            'soins-cicatrices' => array(
                'title' => 'Soins de Cicatrices',
                'slug' => 'soins-cicatrices',
                'content' => '[odyssea_cicatrices]',
                'is_front' => false
            ),
            'epilation-laser' => array(
                'title' => 'Épilation Laser',
                'slug' => 'epilation-laser',
                'content' => '[odyssea_epilation]',
                'is_front' => false
            )
        );
        
        $created_pages = array();
        
        foreach ($pages as $key => $page) {
            // Check if page already exists
            $existing_page = get_page_by_path($page['slug']);
            
            if (!$existing_page) {
                $page_id = wp_insert_post(array(
                    'post_title' => $page['title'],
                    'post_name' => $page['slug'],
                    'post_content' => $page['content'],
                    'post_status' => 'publish',
                    'post_type' => 'page',
                    'post_author' => 1,
                    'comment_status' => 'closed',
                    'ping_status' => 'closed'
                ));
                
                if ($page_id && !is_wp_error($page_id)) {
                    $created_pages[$key] = $page_id;
                    
                    // Set as front page if specified
                    if ($page['is_front']) {
                        update_option('page_on_front', $page_id);
                        update_option('show_on_front', 'page');
                    }
                }
            } else {
                $created_pages[$key] = $existing_page->ID;
                
                if ($page['is_front']) {
                    update_option('page_on_front', $existing_page->ID);
                    update_option('show_on_front', 'page');
                }
            }
        }
        
        // Store page IDs for later reference
        update_option('odyssea_page_ids', $created_pages);
    }
    
    /**
     * Create navigation menu
     */
    private static function create_menu() {
        // Check if menu already exists
        $menu_name = 'Odyssea Lymphea Menu';
        $menu_exists = wp_get_nav_menu_object($menu_name);
        
        if (!$menu_exists) {
            // Create the menu
            $menu_id = wp_create_nav_menu($menu_name);
            
            // Get created page IDs
            $page_ids = get_option('odyssea_page_ids', array());
            
            $menu_items = array(
                array('id' => 'accueil', 'title' => 'Accueil'),
                array('id' => 'renata-franca', 'title' => 'Renata Franca'),
                array('id' => 'drainage-lymphatique', 'title' => 'Drainage Lymphatique'),
                array('id' => 'soins-cicatrices', 'title' => 'Soins de Cicatrices'),
                array('id' => 'epilation-laser', 'title' => 'Épilation Laser')
            );
            
            $position = 0;
            foreach ($menu_items as $item) {
                if (isset($page_ids[$item['id']])) {
                    wp_update_nav_menu_item($menu_id, 0, array(
                        'menu-item-title' => $item['title'],
                        'menu-item-object-id' => $page_ids[$item['id']],
                        'menu-item-object' => 'page',
                        'menu-item-type' => 'post_type',
                        'menu-item-status' => 'publish',
                        'menu-item-position' => $position++
                    ));
                }
            }
            
            // Assign to primary location if available
            $locations = get_theme_mod('nav_menu_locations');
            if (!is_array($locations)) {
                $locations = array();
            }
            
            if (!isset($locations['primary'])) {
                $locations['primary'] = $menu_id;
                set_theme_mod('nav_menu_locations', $locations);
            }
            
            update_option('odyssea_menu_id', $menu_id);
        }
    }
    
    /**
     * Set default plugin options
     */
    private static function set_default_options() {
        $default_settings = array(
            'clinic_name' => 'Odyssea Lymphea',
            'address' => 'Rue de la station, 70 - 1410 Waterloo',
            'phone' => '+32 494 74 17 77',
            'email' => 'odyssea.lymphea@gmail.com',
            'hours' => 'Lun-Ven: 9h-18h | Sam: 9h-13h',
            'facebook' => '',
            'instagram' => ''
        );
        
        // Only set if not already set
        if (!get_option('odyssea_settings')) {
            add_option('odyssea_settings', $default_settings);
        }
    }
}
