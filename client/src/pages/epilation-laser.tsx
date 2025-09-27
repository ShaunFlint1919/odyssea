import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function EpilationLaser() {
  const { elementRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    document.title = "Épilation laser définitive - Odyssea Lymphea | Waterloo";
    
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
            <h1 className="text-3xl lg:text-4xl font-extralight primary-text mb-8 heading-font">
              Épilation laser définitive
            </h1>
            <div className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              <p className="mb-6 body-font">
                Les méthodes d'épilation classiques (rasage, cire, épilateur) peuvent être contraignantes, 
                douloureuses et générer des irritations ou poils incarnés.
              </p>
              <p className="body-font">
                L'épilation laser offre une solution durable, sûre et efficace pour tous ceux qui 
                souhaitent se libérer de la repousse.
              </p>
            </div>
          </div>

          {/* Notre expertise */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center heading-font">
                Notre expertise Odyssea Lymphea
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-6 body-font">
                <p className="text-center max-w-3xl mx-auto body-font">
                  Chez Odyssea Lymphea, nous utilisons une technologie de laser diode de dernière génération, 
                  adaptée à tous les types de peau (phototypes I à VI), même les plus sensibles.
                </p>
                
                <p className="text-center max-w-3xl mx-auto body-font">
                  Cette approche agit directement sur le follicule pileux pour empêcher la repousse, 
                  tout en respectant l'intégrité de la peau.
                </p>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="mb-16">
            <div className="grid md:grid-cols-2 gap-8">
              
              <div className="bg-accent/10 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6 heading-font">
                  Les avantages du laser diode
                </h3>
                <div className="text-muted-foreground leading-relaxed space-y-4 body-font">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Cible sélective du bulbe pileux, sans endommager la peau environnante
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Progressivement, une diminution durable de la pilosité jusqu'à disparition quasi complète
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Convient aussi bien aux peaux claires qu'aux peaux foncées
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Réduit nettement les problèmes de poils incarnés et d'irritations
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Zones traitables : visage, aisselles, bras, jambes, maillot, dos, torse…
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-secondary/20 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6 heading-font">
                  Protocole personnalisé
                </h3>
                <div className="text-muted-foreground leading-relaxed space-y-4 body-font">
                  <p className="mb-4 body-font">
                    Chaque protocole est défini sur mesure en fonction de :
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      La zone à traiter (surface, densité, sensibilité)
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Le phototype de peau et la couleur du poil
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Les objectifs esthétiques et le confort du patient
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Bénéfices attendus */}
          <section className="mb-16">
            <div className="bg-primary/5 rounded-lg p-8">
              <h2 className="text-2xl font-medium primary-text mb-8 text-center heading-font">
                Les bénéfices attendus
              </h2>
              <div className="text-muted-foreground leading-relaxed body-font">
                <ul className="space-y-4 max-w-3xl mx-auto">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Une peau douce et nette, sans poils persistants
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Un confort durable (fini les rasages et rendez-vous d'épilation répétés)
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Un gain de temps et de liberté au quotidien
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Une solution sûre et efficace pour femmes et hommes
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Déroulé d'un protocole type */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8">
              <h2 className="text-2xl font-medium primary-text mb-8 text-center heading-font">
                Déroulé d'un protocole type
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    1
                  </div>
                  <h3 className="font-medium text-foreground mb-3 heading-font">Consultation initiale</h3>
                  <p className="text-muted-foreground body-font">
                    Bilan de peau et test laser personnalisé
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    2
                  </div>
                  <h3 className="font-medium text-foreground mb-3 heading-font">Séances d'épilation laser</h3>
                  <p className="text-muted-foreground body-font">
                    Espacées selon la repousse naturelle
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium mb-4 mx-auto">
                    3
                  </div>
                  <h3 className="font-medium text-foreground mb-3 heading-font">Suivi</h3>
                  <p className="text-muted-foreground body-font">
                    Ajustement du protocole pour optimiser les résultats
                  </p>
                </div>
              </div>
            </div>
          </section>


          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-primary/5 rounded-lg p-12">
              <h2 className="text-2xl font-light primary-text mb-6 heading-font">
                Prêt pour une peau parfaitement lisse ?
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed body-font">
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