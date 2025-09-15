import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function MinimalHero() {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <section 
      id="accueil" 
      className="minimal-section py-32 pt-40"
      data-testid="hero-section"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div 
          ref={elementRef}
          className={`fade-in ${isVisible ? "visible" : ""}`}
        >
          <p className="text-foreground mb-8 leading-relaxed max-w-3xl mx-auto" data-testid="hero-description">
            Nous sommes à votre écoute pour prendre soin de vous tant en période pré et post-opératoire pour vos cicatrices et vos drainages, que pour vos problèmes lymphatiques, votre peau d'orange mais encore pour vous aider à réaliser votre épilation définitive.
          </p>
          
          <h1 className="text-3xl lg:text-4xl font-extralight primary-text mb-16" data-testid="hero-title">
            Cabinet de kinésithérapie esthétique à Waterloo
          </h1>
          
          <p className="text-muted-foreground leading-relaxed max-w-4xl mx-auto text-sm" data-testid="hero-description-long">
            Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes spécialisées dans le traitement des pathologies lymphatiques et les soins de cicatrices. Nous sommes aussi formées à la technique Renata Franca, technique brésilienne à effets immédiats. Cette technique combine à la fois le décongestionnement lymphatique, le remodelage du corps mais aussi la détente et le bien-être.
          </p>
          
          <p className="text-muted-foreground leading-relaxed max-w-4xl mx-auto text-sm mt-6" data-testid="hero-description-tech">
            Nous sommes régulièrement formées aux dernières techniques kinésithérapeutiques mais aussi aux techniques de soins sur l'esthétique.
          </p>
          
          <p className="text-muted-foreground leading-relaxed max-w-4xl mx-auto text-sm mt-6" data-testid="hero-description-laser">
            Nous utilisons la dernière génération de machine épilation laser diode qui nous permet de traiter la totalité des phototypes de peau de 0 à VI (peaux blanches à peaux noires).
          </p>
        </div>
      </div>
    </section>
  );
}