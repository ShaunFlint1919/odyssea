<?php
/**
 * Drainage Lymphatique Page Template
 * Used by [odyssea_drainage] shortcode
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="odyssea-page">
    <section class="odyssea-section odyssea-section-gradient-3" style="min-height: 60vh; display: flex; align-items: center; padding-top: 4rem;">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center;">
                <div class="odyssea-fade-in">
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3rem); margin-bottom: 1.5rem;">Drainage Lymphatique Conventionnel</h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.25rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">Méthode Vodder - Approche thérapeutique douce</p>
                    <p style="line-height: 1.7;">Le drainage lymphatique manuel conventionnel selon la méthode Vodder est une technique douce et rythmée qui stimule la circulation de la lymphe.</p>
                </div>
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/drainage-conventional.jpg'); ?>" 
                         alt="Drainage lymphatique conventionnel"
                         style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-1">
        <div class="odyssea-container">
            <h2 class="odyssea-primary-text odyssea-text-center" style="margin-bottom: 3rem;">Les bienfaits du drainage lymphatique</h2>
            <div class="odyssea-grid odyssea-grid-3">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Santé circulatoire</h3>
                    <p>Améliore la circulation lymphatique et sanguine, réduit la rétention d'eau et les jambes lourdes.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Système immunitaire</h3>
                    <p>Stimule les défenses naturelles du corps et favorise l'élimination des toxines.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Bien-être global</h3>
                    <p>Procure une profonde détente, réduit le stress et améliore la qualité du sommeil.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-2">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center;">
                <div class="odyssea-fade-in">
                    <h2 style="color: hsl(30 12% 30%); margin-bottom: 1.5rem;">Notre approche thérapeutique</h2>
                    <p>Formées à la méthode Vodder, nous pratiquons un drainage lymphatique manuel avec des mouvements doux, lents et rythmés qui respectent le sens de circulation naturel de la lymphe.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Tarifs</h3>
                    <p><strong>Séance 60 minutes</strong> - 75 €</p>
                    <p><strong>Séance 90 minutes</strong> - 95 €</p>
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-3 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="margin-bottom: 1.5rem;">Prenez rendez-vous pour votre drainage</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <a href="tel:<?php echo esc_attr($settings['phone']); ?>" class="odyssea-button-minimal">Appeler maintenant</a>
                <a href="mailto:<?php echo esc_attr($settings['email']); ?>" class="odyssea-button-outline">Envoyer un email</a>
            </div>
        </div>
    </section>
</div>
