<?php
/**
 * Renata Franca Page Template
 * Used by [odyssea_renata_franca] shortcode
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
    <!-- Hero Section -->
    <section class="odyssea-section odyssea-section-gradient-3" style="min-height: 70vh; display: flex; align-items: center; padding-top: 4rem;">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center;">
                <div class="odyssea-fade-in">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/renata-logo.jpg'); ?>" 
                             alt="Renata Franca"
                             style="max-width: 300px; width: 100%; height: auto;">
                    </div>
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3rem); margin-bottom: 1.5rem;">
                        Les soins Renata Franca
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.25rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">
                        Méthode exclusive provenant du Brésil
                    </p>
                    <div style="font-size: 1rem; color: hsl(30 12% 35%); line-height: 1.7;">
                        <p>Chez <?php echo esc_html($settings['clinic_name']); ?>, nous avons fait le choix du changement. Nous vous amenons au <strong>Brésil</strong>, chez Carmen célèbre de <strong>Renata Franca</strong>, pour une formation authentique en <strong>méthode originale</strong>.</p>
                    </div>
                </div>
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/renata-products.jpg'); ?>" 
                         alt="Produits Renata Franca"
                         style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Drainage Lymphatique -->
    <section class="odyssea-section odyssea-section-gradient-1">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center;">
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/drainage-results.jpg'); ?>" 
                         alt="Résultats drainage lymphatique"
                         style="width: 100%; height: auto; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div class="odyssea-fade-in">
                    <h2 class="odyssea-primary-text" style="margin-bottom: 1.5rem;">
                        Drainage Lymphatique Signature Renata Franca
                    </h2>
                    <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1rem;">
                        <h3 class="odyssea-primary-text" style="margin-bottom: 0.5rem;">80 minutes - 100 €</h3>
                        <p style="font-size: 0.875rem;">Le drainage lymphatique Renata Franca se distingue d'un drainage classique. C'est un massage <strong>ferme et rapide</strong>, qui utilise des <strong>pressions intenses</strong>, très spécialisé et segmenté.</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius);">
                        <h4 class="odyssea-primary-text" style="margin-bottom: 0.5rem;">Les bienfaits :</h4>
                        <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
                            <li>• Favorise une élimination efficace des déchets métaboliques</li>
                            <li>• Améliore les inflammations et réduit les gonflements</li>
                            <li>• Favorise l'élimination des toxines</li>
                            <li>• Stimulation du système immunitaire</li>
                            <li>• Soulage les jambes lourdes et favorise la circulation</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Massages Spécialisés -->
    <section class="odyssea-section odyssea-section-gradient-2">
        <div class="odyssea-container-lg">
            <h2 class="odyssea-text-center" style="color: hsl(30 12% 30%); margin-bottom: 3rem;">
                Massages Spécialisés
            </h2>
            <div class="odyssea-grid odyssea-grid-2">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Massage Remodelant - 60 min - 90 €</h3>
                    <p style="font-size: 0.875rem;">Ce massage très thérapeutique est destiné spécialement pour les <strong>zones graisseuses et la cellulite</strong>. Modifie les tissus pour apporter plus de fermeté et de tonus.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Miracle Touch - 60 min - 90 €</h3>
                    <p style="font-size: 0.875rem;">Le Miracle Touch combine les <strong>effets drainants du drainage lymphatique</strong> et les <strong>bienfaits anti-inflammatoires</strong> pour un soin complet.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Miracle Face - 90 min - 95 €</h3>
                    <p style="font-size: 0.875rem;">Le soin du visage qui change tout ! Le Miracle Face combine drainage et remodelage du visage selon la méthode Renata Franca.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Massage Relaxant - 60 min - 70 €</h3>
                    <p style="font-size: 0.875rem;">Un moment de détente pure et de bien-être avec un massage doux et relaxant du corps.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="odyssea-section odyssea-section-gradient-3 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="margin-bottom: 1.5rem;">Réservez votre soin Renata Franca</h2>
            <p style="font-size: 1.125rem; margin-bottom: 2rem; color: hsl(30 12% 30%);">
                Contactez-nous pour planifier votre rendez-vous et découvrir la méthode authentique Renata Franca.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <a href="tel:<?php echo esc_attr($settings['phone']); ?>" class="odyssea-button-minimal">
                    Appeler maintenant
                </a>
                <a href="mailto:<?php echo esc_attr($settings['email']); ?>" class="odyssea-button-outline">
                    Envoyer un email
                </a>
            </div>
        </div>
    </section>
</div>
