import { Button } from "@/components/ui/button";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function HeroSection() {
  const { elementRef, isVisible } = useIntersectionObserver();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      id="accueil" 
      className="hero-gradient py-20 lg:py-32 pt-32"
      data-testid="hero-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={elementRef}
          className={`text-center max-w-4xl mx-auto scale-in ${
            isVisible ? "visible" : ""
          }`}
        >
          <h1 className="text-4xl lg:text-6xl font-light text-foreground mb-6 leading-tight floating-element" data-testid="hero-title">
            Kinésithérapeutes à <span className="text-gradient font-medium">Waterloo</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed" data-testid="hero-description">
            Bienvenue chez Odyssea Lymphea, un centre de kinésithérapie axé sur le drainage lymphatique, 
            le traitement de cicatrices et l'épilation au laser à Waterloo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" data-testid="hero-cta-buttons">
            <a
              href="https://salonkee.be/salon/odyssea-lymphea"
              target="_blank"
              rel="noopener noreferrer"
              className="button-modern text-primary-foreground px-8 py-4 rounded-lg font-medium inline-block h-auto text-center"
              data-testid="button-appointment"
            >
              Prendre rendez-vous
            </a>
            <Button
              variant="secondary"
              onClick={() => scrollToSection("services")}
              className="glass-effect text-secondary-foreground px-8 py-4 rounded-lg font-medium hover:scale-105 transition-all duration-300 h-auto"
              data-testid="button-services"
            >
              Nos services
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
