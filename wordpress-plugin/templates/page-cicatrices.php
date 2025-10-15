<?php
/**
 * Soins Cicatrices Page Template
 * Used by [odyssea_cicatrices] shortcode
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
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3rem); margin-bottom: 1.5rem;">Soins de Cicatrices</h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.25rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">Accompagnement pré et post-opératoire</p>
                    <p style="line-height: 1.7;">Nos soins spécialisés de cicatrices vous accompagnent avant et après votre chirurgie pour optimiser le processus de cicatrisation.</p>
                </div>
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/scar-treatment.jpg'); ?>" 
                         alt="Soins de cicatrices"
                         style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-1">
        <div class="odyssea-container">
            <h2 class="odyssea-primary-text odyssea-text-center" style="margin-bottom: 3rem;">Nos protocoles de soins</h2>
            <div class="odyssea-grid odyssea-grid-2">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Préparation pré-opératoire</h3>
                    <p>Préparez votre peau et vos tissus avant l'intervention chirurgicale pour optimiser la cicatrisation.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Soins post-opératoires</h3>
                    <p>Accompagnement après chirurgie pour favoriser une cicatrisation optimale et réduire les complications.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Traitement de cicatrices anciennes</h3>
                    <p>Techniques spécialisées pour améliorer l'apparence et la fonction des cicatrices existantes.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Drainage lymphatique spécifique</h3>
                    <p>Drainage ciblé pour optimiser la cicatrisation et réduire l'inflammation.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-2 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="color: hsl(30 12% 30%); margin-bottom: 2rem;">Tarifs et forfaits</h2>
            <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.6); padding: 2rem; border-radius: var(--radius);">
                <p style="margin-bottom: 1rem;">Les tarifs varient selon le type de soin et la zone à traiter. Contactez-nous pour un devis personnalisé adapté à vos besoins spécifiques.</p>
                <p style="font-size: 1.25rem; color: var(--primary); margin-bottom: 0.5rem;">À partir de 60 € par séance</p>
                <p style="font-size: 0.9rem; color: hsl(30 12% 40%);">Forfaits disponibles pour un suivi complet</p>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-3 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="margin-bottom: 1.5rem;">Planifiez votre consultation</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <a href="tel:<?php echo esc_attr($settings['phone']); ?>" class="odyssea-button-minimal">Appeler maintenant</a>
                <a href="mailto:<?php echo esc_attr($settings['email']); ?>" class="odyssea-button-outline">Envoyer un email</a>
            </div>
        </div>
    </section>
</div>
