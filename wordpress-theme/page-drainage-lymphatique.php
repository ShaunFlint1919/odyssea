<?php
/**
 * Template Name: Drainage Lymphatique
 * Template for conventional lymphatic drainage page
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

get_header();
?>

<main class="site-main">
    <!-- Hero Section -->
    <section class="section section-gradient-3" style="min-height: 80vh; display: flex; align-items: center; position: relative; padding-top: 5rem;">
        <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.2);"></div>
        <div class="container-lg" style="position: relative; z-index: 10;">
            <div class="grid grid-2" style="gap: 3rem; align-items: center;">
                <div>
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3.75rem); margin-bottom: 2rem;">
                        Drainage Lymphatique Conventionnel
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 2rem; color: hsl(30 12% 35%);">
                        Méthode Vodder - Approche thérapeutique douce
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Le drainage lymphatique manuel conventionnel selon la méthode Vodder est une technique douce et rythmée qui stimule la circulation de la lymphe.
                        </p>
                        <p>
                            Cette approche thérapeutique favorise l'élimination des toxines et renforce le système immunitaire de manière naturelle et harmonieuse.
                        </p>
                    </div>
                </div>
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/drainage-conventional.jpg'); ?>" 
                         alt="Drainage lymphatique conventionnel - Méthode Vodder"
                         style="width: 100%; height: clamp(300px, 50vw, 600px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Benefits Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container">
            <h2 class="primary-text text-center" style="margin-bottom: 4rem;">
                Les bienfaits du drainage lymphatique
            </h2>
            <div class="grid grid-3" style="gap: 2rem;">
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Santé circulatoire</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Améliore la circulation lymphatique et sanguine, réduit la rétention d'eau et les jambes lourdes.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Système immunitaire</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Stimule les défenses naturelles du corps et favorise l'élimination des toxines.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Bien-être global</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Procure une profonde détente, réduit le stress et améliore la qualité du sommeil.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Technique Section -->
    <section class="section section-gradient-2">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div>
                    <h2 style="color: hsl(30 12% 30%); margin-bottom: 2rem;">
                        Notre approche thérapeutique
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Formées à la méthode Vodder, nous pratiquons un drainage lymphatique manuel avec des mouvements doux, lents et rythmés qui respectent le sens de circulation naturel de la lymphe.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Cette technique est particulièrement indiquée pour :
                        </p>
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin-bottom: 0.75rem;">✓ Œdèmes et rétention d'eau</li>
                            <li style="margin-bottom: 0.75rem;">✓ Jambes lourdes et circulation</li>
                            <li style="margin-bottom: 0.75rem;">✓ Post-opératoire et cicatrisation</li>
                            <li style="margin-bottom: 0.75rem;">✓ Renforcement immunitaire</li>
                            <li style="margin-bottom: 0.75rem;">✓ Détente et relaxation profonde</li>
                        </ul>
                    </div>
                </div>
                <div>
                    <div style="background: rgba(255, 255, 255, 0.6); padding: 2rem; border-radius: var(--radius);">
                        <h3 class="primary-text" style="margin-bottom: 1.5rem;">Tarifs</h3>
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Séance 60 minutes</h4>
                            <p style="font-size: 1.5rem; color: var(--primary);">75 €</p>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Séance 90 minutes</h4>
                            <p style="font-size: 1.5rem; color: var(--primary);">95 €</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="section section-gradient-3 text-center">
        <div class="container">
            <h2 style="margin-bottom: 2rem;">
                Prenez rendez-vous pour votre drainage
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%);">
                Contactez-nous pour réserver votre séance de drainage lymphatique conventionnel.
            </p>
            <div style="display: flex; flex-direction: column; gap: 1.5rem; justify-content: center; align-items: center;">
                <a href="tel:+32494741777" class="button-minimal">
                    Appeler maintenant
                </a>
                <a href="mailto:odyssea.lymphea@gmail.com" class="button-outline">
                    Envoyer un email
                </a>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
