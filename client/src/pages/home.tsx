import Navigation from "@/components/navigation";
import HomeHero from "@/components/home-hero";
import AboutSection from "@/components/about-section";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Set page title and meta description for SEO
    document.title = "Odyssea Lymphea - Kinésithérapeutes à Waterloo | Drainage Lymphatique";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Cabinet de kinésithérapie spécialisé en drainage lymphatique, traitement de cicatrices et épilation laser à Waterloo. Techniques Renata Franca et Vodder. Prenez rendez-vous.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Cabinet de kinésithérapie spécialisé en drainage lymphatique, traitement de cicatrices et épilation laser à Waterloo. Techniques Renata Franca et Vodder. Prenez rendez-vous.';
      document.head.appendChild(meta);
    }

    // Add Open Graph tags for social media sharing
    const ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    ogTitle.setAttribute('content', 'Odyssea Lymphea - Kinésithérapeutes à Waterloo');
    document.head.appendChild(ogTitle);

    const ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    ogDescription.setAttribute('content', 'Cabinet de kinésithérapie spécialisé en drainage lymphatique, traitement de cicatrices et épilation laser à Waterloo.');
    document.head.appendChild(ogDescription);

    const ogType = document.createElement('meta');
    ogType.setAttribute('property', 'og:type');
    ogType.setAttribute('content', 'website');
    document.head.appendChild(ogType);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Info Section - Right below navigation */}
      <section className="pt-20 pb-12 border-b" data-testid="info-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-16 text-center">
            <div data-testid="info-location">
              <h3 className="font-medium text-foreground mb-4">Emplacement</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                <p data-testid="text-address-street">Rue de la station, 70</p>
                <p data-testid="text-address-city">1410 Waterloo</p>
              </div>
            </div>
            
            <div data-testid="info-hours">
              <h3 className="font-medium text-foreground mb-4">Heures d'ouverture</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                <p>Lundi - Jeudi : 9h - 19h</p>
                <p>Vendredi : 9h - 18h</p>
                <p>Samedi : 9h30 - 13h</p>
                <p data-testid="text-hours-closed">Dimanche : Fermé</p>
              </div>
            </div>
            
            <div data-testid="info-contact">
              <h3 className="font-medium text-foreground mb-4">Contact</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                <p data-testid="text-phone">+32 494 74 17 77</p>
                <p data-testid="text-email">odyssea.lymphea@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeHero />
      <AboutSection />
      <MinimalFooter />
    </div>
  );
}
