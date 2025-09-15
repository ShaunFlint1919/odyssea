import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function EpilationLaser() {
  const { elementRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    document.title = "Épilation Laser - Odyssea Lymphea | Technologie Médicale Avancée";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Épilation laser médicale chez Odyssea Lymphea. Technologie avancée adaptée à tous types de peau. Traitement confortable et sécurisé à Waterloo.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Épilation laser médicale chez Odyssea Lymphea. Technologie avancée adaptée à tous types de peau. Traitement confortable et sécurisé à Waterloo.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div 
            ref={elementRef}
            className={`text-center mb-16 fade-in ${isVisible ? "visible" : ""}`}
          >
            <h1 className="text-3xl lg:text-4xl font-extralight primary-text mb-8">
              Épilation Laser
            </h1>
            <div className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-sm">
              <p className="mb-6">
                Une solution douce et durable pour une peau parfaitement lisse.
              </p>
              <p>
                Complétez votre parcours bien-être avec notre service d'épilation laser, alliant technologie médicale de pointe et approche respectueuse de votre confort.
              </p>
            </div>
          </div>

          {/* Technologie */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                Technologie Médicale Avancée
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-6">
                <p className="text-center max-w-3xl mx-auto">
                  Notre équipement laser médical de dernière génération garantit des résultats optimaux dans le respect de votre peau et de votre confort.
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-background rounded-lg p-6 text-center">
                    <h3 className="font-medium text-foreground mb-4">Précision</h3>
                    <p className="text-sm">
                      Ciblage précis du follicule pileux sans endommager la peau environnante
                    </p>
                  </div>
                  
                  <div className="bg-accent/10 rounded-lg p-6 text-center">
                    <h3 className="font-medium text-foreground mb-4">Sécurité</h3>
                    <p className="text-sm">
                      Système de refroidissement intégré pour un confort optimal pendant le traitement
                    </p>
                  </div>
                  
                  <div className="bg-background rounded-lg p-6 text-center">
                    <h3 className="font-medium text-foreground mb-4">Efficacité</h3>
                    <p className="text-sm">
                      Réduction progressive et durable de la repousse dès les premières séances
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="mb-16">
            <div className="grid md:grid-cols-2 gap-8">
              
              <div className="bg-accent/10 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6">
                  Avantages du Traitement
                </h3>
                <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Résultats durables et progressifs
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Adapté à tous types et couleurs de peau
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Traitement rapide et confortable
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Fini les irritations liées au rasage
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-secondary/20 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6">
                  Zones Traitées
                </h3>
                <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Visage (lèvre supérieure, menton, joues)
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Corps (aisselles, jambes, bras)
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Zones intimes avec expertise et discrétion
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Traitements personnalisés selon vos besoins
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Processus */}
          <section className="mb-16">
            <div className="bg-primary/5 rounded-lg p-8">
              <h2 className="text-2xl font-medium primary-text mb-8 text-center">
                Notre Approche
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    1
                  </div>
                  <h3 className="font-medium text-foreground mb-3">Consultation</h3>
                  <p className="text-muted-foreground text-sm">
                    Évaluation de votre peau et définition d'un plan de traitement personnalisé
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    2
                  </div>
                  <h3 className="font-medium text-foreground mb-3">Séances</h3>
                  <p className="text-muted-foreground text-sm">
                    Traitements réguliers avec suivi personnalisé de l'évolution
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    3
                  </div>
                  <h3 className="font-medium text-foreground mb-3">Résultats</h3>
                  <p className="text-muted-foreground text-sm">
                    Peau lisse et douce, libérée des contraintes de l'épilation traditionnelle
                  </p>
                </div>
              </div>
            </div>
          </section>


          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-primary/5 rounded-lg p-12">
              <h2 className="text-2xl font-light primary-text mb-6">
                Prêt pour une peau parfaitement lisse ?
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Réservez votre consultation personnalisée et découvrez les bienfaits de l'épilation laser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:+32494741777"
                  className="button-minimal px-8 py-3 rounded font-medium inline-block"
                  data-testid="button-phone"
                >
                  Appeler maintenant
                </a>
                <a 
                  href="mailto:odyssea.lymphea@gmail.com"
                  className="button-outline px-8 py-3 rounded font-medium inline-block"
                  data-testid="button-email"
                >
                  Envoyer un email
                </a>
              </div>
            </div>
          </section>

        </div>
      </main>
      
      <MinimalFooter />
    </div>
  );
}