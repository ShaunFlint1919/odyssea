import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import drainageImage from "@assets/photo-output(2)_1758988530094.jpg";
import salonImage from "@assets/IMG_3606_1758988530094.jpg";
import beforeAfterImage from "@assets/photo-output_1758988530094.jpg";
import treatmentImage from "@assets/IMG_0385_1758988530094.jpg";

export default function DrainageLymphatique() {
  const { elementRef: heroRef, isVisible: heroVisible } = useIntersectionObserver();
  const { elementRef: section1Ref, isVisible: section1Visible } = useIntersectionObserver();
  const { elementRef: section2Ref, isVisible: section2Visible } = useIntersectionObserver();
  const { elementRef: section3Ref, isVisible: section3Visible } = useIntersectionObserver();
  const { elementRef: section4Ref, isVisible: section4Visible } = useIntersectionObserver();

  useEffect(() => {
    document.title = "Drainage lymphatique conventionnel - Odyssea Lymphea | Méthodes Vodder & Le Duc";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Drainage lymphatique conventionnel chez Odyssea Lymphea. Méthodes Vodder et Le Duc combinées à la pressothérapie médicale. L\'art du soin en douceur à Waterloo.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Drainage lymphatique conventionnel chez Odyssea Lymphea. Méthodes Vodder et Le Duc combinées à la pressothérapie médicale. L\'art du soin en douceur à Waterloo.';
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
              L'art du soin en douceur
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl mb-6 lg:mb-8 text-stone-600 leading-relaxed">
              Entre science et présence
            </p>
            <div className="text-base sm:text-lg text-stone-600 leading-relaxed space-y-4 lg:space-y-6">
              <p>
                Chez Odyssea Lymphea, le soin commence par l'écoute du corps… et de la personne.
              </p>
              <p>
                Le drainage d'empathie conventionnelle est bien plus qu'une technique : c'est une approche bienveillante, respectueuse et profondément humaine, inspirée des méthodes reconnues Le Duc et Vodder, alliée à la technologie moderne de la pressothérapie.
              </p>
            </div>
          </div>
          <div className={`fade-in ${heroVisible ? "visible" : ""} lg:delay-300`}>
            <div className="relative">
              <img 
                src={drainageImage} 
                alt="Résultats drainage lymphatique - Jambes affinées et galbe retrouvé"
                className="w-full h-[300px] sm:h-[400px] lg:h-[600px] object-cover rounded-lg shadow-2xl"
                data-testid="drainage-hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-800/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - Light - Méthodes */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section1Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section1Visible ? "visible" : ""}`}>
              <img 
                src={treatmentImage} 
                alt="Techniques de drainage lymphatique - Méthodes Vodder et Le Duc"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="methods-image"
              />
            </div>
            <div className={`fade-in ${section1Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Une main attentive, un geste thérapeutique
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <p>
                  Dans un monde où tout va vite, ce drainage vous propose une pause essentielle. Il s'adresse aux personnes en quête de légèreté, de relâchement profond ou d'un accompagnement post-opératoire tout en douceur.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-white/60 p-6 rounded-lg">
                    <h3 className="text-xl font-medium primary-text mb-4">Méthode Vodder</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Gestes circulaires, légers, presque méditatifs</li>
                      <li>• Rétablit le rythme naturel de la lymphe</li>
                      <li>• Apaise le système nerveux</li>
                    </ul>
                  </div>
                  <div className="bg-white/60 p-6 rounded-lg">
                    <h3 className="text-xl font-medium primary-text mb-4">Méthode Le Duc</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Pressions plus ciblées et drainantes</li>
                      <li>• Efficace sur les œdèmes et jambes lourdes</li>
                      <li>• Soins post-chirurgicaux</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Dark - Pressothérapie */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-amber-100 via-stone-200 via-orange-200 via-stone-200 to-amber-100 text-stone-800">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section2Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section2Visible ? "visible" : ""} order-2 lg:order-1`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 text-stone-700 heading-font">
                Pressothérapie médicale
              </h2>
              <div className="text-lg text-stone-600 leading-relaxed space-y-6 body-font">
                <p>
                  La pressothérapie que nous utilisons repose sur une technologie médicale de haute qualité, conçue pour offrir un drainage précis, sécurisé et efficace.
                </p>
                <p>
                  Grâce à des manchons pneumatiques de dernière génération, elle stimule la circulation lymphatique et veineuse par pressions séquentielles, tout en garantissant un confort optimal.
                </p>
                
                <div className="bg-stone-300/50 p-6 rounded-lg mt-8">
                  <h3 className="font-medium text-stone-700 mb-4">Ses bienfaits :</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Soulage les jambes lourdes</li>
                    <li>• Réduit la rétention d'eau et les gonflements</li>
                    <li>• Stimule la circulation</li>
                    <li>• Idéale pour les sportifs et personnes sédentaires</li>
                    <li>• Optimise les résultats de soins esthétiques</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className={`fade-in ${section2Visible ? "visible" : ""} lg:delay-200 order-1 lg:order-2`}>
              <img 
                src={salonImage} 
                alt="Salon Odyssea Lymphea - Équipement de pressothérapie moderne"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="salon-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Light - Résultats */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-amber-100 via-orange-100 to-stone-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section3Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section3Visible ? "visible" : ""}`}>
              <img 
                src={beforeAfterImage} 
                alt="Résultats avant/après drainage lymphatique - Transformation visible"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="results-image"
              />
            </div>
            <div className={`fade-in ${section3Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Des résultats transformants
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <p>
                  Ces techniques manuelles favorisent une relance douce du système lymphatique et une détoxification naturelle du corps, tout en apportant une profonde sensation de bien-être émotionnel.
                </p>
                <p>
                  Écoutez les voix de ceux qui ont vécu le drainage d'empathie. Chaque témoignage raconte une histoire unique de soin, de réconfort et de guérison.
                </p>
                
                <div className="bg-white/60 p-6 rounded-lg">
                  <h3 className="font-medium primary-text mb-3">Des expériences transformantes</h3>
                  <p className="text-sm">
                    Les retours de nos clients témoignent du pouvoir de la transformation. Venez découvrir combien vos attentes peuvent être dépassées.
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
            <h2 className="text-3xl lg:text-4xl font-light mb-8 text-slate-200 heading-font">
              Venez vivre votre propre expérience
            </h2>
            <p className="text-xl text-slate-300 mb-12 leading-relaxed max-w-3xl mx-auto">
              Réservez votre séance aujourd'hui et découvrez l'art du soin en douceur.
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