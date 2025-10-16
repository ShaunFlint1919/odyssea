import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import renataFrancaHorizontal from "@assets/logo-horizontal-noir-or (1)_1757961640279.jpg";
import renataFrancaVertical from "@assets/logo-vertical-noir-or_1757961640279.jpg";
import renataProducts from "@assets/IMG_4146_1758988530094.jpg";
import massageImage from "@assets/photo-output(2)_1759594113789.jpg";
import drainageResults from "@assets/photo-output 2_1759593940577.jpg";
import salonAtmosphere from "@assets/IMG_0383_1759594526744.jpg";

export default function RenataFranca() {
  const { elementRef: heroRef, isVisible: heroVisible } = useIntersectionObserver();
  const { elementRef: section1Ref, isVisible: section1Visible } = useIntersectionObserver();
  const { elementRef: section2Ref, isVisible: section2Visible } = useIntersectionObserver();
  const { elementRef: section3Ref, isVisible: section3Visible } = useIntersectionObserver();
  const { elementRef: section4Ref, isVisible: section4Visible } = useIntersectionObserver();

  useEffect(() => {
    document.title = "Les soins Renata Franca chez Odyssea Lymphea";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Découvrez les soins Renata Franca chez Odyssea Lymphea : drainage lymphatique, massage remodelant, Miracle Touch et soins du visage. Techniques brésiliennes authentiques.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Découvrez les soins Renata Franca chez Odyssea Lymphea : drainage lymphatique, massage remodelant, Miracle Touch et soins du visage. Techniques brésiliennes authentiques.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section - Dark */}
      <section 
        className="relative min-h-[80vh] lg:min-h-screen bg-gradient-to-br from-stone-200 via-amber-200 via-orange-200 via-amber-200 to-stone-200 text-stone-800 flex items-center pt-20"
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div 
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={heroRef}
        >
          <div className={`fade-in ${heroVisible ? "visible" : ""} mb-12 text-center`}>
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm inline-block">
              <img 
                src={renataFrancaHorizontal} 
                alt="Méthode Renata França"
                className="mx-auto max-w-md w-full h-auto object-contain"
                data-testid="renata-logo"
              />
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`fade-in ${heroVisible ? "visible" : ""}`}>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-light mb-6 lg:mb-8 heading-font">
              Les soins Renata Franca
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl mb-6 lg:mb-8 text-stone-600 leading-relaxed">
              Méthode exclusive provenant du Brésil
            </p>
            <div className="text-base sm:text-lg text-stone-600 leading-relaxed space-y-4 lg:space-y-6">
              <p>
                Chez Odyssea Lymphea, nous avons fait le choix du changement, nous vous amenons au <strong>Brésil</strong>, chez la célèbre Carmen de <strong>Renata Franca</strong>, pour une formation authentique en <strong>méthode originale</strong>.
              </p>
              <p>
                <strong>Nos protocoles authentiques et uniques</strong> sont les fondements de notre savoir-être et bien-être pour notre clientèle.
              </p>
              </div>
            </div>
            <div className={`fade-in ${heroVisible ? "visible" : ""} lg:delay-300`}>
            <div className="relative">
              <img 
                src={renataProducts} 
                alt="Produits professionnels Renata França utilisés"
                className="w-full h-[300px] sm:h-[400px] lg:h-[600px] object-cover rounded-lg shadow-2xl"
                data-testid="renata-products-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-800/20 to-transparent rounded-lg"></div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - Light - Drainage Lymphatique */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section1Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section1Visible ? "visible" : ""}`}>
              <img 
                src={drainageResults} 
                alt="Résultats drainage lymphatique Renata França - Transformation visible"
                className="w-full h-auto object-contain rounded-lg shadow-xl"
                data-testid="drainage-results-image"
              />
            </div>
            <div className={`fade-in ${section1Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Drainage Lymphatique Signature Renata Franca
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <div className="bg-white/60 p-6 rounded-lg">
                  <h3 className="font-medium primary-text mb-3">80 minutes - 190 €</h3>
                  <p className="text-sm mb-4">
                    Le drainage lymphatique Renata Franca se distingue d'un drainage classique. C'est un massage <strong>ferme et rapide</strong>, qui utilise des <strong>pressions intenses</strong>, très spécialisé et segmenté.
                  </p>
                </div>
                
                <p>
                  Bien plus qu'un soin esthétique, c'est un véritable <strong>allié santé et bien-être</strong>, thérapeutique dans notre centre.
                </p>
                
                <div className="bg-white/60 p-6 rounded-lg">
                  <h3 className="font-medium primary-text mb-3">Les bienfaits :</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Favorise une élimination efficace des déchets métaboliques</li>
                    <li>• Améliore les inflammations et réduit les gonflements</li>
                    <li>• Favorise l'élimination des toxines</li>
                    <li>• Stimulation du système immunitaire</li>
                    <li>• Soulage les jambes lourdes et favorise la circulation</li>
                    <li>• Aide à la détente et prévient les affaissements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Dark - Massage Remodelant & Miracle Touch */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-amber-100 via-stone-200 via-orange-200 via-stone-200 to-amber-100 text-stone-800">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section2Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section2Visible ? "visible" : ""} order-2 lg:order-1`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 text-stone-700 heading-font">
                Massages Spécialisés
              </h2>
              <div className="text-lg text-stone-600 leading-relaxed space-y-6 body-font">
                
                <div className="bg-stone-300/50 p-6 rounded-lg">
                  <h3 className="font-medium text-stone-700 mb-3">Massage Remodelant - 60 min - 190 €</h3>
                  <p className="text-sm mb-3">
                    Ce massage très thérapeutique est destiné spécialement pour les <strong>zones graisseuses et la cellulite</strong>. Modifie les tissus pour apporter plus de fermeté et de tonus.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• Action puissante pour une cellulite localisée</li>
                    <li>• Gestes techniques pour plus de fermeté</li>
                    <li>• Amélioration de la tonicité cutanée</li>
                    <li>• Résultats visibles dès la première séance</li>
                  </ul>
                </div>

                <div className="bg-stone-300/50 p-6 rounded-lg">
                  <h3 className="font-medium text-stone-700 mb-3">Miracle Touch - 60 min - 190 €</h3>
                  <p className="text-sm mb-3">
                    Le Miracle Touch combine les <strong>effets drainants du drainage lymphatique</strong> et les <strong>bienfaits anti-inflammatoires</strong> pour un soin complet.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• Corps affiné sans souffrir</li>
                    <li>• Objectifs de fermeté</li>
                    <li>• Bien-être et détente profonde</li>
                    <li>• Soin lifting avec service immédiat</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className={`fade-in ${section2Visible ? "visible" : ""} lg:delay-200 order-1 lg:order-2`}>
              <img 
                src={massageImage} 
                alt="Résultats massage Renata França - Transformation visible avant/après"
                className="w-full h-auto object-contain rounded-lg shadow-xl"
                data-testid="massage-techniques-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Light - Soins Visage et Relaxant */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section3Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section3Visible ? "visible" : ""}`}>
              <img 
                src={salonAtmosphere} 
                alt="Soins du visage Renata França - Drainage et bien-être"
                className="w-full h-auto object-contain rounded-lg shadow-xl"
                data-testid="salon-atmosphere-image"
              />
            </div>
            <div className={`fade-in ${section3Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Soins Complémentaires
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                
                <div className="bg-white/60 p-6 rounded-lg">
                  <h3 className="font-medium primary-text mb-3">Miracle Face - 90 min - 95 €</h3>
                  <p className="text-sm mb-3">
                    Le soin du visage qui change tout ! Le Miracle Face combine drainage et remodelage du visage selon la méthode Renata Franca.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• Drainage du visage et stimulation des points</li>
                    <li>• Amélioration de la souplesse musculaire</li>
                    <li>• Amélioration circulation sanguine + lymphatique</li>
                    <li>• Effets lifting du visage immédiat</li>
                    <li>• Amélioration de la fermeté</li>
                  </ul>
                </div>

                <div className="bg-white/60 p-6 rounded-lg">
                  <h3 className="font-medium primary-text mb-3">Massage Relaxant - 60 min - 70 €</h3>
                  <p className="text-sm mb-3">
                    L'instant pour soi - Un moment personnel d'abandon et de bien-être où se détendre.
                  </p>
                  <p className="text-sm">
                    Application personnalisée d'huiles essentielles pour un bien-être total et une détente profonde.
                  </p>
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
            <div className="mb-8 bg-white/10 rounded-lg p-6 backdrop-blur-sm inline-block">
              <img 
                src={renataFrancaVertical} 
                alt="Méthode Renata França"
                className="mx-auto max-w-xs w-full h-auto object-contain"
                data-testid="renata-vertical-logo"
              />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light mb-8 text-stone-800 heading-font">
              Prenez rendez-vous pour un voyage sensoriel brésilien
            </h2>
            <p className="text-xl text-stone-700 mb-12 leading-relaxed max-w-3xl mx-auto">
              Votre corps mérite ce qu'il y a de mieux. Offrez-lui un soin signé Renata Franca, dans un service de beauté et bien-être unique.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="https://salonkee.be/salon/odyssea-lymphea"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg font-medium inline-block transition-colors"
                data-testid="button-appointment"
              >
                Prendre rendez-vous
              </a>
              <a 
                href="tel:+32494741777"
                className="border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white px-8 py-4 rounded-lg font-medium inline-block transition-colors"
                data-testid="button-phone"
              >
                Appeler maintenant
              </a>
            </div>
          </div>
        </div>
      </section>
      
      <MinimalFooter />
    </div>
  );
}