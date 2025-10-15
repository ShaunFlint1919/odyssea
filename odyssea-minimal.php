<?php
/**
 * Plugin Name: Odyssea Lymphea
 * Version: 1.0.3
 * Author: Odyssea Lymphea
 */

if (!defined('ABSPATH')) exit;

// Activation - Créer les pages
register_activation_hook(__FILE__, function() {
    $pages = [
        ['title' => 'Accueil', 'slug' => 'accueil', 'content' => '<h1>Odyssea Lymphea</h1><p>Cabinet de kinésithérapie à Waterloo</p>']
    ];
    
    foreach ($pages as $page) {
        if (!get_page_by_path($page['slug'])) {
            wp_insert_post([
                'post_title' => $page['title'],
                'post_name' => $page['slug'],
                'post_content' => $page['content'],
                'post_status' => 'publish',
                'post_type' => 'page'
            ]);
        }
    }
});
