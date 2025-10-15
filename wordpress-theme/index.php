<?php
/**
 * Main Index Template
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

get_header();
?>

<main class="site-main" style="padding-top: 5rem;">
    <div class="container">
        <?php
        if (have_posts()) :
            while (have_posts()) :
                the_post();
                ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                    <header class="entry-header">
                        <h1><?php the_title(); ?></h1>
                    </header>
                    <div class="entry-content">
                        <?php the_content(); ?>
                    </div>
                </article>
                <?php
            endwhile;
        else :
            ?>
            <p>Aucun contenu trouvé.</p>
            <?php
        endif;
        ?>
    </div>
</main>

<?php
get_footer();
