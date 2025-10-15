<?php
/**
 * Main template file for Odyssea Lymphea theme
 */

get_header(); ?>

<main id="main-content">
  <div id="app"></div>

  <!-- Intégration du front-end généré par Vite ou Replit -->
  <script type="module" src="<?php echo get_template_directory_uri(); ?>/client/main.js"></script>
  <link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/client/style.css">
</main>

<?php get_footer(); ?>
