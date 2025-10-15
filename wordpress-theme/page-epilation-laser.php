<?php
/**
 * Template Name: Épilation Laser
 * Template for laser hair removal services page
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
                        Épilation Laser
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 2rem; color: hsl(30 12% 35%);">
                        Technologie diode dernière génération
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Nous utilisons la dernière génération de laser diode qui permet de traiter tous les types de peau en toute sécurité, des phototypes I à VI.
                        </p>
                        <p>
                            Une solution définitive et efficace pour une peau lisse et sans poils, avec un confort optimal pendant le traitement.
                        </p>
                    </div>
                </div>
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/laser-epilation.jpg'); ?>" 
                         alt="Épilation laser dernière génération"
                         style="width: 100%; height: clamp(300px, 50vw, 600px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Technology Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container">
            <h2 class="primary-text text-center" style="margin-bottom: 4rem;">
                Notre technologie avancée
            </h2>
            <div class="grid grid-3" style="gap: 2rem;">
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Pour tous les types de peau</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Laser diode adapté aux phototypes I à VI, des peaux claires aux peaux foncées.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Confort optimal</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Système de refroidissement intégré pour un traitement confortable et sans douleur.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1rem;">Résultats durables</h3>
                    <p style="color: hsl(30 12% 30%);">
                        Épilation définitive avec des résultats visibles dès les premières séances.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Zones & Pricing Section -->
    <section class="section section-gradient-2">
        <div class="container-lg">
            <h2 class="text-center" style="color: hsl(30 12% 30%); margin-bottom: 4rem;">
                Zones traitées et tarifs
            </h2>
            <div class="grid grid-2" style="gap: 3rem;">
                <div>
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Zones du corps</h3>
                    <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius);">
                        <ul style="list-style: none; padding: 0; color: hsl(30 12% 30%);">
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Maillot classique</span>
                                <span class="primary-text" style="font-weight: 500;">40 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Maillot intégral</span>
                                <span class="primary-text" style="font-weight: 500;">60 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Aisselles</span>
                                <span class="primary-text" style="font-weight: 500;">30 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Jambes complètes</span>
                                <span class="primary-text" style="font-weight: 500;">120 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Bras complets</span>
                                <span class="primary-text" style="font-weight: 500;">80 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                                <span>Dos ou torse</span>
                                <span class="primary-text" style="font-weight: 500;">100 €</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div>
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Zones du visage</h3>
                    <div style="background: rgba(255, 255, 255, 0.6); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 2rem;">
                        <ul style="list-style: none; padding: 0; color: hsl(30 12% 30%);">
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Lèvre supérieure</span>
                                <span class="primary-text" style="font-weight: 500;">25 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Menton</span>
                                <span class="primary-text" style="font-weight: 500;">25 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                                <span>Joues</span>
                                <span class="primary-text" style="font-weight: 500;">35 €</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                                <span>Visage complet</span>
                                <span class="primary-text" style="font-weight: 500;">80 €</span>
                            </li>
                        </ul>
                    </div>

                    <div style="background: rgba(45, 35, 25, 0.5); padding: 1.5rem; border-radius: var(--radius);">
                        <h4 style="color: hsl(30 12% 30%); margin-bottom: 1rem;">💡 Forfaits avantageux</h4>
                        <p style="color: hsl(30 12% 35%); font-size: 0.9rem;">
                            Forfaits de 6 à 10 séances disponibles avec tarifs préférentiels. Contactez-nous pour un devis personnalisé.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Process Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container">
            <h2 class="primary-text text-center" style="margin-bottom: 4rem;">
                Comment ça fonctionne ?
            </h2>
            <div class="grid grid-3" style="gap: 2rem;">
                <div class="text-center">
                    <div style="width: 60px; height: 60px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">1</div>
                    <h3 style="margin-bottom: 1rem;">Consultation</h3>
                    <p style="color: hsl(30 12% 35%);">
                        Évaluation de votre type de peau et définition du protocole adapté.
                    </p>
                </div>
                <div class="text-center">
                    <div style="width: 60px; height: 60px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">2</div>
                    <h3 style="margin-bottom: 1rem;">Traitement</h3>
                    <p style="color: hsl(30 12% 35%);">
                        Séances espacées de 4 à 8 semaines selon les zones traitées.
                    </p>
                </div>
                <div class="text-center">
                    <div style="width: 60px; height: 60px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">3</div>
                    <h3 style="margin-bottom: 1rem;">Résultats</h3>
                    <p style="color: hsl(30 12% 35%);">
                        Épilation définitive visible après 6 à 10 séances selon les zones.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="section section-gradient-3 text-center">
        <div class="container">
            <h2 style="margin-bottom: 2rem;">
                Réservez votre consultation gratuite
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%);">
                Contactez-nous pour planifier votre première consultation et obtenir un devis personnalisé.
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
