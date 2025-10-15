<?php
/**
 * Gutenberg Blocks Registration
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Blocks Class
 */
class Odyssea_Blocks {
    
    /**
     * Register blocks
     */
    public function register_blocks() {
        // Register block category
        add_filter('block_categories_all', array($this, 'register_block_category'), 10, 2);
        
        // For now, blocks will be server-side rendered
        // In future versions, can be converted to React-based blocks
    }
    
    /**
     * Register custom block category
     */
    public function register_block_category($categories, $post) {
        return array_merge(
            $categories,
            array(
                array(
                    'slug' => 'odyssea-lymphea',
                    'title' => 'Odyssea Lymphea',
                    'icon' => 'heart'
                )
            )
        );
    }
}
