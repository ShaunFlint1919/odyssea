import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Bandage, Zap } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function ServicesSection() {
  const { elementRef, isVisible } = useIntersectionObserver();

  const services = [
    {
      icon: <Droplet className="h-8 w-8 text-primary" />,
      title: "Drainage Lymphatique",
      description: "Traitement spécialisé utilisant les techniques Renata Franca et Vodder pour améliorer la circulation lymphatique et réduire les œdèmes.",
      features: [
        "Technique Renata Franca",
        "Méthode Vodder",
        "Effets immédiats"
      ]
    },
    {
      icon: <Bandage className="h-8 w-8 text-accent" />,
      title: "Traitement de Cicatrices",
      description: "Soins spécialisés pour améliorer l'apparence et la fonctionnalité des cicatrices, qu'elles soient récentes ou anciennes.",
      features: [
        "Cicatrices post-opératoires",
        "Cicatrices traumatiques",
        "Remodelage tissulaire"
      ]
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Épilation Laser",
      description: "Épilation définitive utilisant la dernière génération de machines laser diode pour tous types de peau.",
      features: [
        "Laser diode nouvelle génération",
        "Tous phototypes de peau",
        "Résultats durables"
      ]
    }
  ];

  return (
    <section id="services" className="py-20 bg-background" data-testid="services-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={elementRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-3xl lg:text-4xl font-light text-foreground mb-4" data-testid="services-title">
            Nos Spécialités
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="services-description">
            Nous sommes spécialisés dans le traitement des pathologies lymphatiques et les soins de cicatrices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index}
              className={`service-card bg-card border border-border transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
              data-testid={`service-card-${index}`}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  {service.icon}
                </div>
                <h3 className="text-xl font-medium text-foreground mb-4" data-testid={`service-title-${index}`}>
                  {service.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed" data-testid={`service-description-${index}`}>
                  {service.description}
                </p>
                <ul className="text-sm text-muted-foreground space-y-2" data-testid={`service-features-${index}`}>
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
