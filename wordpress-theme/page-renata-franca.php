<?php
/**
 * Template Name: Renata Franca
 * Template for the Renata Franca services page
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
            <div class="text-center" style="margin-bottom: 3rem;">
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: var(--radius); padding: 1.5rem; backdrop-filter: blur(4px); display: inline-block;">
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/renata-logo-horizontal.jpg'); ?>" 
                         alt="Méthode Renata França"
                         style="max-width: 28rem; width: 100%; height: auto; object-fit: contain;">
                </div>
            </div>
            <div class="grid grid-2" style="gap: 3rem; align-items: center;">
                <div>
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3.75rem); margin-bottom: 2rem;">
                        Les soins Renata Franca
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 2rem; color: hsl(30 12% 35%);">
                        Méthode exclusive provenant du Brésil
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Chez Odyssea Lymphea, nous avons fait le choix du changement, nous vous amenons au <strong>Brésil</strong>, chez Carmen célèbre de <strong>Renata Franca</strong>, pour une formation authentique en <strong>méthode originale</strong>.
                        </p>
                        <p>
                            <strong>Nos protocoles authentiques et uniques</strong> sont les fondements de notre savoir-être et bien-être pour notre clientèle.
                        </p>
                    </div>
                </div>
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/renata-products.jpg'); ?>" 
                         alt="Produits professionnels Renata França utilisés"
                         style="width: 100%; height: clamp(300px, 50vw, 600px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Drainage Lymphatique Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/drainage-results.jpg'); ?>" 
                         alt="Résultats drainage lymphatique Renata França - Transformation visible"
                         style="width: 100%; height: auto; object-fit: contain; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div>
                    <h2 class="primary-text" style="margin-bottom: 2rem;">
                        Drainage Lymphatique Signature Renata Franca
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 30%); line-height: 1.8;">
                        <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
                            <h3 class="primary-text" style="margin-bottom: 0.75rem;">80 minutes - 100 €</h3>
                            <p style="font-size: 0.875rem; margin-bottom: 1rem;">
                                Le drainage lymphatique Renata Franca se distingue d'un drainage classique. C'est un massage <strong>ferme et rapide</strong>, qui utilise des <strong>pressions intenses</strong>, très spécialisé et segmenté.
                            </p>
                        </div>
                        
                        <p style="margin-bottom: 1.5rem;">
                            Bien plus qu'un soin esthétique, c'est un véritable <strong>allié santé et bien-être</strong>, thérapeutique dans notre centre.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius);">
                            <h3 class="primary-text" style="margin-bottom: 0.75rem;">Les bienfaits :</h3>
                            <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
                                <li style="margin-bottom: 0.5rem;">• Favorise une élimination efficace des déchets métaboliques</li>
                                <li style="margin-bottom: 0.5rem;">• Améliore les inflammations et réduilt les gonflements</li>
                                <li style="margin-bottom: 0.5rem;">• Favorise l'élimination des toxines</li>
                                <li style="margin-bottom: 0.5rem;">• Stimulation du système immunitaire</li>
                                <li style="margin-bottom: 0.5rem;">• Soulage les jambes lourdes et favorise la circulation</li>
                                <li>• Aide à la détente et prévient les affaissements</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Massages Spécialisés Section -->
    <section class="section section-gradient-2">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div style="order: 2;">
                    <h2 style="color: hsl(30 12% 30%); margin-bottom: 2rem;">
                        Massages Spécialisés
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <div style="background: rgba(45, 35, 25, 0.5); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
                            <h3 style="color: hsl(30 12% 30%); margin-bottom: 0.75rem;">Massage Remodelant - 60 min - 90 €</h3>
                            <p style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                Ce massage très thérapeutique est destiné spécialement pour les <strong>zones graisseuses et la cellulite</strong>. Modifie les tissus pour apporter plus de fermeté et de tonus.
                            </p>
                            <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
                                <li style="margin-bottom: 0.25rem;">• Action puissante pour une cellulite localisée</li>
                                <li style="margin-bottom: 0.25rem;">• Gestes techniques pour plus de fermeté</li>
                                <li style="margin-bottom: 0.25rem;">• Amélioration de la tonicité cutanée</li>
                                <li>• Résultats visibles dès la première séance</li>
                            </ul>
                        </div>

                        <div style="background: rgba(45, 35, 25, 0.5); padding: 1.5rem; border-radius: var(--radius);">
                            <h3 style="color: hsl(30 12% 30%); margin-bottom: 0.75rem;">Miracle Touch - 60 min - 90 €</h3>
                            <p style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                Le Miracle Touch combine les <strong>effets drainants du drainage lymphatique</strong> et les <strong>bienfaits anti-inflammatoires</strong> pour un soin complet.
                            </p>
                            <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
                                <li style="margin-bottom: 0.25rem;">• Corps affiné sans souffrir</li>
                                <li style="margin-bottom: 0.25rem;">• Objectifs de fermeté</li>
                                <li style="margin-bottom: 0.25rem;">• Bien-être et détente profonde</li>
                                <li>• Soin lifting avec service immédiat</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div style="order: 1;">
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/massage-results.jpg'); ?>" 
                         alt="Résultats massage Renata França - Transformation visible avant/après"
                         style="width: 100%; height: auto; object-fit: contain; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
            </div>
        </div>
    </section>

    <!-- Soins Complémentaires Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/salon-atmosphere.jpg'); ?>" 
                         alt="Soins du visage Renata França - Drainage et bien-être"
                         style="width: 100%; height: auto; object-fit: contain; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div>
                    <h2 class="primary-text" style="margin-bottom: 2rem;">
                        Soins Complémentaires
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 30%); line-height: 1.8;">
                        <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
                            <h3 class="primary-text" style="margin-bottom: 0.75rem;">Miracle Face - 90 min - 95 €</h3>
                            <p style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                Le soin du visage qui change tout ! Le Miracle Face combine drainage et remodelage du visage selon la méthode Renata Franca.
                            </p>
                            <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
                                <li style="margin-bottom: 0.25rem;">• Drainage du visage et stimulation des points</li>
                                <li style="margin-bottom: 0.25rem;">• Amélioration de la souplesse musculaire</li>
                                <li style="margin-bottom: 0.25rem;">• Amélioration circulation sanguine + lymphatique</li>
                                <li style="margin-bottom: 0.25rem;">• Effets lifting du visage immédiat</li>
                                <li>• Amélioration de la fermeté</li>
                            </ul>
                        </div>

                        <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius);">
                            <h3 class="primary-text" style="margin-bottom: 0.75rem;">Massage Relaxant - 60 min - 70 €</h3>
                            <p style="font-size: 0.875rem;">
                                Un moment de détente pure et de bien-être avec un massage doux et relaxant du corps.
                            </p>
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
                Réservez votre soin Renata Franca
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%);">
                Contactez-nous pour planifier votre rendez-vous et découvrir la méthode authentique Renata Franca.
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
