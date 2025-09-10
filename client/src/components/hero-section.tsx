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
          className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h1 className="text-4xl lg:text-6xl font-light text-foreground mb-6 leading-tight" data-testid="hero-title">
            Kinésithérapeutes à <span className="text-primary font-medium">Waterloo</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed" data-testid="hero-description">
            Bienvenue chez Odyssea Lymphea, un centre de kinésithérapie axé sur le drainage lymphatique, 
            le traitement de cicatrices et l'épilation au laser à Waterloo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" data-testid="hero-cta-buttons">
            <Button
              onClick={() => scrollToSection("contact")}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors h-auto"
              data-testid="button-appointment"
            >
              Prendre rendez-vous
            </Button>
            <Button
              variant="secondary"
              onClick={() => scrollToSection("services")}
              className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors h-auto"
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
