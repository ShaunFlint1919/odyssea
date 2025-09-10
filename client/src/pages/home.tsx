import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import AboutSection from "@/components/about-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import { useEffect } from "react";
import { useParallax } from "@/hooks/use-parallax";

export default function Home() {
  useParallax();
  
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
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
