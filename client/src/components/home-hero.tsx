import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import img1 from "@assets/IMG_0718_1758988530094.jpg";
import img2 from "@assets/IMG_0386_1758988530094.jpg";
import img3 from "@assets/photo-output_1758988530094.jpg";
import beforeAfterLegs from "@assets/photo-output(1)_1758988530094.jpg";
import artisticPortrait from "@assets/IMG_0374_1758988603443.jpg";

export default function HomeHero() {
  const { elementRef: heroRef, isVisible: heroVisible } = useIntersectionObserver();
  const { elementRef: section1Ref, isVisible: section1Visible } = useIntersectionObserver();
  const { elementRef: section2Ref, isVisible: section2Visible } = useIntersectionObserver();
  const { elementRef: section3Ref, isVisible: section3Visible } = useIntersectionObserver();

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section 
        className="relative min-h-[80vh] lg:min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 via-slate-800 via-slate-900 to-slate-950 text-white flex items-center"
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
            <p className="text-lg sm:text-xl lg:text-2xl mb-6 lg:mb-8 text-slate-200 leading-relaxed">
              Entre science et présence
            </p>
            <div className="text-base sm:text-lg text-slate-300 leading-relaxed space-y-4 lg:space-y-6">
              <p>
                Chez Odyssea Lymphea, le soin commence par l'écoute. Nous vous accompagnons 
                avec expertise et bienveillance dans votre parcours de bien-être.
              </p>
              <p>
                Spécialisées en drainage lymphatique, soins de cicatrices et épilation laser, 
                nous combinons techniques avancées et approche humaine.
              </p>
            </div>
          </div>
          <div className={`fade-in ${heroVisible ? "visible" : ""} lg:delay-300`}>
            <div className="relative">
              <img 
                src={img1} 
                alt="Soins du visage professionnels - Odyssea Lymphea"
                className="w-full h-[300px] sm:h-[400px] lg:h-[600px] object-cover rounded-lg shadow-2xl"
                data-testid="hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - Claire */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-stone-100 via-amber-100 to-amber-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section1Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section1Visible ? "visible" : ""}`}>
              <img 
                src={img2} 
                alt="Soins du visage et bien-être chez Odyssea Lymphea"
                className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="section1-image"
              />
            </div>
            <div className={`fade-in ${section1Visible ? "visible" : ""} lg:delay-200`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 primary-text heading-font">
                Notre expertise à votre service
              </h2>
              <div className="text-lg text-stone-700 leading-relaxed space-y-6 body-font">
                <p>
                  Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes 
                  spécialisées dans le traitement des pathologies lymphatiques et les soins de cicatrices.
                </p>
                <p>
                  Formées à la technique Renata Franca, technique brésilienne à effets immédiats, 
                  nous combinons décongestionnement lymphatique, remodelage du corps et bien-être.
                </p>
                <p>
                  Nous nous formons régulièrement aux dernières techniques kinésithérapeutiques 
                  et aux soins esthétiques avancés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Sombre */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-amber-950 via-amber-900 via-stone-800 via-amber-900 to-amber-950 text-white">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          ref={section2Ref}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`fade-in ${section2Visible ? "visible" : ""} order-2 lg:order-1`}>
              <h2 className="text-3xl lg:text-4xl font-light mb-8 text-amber-200 heading-font">
                Résultats visibles et durables
              </h2>
              <div className="text-lg text-amber-100 leading-relaxed space-y-6 body-font">
                <p>
                  Nos techniques permettent d'obtenir des résultats remarquables en drainage lymphatique, 
                  avec des effets visibles dès la première séance.
                </p>
                <p>
                  Que ce soit pour réduire la rétention d'eau, améliorer la circulation, 
                  ou accompagner un processus de cicatrisation, nous adaptons chaque soin à vos besoins.
                </p>
                <p>
                  L'épilation laser de dernière génération nous permet de traiter tous les phototypes 
                  de peau (I à VI) en toute sécurité.
                </p>
              </div>
            </div>
            <div className={`fade-in ${section2Visible ? "visible" : ""} lg:delay-200 order-1 lg:order-2`}>
              <img 
                src={beforeAfterLegs} 
                alt="Résultats drainage lymphatique - Transformation visible des jambes"
                className="w-full h-[500px] object-cover rounded-lg shadow-xl"
                data-testid="section2-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Services */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-stone-50 via-stone-100 via-amber-100 to-amber-50">
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          ref={section3Ref}
        >
          <div className={`fade-in ${section3Visible ? "visible" : ""}`}>
            <h2 className="text-3xl lg:text-4xl font-light mb-16 primary-text heading-font">
              Nos spécialités
            </h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="bg-white/80 p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium mb-6 primary-text heading-font">
                  Drainage Lymphatique
                </h3>
                <p className="text-stone-700 leading-relaxed body-font">
                  Techniques conventionnelles et Renata Franca pour un drainage efficace 
                  et des résultats immédiats.
                </p>
              </div>
              <div className="bg-white/80 p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium mb-6 primary-text heading-font">
                  Soins de Cicatrices
                </h3>
                <p className="text-stone-700 leading-relaxed body-font">
                  Accompagnement pré et post-opératoire pour optimiser 
                  la cicatrisation et réduire les adhérences.
                </p>
              </div>
              <div className="bg-white/80 p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium mb-6 primary-text heading-font">
                  Épilation Laser
                </h3>
                <p className="text-stone-700 leading-relaxed body-font">
                  Technologie diode dernière génération adaptée 
                  à tous types de peau pour une épilation définitive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - Galerie Artistique */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-slate-950 via-slate-900 via-slate-800 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-light mb-12 heading-font">
            L'art du soin esthétique
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="fade-in">
              <img 
                src={artisticPortrait} 
                alt="Portrait artistique - Beauté naturelle sublimée"
                className="w-full h-[400px] object-cover rounded-lg shadow-xl"
                data-testid="gallery-image-1"
              />
            </div>
            <div className="fade-in lg:delay-100">
              <img 
                src={img3} 
                alt="Résultats avant/après traitement corporel"
                className="w-full h-[400px] object-cover rounded-lg shadow-xl"
                data-testid="gallery-image-2"
              />
            </div>
            <div className="fade-in lg:delay-200">
              <img 
                src={img1} 
                alt="Soins du visage professionnels et détente"
                className="w-full h-[400px] object-cover rounded-lg shadow-xl"
                data-testid="gallery-image-3"
              />
            </div>
          </div>
          <div className="mt-12 text-slate-300 body-font">
            <p className="text-lg max-w-3xl mx-auto">
              Découvrez nos techniques exclusives qui allient savoir-faire traditionnel et innovations technologiques 
              pour révéler votre beauté naturelle.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 lg:py-24 bg-gradient-to-br from-slate-950 via-slate-900 via-slate-800 via-slate-900 to-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-light mb-8 heading-font">
            Prêt à commencer votre parcours bien-être ?
          </h2>
          <p className="text-xl mb-12 text-slate-200 leading-relaxed body-font">
            Réservez votre consultation personnalisée et découvrez comment nous pouvons vous accompagner.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="tel:+32494741777"
              className="button-minimal px-8 py-4 rounded-lg font-medium text-lg"
              data-testid="button-phone"
            >
              Appeler maintenant
            </a>
            <a 
              href="mailto:odyssea.lymphea@gmail.com"
              className="button-outline px-8 py-4 rounded-lg font-medium text-lg"
              data-testid="button-email"
            >
              Envoyer un email
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}