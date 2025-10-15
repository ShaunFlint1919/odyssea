<?php
/**
 * Template Name: Soins Cicatrices
 * Template for scar treatment services page
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
                        Soins de Cicatrices
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 2rem; color: hsl(30 12% 35%);">
                        Accompagnement pré et post-opératoire
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Nos soins spécialisés de cicatrices vous accompagnent avant et après votre chirurgie pour optimiser le processus de cicatrisation.
                        </p>
                        <p>
                            Nous utilisons des techniques avancées pour réduire les adhérences, améliorer l'élasticité des tissus et favoriser une cicatrisation harmonieuse.
                        </p>
                    </div>
                </div>
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/scar-treatment.jpg'); ?>" 
                         alt="Soins de cicatrices professionnels"
                         style="width: 100%; height: clamp(300px, 50vw, 600px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container">
            <h2 class="primary-text text-center" style="margin-bottom: 4rem;">
                Nos protocoles de soins
            </h2>
            <div class="grid grid-2" style="gap: 3rem;">
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Préparation pré-opératoire</h3>
                    <p style="color: hsl(30 12% 30%); margin-bottom: 1rem;">
                        Préparez votre peau et vos tissus avant l'intervention chirurgicale pour optimiser la cicatrisation.
                    </p>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: hsl(30 12% 35%);">
                        <li style="margin-bottom: 0.5rem;">• Drainage lymphatique préparatoire</li>
                        <li style="margin-bottom: 0.5rem;">• Amélioration de la circulation</li>
                        <li style="margin-bottom: 0.5rem;">• Renforcement des tissus</li>
                    </ul>
                </div>

                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Soins post-opératoires</h3>
                    <p style="color: hsl(30 12% 30%); margin-bottom: 1rem;">
                        Accompagnement après chirurgie pour favoriser une cicatrisation optimale et réduire les complications.
                    </p>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: hsl(30 12% 35%);">
                        <li style="margin-bottom: 0.5rem;">• Réduction des œdèmes</li>
                        <li style="margin-bottom: 0.5rem;">• Prévention des adhérences</li>
                        <li style="margin-bottom: 0.5rem;">• Amélioration de la souplesse</li>
                    </ul>
                </div>

                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Traitement de cicatrices anciennes</h3>
                    <p style="color: hsl(30 12% 30%); margin-bottom: 1rem;">
                        Techniques spécialisées pour améliorer l'apparence et la fonction des cicatrices existantes.
                    </p>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: hsl(30 12% 35%);">
                        <li style="margin-bottom: 0.5rem;">• Mobilisation tissulaire</li>
                        <li style="margin-bottom: 0.5rem;">• Amélioration de l'élasticité</li>
                        <li style="margin-bottom: 0.5rem;">• Réduction des adhérences</li>
                    </ul>
                </div>

                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">Drainage lymphatique spécifique</h3>
                    <p style="color: hsl(30 12% 30%); margin-bottom: 1rem;">
                        Drainage ciblé pour optimiser la cicatrisation et réduire l'inflammation.
                    </p>
                    <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: hsl(30 12% 35%);">
                        <li style="margin-bottom: 0.5rem;">• Élimination des toxines</li>
                        <li style="margin-bottom: 0.5rem;">• Réduction de l'inflammation</li>
                        <li style="margin-bottom: 0.5rem;">• Accélération de la guérison</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section class="section section-gradient-2">
        <div class="container text-center">
            <h2 style="color: hsl(30 12% 30%); margin-bottom: 3rem;">
                Tarifs et forfaits
            </h2>
            <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.6); padding: 2rem; border-radius: var(--radius);">
                <p style="color: hsl(30 12% 35%); margin-bottom: 2rem;">
                    Les tarifs varient selon le type de soin et la zone à traiter. Contactez-nous pour un devis personnalisé adapté à vos besoins spécifiques.
                </p>
                <p style="font-size: 1.25rem; color: var(--primary); margin-bottom: 1rem;">
                    À partir de 60 € par séance
                </p>
                <p style="font-size: 0.9rem; color: hsl(30 12% 40%);">
                    Forfaits disponibles pour un suivi complet pré et post-opératoire
                </p>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="section section-gradient-3 text-center">
        <div class="container">
            <h2 style="margin-bottom: 2rem;">
                Planifiez votre consultation
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%);">
                Contactez-nous pour discuter de vos besoins et établir un plan de soins personnalisé.
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
