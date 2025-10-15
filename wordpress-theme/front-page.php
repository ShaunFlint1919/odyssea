<?php
/**
 * Front Page Template (Homepage)
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

get_header();
?>

<main class="site-main">
    <!-- Info Section - Right below navigation -->
    <section class="section" style="padding-top: 5rem; padding-bottom: 3rem; border-bottom: 1px solid var(--border);">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h3 class="footer-heading">Emplacement</h3>
                    <div class="footer-content">
                        <p>Rue de la station, 70</p>
                        <p>1410 Waterloo</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="footer-heading">Heures d'ouverture</h3>
                    <div class="footer-content">
                        <p>Lundi - Jeudi : 9h - 19h</p>
                        <p>Vendredi : 9h - 18h</p>
                        <p>Samedi : 9h30 - 13h</p>
                        <p>Dimanche : Fermé</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="footer-heading">Contact</h3>
                    <div class="footer-content">
                        <p><a href="tel:+32494741777">+32 494 74 17 77</a></p>
                        <p><a href="mailto:odyssea.lymphea@gmail.com">odyssea.lymphea@gmail.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Hero Section -->
    <section class="section section-gradient-3" style="min-height: 80vh; display: flex; align-items: center; position: relative;">
        <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.2);"></div>
        <div class="container-lg" style="position: relative; z-index: 10;">
            <div class="grid grid-2" style="gap: 3rem; align-items: center;">
                <div class="fade-in visible">
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3.75rem); margin-bottom: 2rem;">
                        L'art du soin en douceur
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 2rem; color: hsl(30 12% 35%);">
                        Entre science et présence
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Chez Odyssea Lymphea, le soin commence par l'écoute. Nous vous accompagnons 
                            avec expertise et bienveillance dans votre parcours de bien-être.
                        </p>
                        <p>
                            Spécialisées en drainage lymphatique, soins de cicatrices et épilation laser, 
                            nous combinons techniques avancées et approche humaine.
                        </p>
                    </div>
                </div>
                <div class="fade-in visible">
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/hero-image-1.jpg'); ?>" 
                         alt="Soins du visage professionnels - Odyssea Lymphea"
                         style="width: 100%; height: clamp(300px, 50vw, 600px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Section 1 - Notre expertise -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/hero-image-2.jpg'); ?>" 
                         alt="Soins du visage et bien-être chez Odyssea Lymphea"
                         style="width: 100%; height: clamp(250px, 40vw, 500px); object-fit: cover; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div>
                    <h2 class="primary-text" style="margin-bottom: 2rem;">
                        Notre expertise à votre service
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 30%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes 
                            spécialisées dans le traitement des pathologies lymphatiques et les soins de cicatrices.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Formées à la technique Renata Franca, technique brésilienne à effets immédiats, 
                            nous combinons décongestionnement lymphatique, remodelage du corps et bien-être.
                        </p>
                        <p>
                            Nous nous formons régulièrement aux dernières techniques kinésithérapeutiques 
                            et aux soins esthétiques avancés.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 2 - Résultats -->
    <section class="section section-gradient-2" style="color: hsl(30 15% 25%);">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 4rem; align-items: center;">
                <div style="order: 2;">
                    <h2 style="color: hsl(30 12% 30%); margin-bottom: 2rem;">
                        Résultats visibles et durables
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Nos techniques permettent d'obtenir des résultats remarquables en drainage lymphatique, 
                            avec des effets visibles dès la première séance.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Que ce soit pour réduire la rétention d'eau, améliorer la circulation, 
                            ou accompagner un processus de cicatrisation, nous adaptons chaque soin à vos besoins.
                        </p>
                        <p>
                            L'épilation laser de dernière génération nous permet de traiter tous les phototypes 
                            de peau (I à VI) en toute sécurité.
                        </p>
                    </div>
                </div>
                <div style="order: 1;">
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/results-image.jpg'); ?>" 
                         alt="Résultats drainage lymphatique - Transformation visible des jambes"
                         style="width: 100%; height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
            </div>
        </div>
    </section>

    <!-- Section 3 - Services -->
    <section class="section" style="background: linear-gradient(135deg, hsl(45 25% 96%), hsl(38 45% 90%), hsl(35 50% 85%));">
        <div class="container-lg text-center">
            <h2 class="primary-text" style="margin-bottom: 4rem;">
                Nos spécialités
            </h2>
            <div class="grid grid-3" style="gap: 3rem;">
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">
                        Drainage Lymphatique
                    </h3>
                    <p style="color: hsl(30 12% 30%); line-height: 1.8;">
                        Techniques conventionnelles et Renata Franca pour un drainage efficace 
                        et des résultats immédiats.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">
                        Soins de Cicatrices
                    </h3>
                    <p style="color: hsl(30 12% 30%); line-height: 1.8;">
                        Accompagnement pré et post-opératoire pour optimiser 
                        la cicatrisation et réduire les adhérences.
                    </p>
                </div>
                <div class="service-card">
                    <h3 class="primary-text" style="margin-bottom: 1.5rem;">
                        Épilation Laser
                    </h3>
                    <p style="color: hsl(30 12% 30%); line-height: 1.8;">
                        Technologie diode dernière génération adaptée 
                        à tous types de peau pour une épilation définitive.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 4 - L'art du soin esthétique -->
    <section class="section section-gradient-3 text-center">
        <div class="container">
            <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/art-soin-image.jpg'); ?>" 
                 alt="L'art du soin esthétique - Produits et soins de qualité"
                 style="width: 100%; height: auto; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); margin-bottom: 3rem;">
            <div style="color: hsl(30 12% 30%);">
                <p style="font-size: 1.125rem; max-width: 48rem; margin: 0 auto;">
                    Découvrez nos techniques exclusives qui allient savoir-faire traditionnel et innovations technologiques 
                    pour révéler votre beauté naturelle.
                </p>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="section section-gradient-3 text-center">
        <div class="container">
            <h2 style="margin-bottom: 2rem;">
                Prêt à commencer votre parcours bien-être ?
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%); line-height: 1.8;">
                Réservez votre consultation personnalisée et découvrez comment nous pouvons vous accompagner.
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

    <!-- About Section -->
    <section class="section" style="background: rgba(0, 0, 0, 0.02);">
        <div class="container-lg">
            <div class="grid grid-2" style="gap: 3rem; align-items: center;">
                <div>
                    <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/cabinet-image.jpg'); ?>" 
                         alt="Salon de soins modernes Odyssea Lymphea - Ambiance zen et relaxante" 
                         style="width: 100%; height: auto; border-radius: var(--radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); padding: 0.5rem; background: rgba(255, 255, 255, 0.5);">
                </div>
                <div>
                    <h2 style="margin-bottom: 1.5rem;">
                        Cabinet de kinésithérapie <span class="primary-text">esthétique</span> à Waterloo
                    </h2>
                    <div class="muted-text" style="line-height: 1.8; margin-bottom: 2rem;">
                        <p style="margin-bottom: 1.5rem;">
                            Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes spécialisées dans le traitement 
                            des pathologies lymphatiques et les soins de cicatrices. Nous sommes aussi formées à la technique 
                            Renata Franca, technique brésilienne à effets immédiats.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Cette technique combine à la fois la décongestionnement lymphatique, le remodelage du corps mais aussi la détente et le bien-être.
                        </p>
                        <p>
                            Nous utilisons la dernière génération de machine épilation laser diode qui nous permet de traiter 
                            la totalité des phototypes de peau de 0 à VI (peaux blanches à peaux noires).
                        </p>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; align-items: center;">
                            <svg style="color: var(--primary); margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Formées aux techniques Renata Franca et Vodder</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <svg style="color: var(--primary); margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                            <span>Plus de 5 ans d'expérience à Bruxelles</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <svg style="color: var(--primary); margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                            </svg>
                            <span>Équipement laser de dernière génération</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
