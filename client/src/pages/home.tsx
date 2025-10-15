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
      <section className="pt-20 pb-8 lg:pb-12 bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100" data-testid="info-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/60 p-6 rounded-lg shadow-md">
              <h3 className="font-medium text-stone-800 mb-3 heading-font">📍 Adresse</h3>
              <p className="text-stone-700 body-font text-sm">Rue de la station 70</p>
              <p className="text-stone-700 body-font text-sm">1410 Waterloo</p>
            </div>
            <div className="bg-white/60 p-6 rounded-lg shadow-md">
              <h3 className="font-medium text-stone-800 mb-3 heading-font">🕐 Horaires</h3>
              <p className="text-stone-700 body-font text-sm">Lun - Jeu : 9h - 19h</p>
              <p className="text-stone-700 body-font text-sm">Ven : 9h - 18h</p>
              <p className="text-stone-700 body-font text-sm">Sam : 9h30 - 13h</p>
            </div>
            <div className="bg-white/60 p-6 rounded-lg shadow-md">
              <h3 className="font-medium text-stone-800 mb-3 heading-font">📞 Contact</h3>
              <p className="text-stone-700 body-font text-sm">+32 494 74 17 77</p>
              <p className="text-stone-700 body-font text-sm">odyssea.lymphea@gmail.com</p>
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
