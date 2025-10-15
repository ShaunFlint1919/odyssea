<?php
/**
 * Épilation Laser Page Template
 * Used by [odyssea_epilation] shortcode
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
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3rem); margin-bottom: 1.5rem;">Épilation Laser</h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.25rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">Technologie diode dernière génération</h1>
                    <p style="line-height: 1.7;">Nous utilisons la dernière génération de laser diode qui permet de traiter tous les types de peau en toute sécurité, des phototypes I à VI.</p>
                </div>
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/laser-epilation.jpg'); ?>" 
                         alt="Épilation laser"
                         style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-1">
        <div class="odyssea-container">
            <h2 class="odyssea-primary-text odyssea-text-center" style="margin-bottom: 3rem;">Notre technologie avancée</h2>
            <div class="odyssea-grid odyssea-grid-3">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Pour tous les types de peau</h3>
                    <p>Laser diode adapté aux phototypes I à VI, des peaux claires aux peaux foncées.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Confort optimal</h3>
                    <p>Système de refroidissement intégré pour un traitement confortable et sans douleur.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Résultats durables</h3>
                    <p>Épilation définitive avec des résultats visibles dès les premières séances.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-2">
        <div class="odyssea-container-lg">
            <h2 class="odyssea-text-center" style="color: hsl(30 12% 30%); margin-bottom: 3rem;">Zones traitées et tarifs</h2>
            <div class="odyssea-grid odyssea-grid-2">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1.5rem;">Zones du corps</h3>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem;">
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Maillot classique</span><strong>40 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Maillot intégral</span><strong>60 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Aisselles</span><strong>30 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Jambes complètes</span><strong>120 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0;"><span>Bras complets</span><strong>80 €</strong></li>
                    </ul>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1.5rem;">Zones du visage</h3>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem;">
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Lèvre supérieure</span><strong>25 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Menton</span><strong>25 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);"><span>Joues</span><strong>35 €</strong></li>
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0;"><span>Visage complet</span><strong>80 €</strong></li>
                    </ul>
                    <p style="margin-top: 1rem; font-size: 0.875rem; color: hsl(30 12% 35%);">💡 Forfaits de 6 à 10 séances disponibles avec tarifs préférentiels.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="odyssea-section odyssea-section-gradient-3 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="margin-bottom: 1.5rem;">Réservez votre consultation gratuite</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <a href="tel:<?php echo esc_attr($settings['phone']); ?>" class="odyssea-button-minimal">Appeler maintenant</a>
                <a href="mailto:<?php echo esc_attr($settings['email']); ?>" class="odyssea-button-outline">Envoyer un email</a>
            </div>
        </div>
    </section>
</div>
