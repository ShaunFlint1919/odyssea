import { Award, Tag, Star } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import cabinetImage from "@assets/site olympea_1758988447329.JPG";

export default function AboutSection() {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <section id="apropos" className="py-20 bg-muted/30" data-testid="about-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div 
            className={`slide-in-left ${
              isVisible ? "visible" : ""
            }`}
          >
            <div className="parallax-medium">
              <img 
                src={cabinetImage} 
                alt="Cabinet Odyssea Lymphea - Ambiance apaisante et moderne" 
                className="rounded-2xl shadow-2xl w-full h-auto glass-effect p-2"
                data-testid="about-image"
              />
            </div>
          </div>
          <div 
            ref={elementRef}
            className={`slide-in-right ${
              isVisible ? "visible" : ""
            }`}
          >
            <h2 className="text-3xl lg:text-4xl font-light mb-6" data-testid="about-title">
              Cabinet de kinésithérapie <span className="text-gradient">esthétique</span> à Waterloo
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed" data-testid="about-description-1">
              Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes spécialisées dans le traitement 
              des pathologies lymphatiques et les soins de cicatrices. Nous sommes aussi formées à la technique 
              Renata Franca, technique brésilienne à effets immédiats.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed" data-testid="about-description-2">
              Cette technique combine à la fois la décongestionnement lymphatique, le remodelage du corps mais aussi la détente et le bien-être.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed" data-testid="about-description-3">
              Nous utilisons la dernière génération de machine épilation laser diode qui nous permet de traiter 
              la totalité des phototypes de peau de 0 à VI (peaux blanches à peaux noires).
            </p>
            
            <div className="space-y-4" data-testid="about-credentials">
              <div className="flex items-center">
                <Award className="text-primary mr-3 h-5 w-5" />
                <span className="text-foreground">Formées aux techniques Renata Franca et Vodder</span>
              </div>
              <div className="flex items-center">
                <Tag className="text-primary mr-3 h-5 w-5" />
                <span className="text-foreground">Plus de 5 ans d'expérience à Bruxelles</span>
              </div>
              <div className="flex items-center">
                <Star className="text-primary mr-3 h-5 w-5" />
                <span className="text-foreground">Équipement laser de dernière génération</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
