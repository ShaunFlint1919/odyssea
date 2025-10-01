import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import epilationImage from "@assets/IMG_4138_1758988530094.jpg";
import laserEquipment from "@assets/IMG_4135_1758988530094.jpg";
import productsRenata from "@assets/IMG_4146_1758988530094.jpg";
import salonView from "@assets/IMG_3606_1758988530094.jpg";

export default function EpilationLaser() {
  const { elementRef: heroRef, isVisible: heroVisible } = useIntersectionObserver();
  const { elementRef: section1Ref, isVisible: section1Visible } = useIntersectionObserver();
  const { elementRef: section2Ref, isVisible: section2Visible } = useIntersectionObserver();
  const { elementRef: section3Ref, isVisible: section3Visible } = useIntersectionObserver();
  const { elementRef: section4Ref, isVisible: section4Visible } = useIntersectionObserver();

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
      
      {/* Hero Section - Dark */}
      <section 
        className="relative min-h-[80vh] lg:min-h-screen bg-gradient-to-br from-stone-200 via-amber-200 via-orange-200 via-amber-200 to-stone-200 text-stone-800 flex items-center"
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div 
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center"
          ref={heroRef}
        >
          <div className={`fade-in ${heroVisible ? "visible" : ""}`}>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-light mb-6 lg:mb-8 heading-font">
              Épilation laser définitive
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl mb-6 lg:mb-8 text-stone-600 leading-relaxed">
              Une solution durable pour une peau parfaitement lisse
            </p>
            <div className="text-base sm:text-lg text-stone-600 leading-relaxed space-y-4 lg:space-y-6">
              <p>
                Les méthodes d'épilation classiques (rasage, cire, épilateur) peuvent être contraignantes, douloureuses et générer des irritations ou poils incarnés.
              </p>
              <p>
                L'épilation laser offre une solution durable, sûre et efficace pour tous ceux qui souhaitent se libérer de la repousse.
              </p>
            </div>
          </div>
          <div className={`fade-in ${heroVisible ? "visible" : ""} lg:delay-300`}>
            <div className="relative">
              <img 
                src={epilationImage} 
                alt="Produits professionnels Renata França - Soins de qualité médicale"
                className="w-full h-[300px] sm:h-[400px] lg:h-[600px] object-cover rounded-lg shadow-2xl"
                data-testid="epilation-hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-800/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - Light - Notre expertise */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section1Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section1Visible ? "visible" : ""}`}>
              <img 
                src={laserEquipment} 
                alt="Équipement laser médical de dernière génération"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="laser-equipment-image"
              />
            </div>
            <div className={`fade-in ${section1Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Notre expertise Odyssea Lymphea
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <p>
                  Chez Odyssea Lymphea, nous utilisons une technologie de laser diode de dernière génération, adaptée à tous les types de peau (phototypes I à VI), même les plus sensibles.
                </p>
                <p>
                  Cette approche agit directement sur le follicule pileux pour empêcher la repousse, tout en respectant l'intégrité de la peau.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-white/60 p-6 rounded-lg">
                    <h3 className="text-xl font-medium primary-text mb-4">Technologie avancée</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Laser médical dernière génération</li>
                      <li>• Adapté à tous types de peau</li>
                      <li>• Traitement confortable et sécurisé</li>
                    </ul>
                  </div>
                  <div className="bg-white/60 p-6 rounded-lg">
                    <h3 className="text-xl font-medium primary-text mb-4">Zones traitées</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Visage et corps</li>
                      <li>• Zones sensibles avec expertise</li>
                      <li>• Résultats durables et efficaces</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Dark - Avantages du laser diode */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-amber-100 via-stone-200 via-orange-200 via-stone-200 to-amber-100 text-stone-800">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section2Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section2Visible ? "visible" : ""} order-2 lg:order-1`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 text-stone-700 heading-font">
                Les avantages du laser diode
              </h2>
              <div className="text-lg text-stone-600 leading-relaxed space-y-6 body-font">
                <p>
                  Notre technologie de pointe offre des avantages incomparables pour une épilation définitive en toute sécurité.
                </p>
                
                <div className="bg-stone-300/50 p-6 rounded-lg">
                  <h3 className="font-medium text-stone-700 mb-4">Bénéfices uniques :</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Cible sélective du bulbe pileux, sans endommager la peau</li>
                    <li>• Diminution durable de la pilosité jusqu'à disparition quasi complète</li>
                    <li>• Convient aux peaux claires comme aux peaux foncées</li>
                    <li>• Réduit les problèmes de poils incarnés et d'irritations</li>
                    <li>• Zones traitables : visage, aisselles, bras, jambes, maillot, dos, torse</li>
                  </ul>
                </div>

                <div className="bg-stone-300/50 p-6 rounded-lg">
                  <h3 className="font-medium text-stone-700 mb-4">Résultats attendus :</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Peau douce et nette, sans poils persistants</li>
                    <li>• Confort durable (fini les rasages répétés)</li>
                    <li>• Gain de temps et de liberté au quotidien</li>
                    <li>• Solution sûre pour femmes et hommes</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className={`fade-in ${section2Visible ? "visible" : ""} lg:delay-200 order-1 lg:order-2`}>
              <img 
                src={salonView} 
                alt="Cabinet Odyssea Lymphea - Espace dédié épilation laser"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="salon-view-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Light - Protocole personnalisé */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section3Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section3Visible ? "visible" : ""}`}>
              <img 
                src={productsRenata} 
                alt="Produits professionnels utilisés pour les soins épilation"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="products-image"
              />
            </div>
            <div className={`fade-in ${section3Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Protocole personnalisé en 3 étapes
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <p>
                  Chaque protocole est défini sur mesure en fonction de vos besoins spécifiques et de votre type de peau.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium mr-6 flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Consultation initiale</h3>
                      <p className="text-sm">Bilan de peau et test laser personnalisé selon votre phototype</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium mr-6 flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Séances d'épilation laser</h3>
                      <p className="text-sm">Espacées selon la repousse naturelle pour une efficacité optimale</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium mr-6 flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Suivi personnalisé</h3>
                      <p className="text-sm">Ajustement du protocole pour optimiser les résultats</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 p-6 rounded-lg mt-8">
                  <h3 className="font-medium primary-text mb-3">Adaptation personnalisée</h3>
                  <p className="text-sm mb-3">Nos protocoles s'adaptent à :</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Zone à traiter (surface, densité, sensibilité)</li>
                    <li>• Phototype de peau et couleur du poil</li>
                    <li>• Objectifs esthétiques et confort du patient</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - Dark - Call to Action */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-200 via-amber-200 via-orange-200 via-amber-200 to-stone-200 text-stone-800">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          ref={section4Ref}
        >
          <div className={`fade-in ${section4Visible ? "visible" : ""}`}>
            <h2 className="text-3xl lg:text-4xl font-light mb-8 text-stone-800 heading-font">
              Prêt pour une peau parfaitement lisse ?
            </h2>
            <p className="text-xl text-stone-700 mb-12 leading-relaxed max-w-3xl mx-auto">
              Réservez votre consultation personnalisée et découvrez les bienfaits de l'épilation laser.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="tel:+32494741777"
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg font-medium inline-block transition-colors"
                data-testid="button-phone"
              >
                Appeler maintenant
              </a>
              <a 
                href="mailto:odyssea.lymphea@gmail.com"
                className="border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white px-8 py-4 rounded-lg font-medium inline-block transition-colors"
                data-testid="button-email"
              >
                Envoyer un email
              </a>
            </div>
          </div>
        </div>
      </section>
      
      <MinimalFooter />
    </div>
  );
}