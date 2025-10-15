<?php
function odyssea_enqueue_assets() {
    // Charger les fichiers compilés de ton front
    wp_enqueue_style('odyssea-style', get_template_directory_uri() . '/client/style.css');
    wp_enqueue_script('odyssea-script', get_template_directory_uri() . '/client/main.js', array(), null, true);
}
add_action('wp_enqueue_scripts', 'odyssea_enqueue_assets');
