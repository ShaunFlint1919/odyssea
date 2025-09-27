import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import drainageImage from "@assets/photo-output(2)_1758988530094.jpg";

export default function DrainageLymphatique() {
  const { elementRef, isVisible } = useIntersectionObserver();

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
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div 
            ref={elementRef}
            className={`text-center mb-16 fade-in ${isVisible ? "visible" : ""}`}
          >
            <h1 className="text-3xl lg:text-4xl font-extralight primary-text mb-8 heading-font">
              L'art du soin en douceur, entre science et présence
            </h1>
            <div className="mb-12">
              <img 
                src={drainageImage} 
                alt="Résultats drainage lymphatique - Jambes affinées et galbe retrouvé"
                className="w-full max-w-2xl mx-auto h-[400px] object-cover rounded-lg shadow-xl"
                data-testid="drainage-hero-image"
              />
            </div>
            <div className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-sm body-font">
              <p className="mb-6">
                Chez Odyssea Lymphea, le soin commence par l'écoute du corps… et de la personne.
              </p>
              <p>
                Le drainage d'empathie conventionnelle est bien plus qu'une technique : c'est une approche bienveillante, respectueuse et profondément humaine, inspirée des méthodes reconnues Le Duc et Vodder, alliée à la technologie moderne de la pressothérapie.
              </p>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                Une main attentive, un geste thérapeutique
              </h2>
              <h3 className="text-xl font-medium text-foreground mb-4 text-center">
                Découvrez les bienfaits du Drainage d'Empathie
              </h3>
              <div className="text-muted-foreground text-sm leading-relaxed">
                <p>
                  Dans un monde où tout va vite, ce drainage vous propose une pause essentielle. Il s'adresse aux personnes en quête de légèreté, de relâchement profond ou d'un accompagnement post-opératoire tout en douceur.
                </p>
              </div>
            </div>
          </section>

          {/* Méthodes */}
          <section className="mb-16">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Méthode Vodder */}
              <div className="bg-secondary/20 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6">
                  Méthode Vodder
                </h3>
                <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Gestes circulaires, légers, presque méditatifs
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Rétablit le rythme naturel de la lymphe
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Apaise le système nerveux et diminue les tensions
                    </li>
                  </ul>
                </div>
              </div>

              {/* Méthode Le Duc */}
              <div className="bg-accent/10 rounded-lg p-8">
                <h3 className="text-xl font-medium primary-text mb-6">
                  Méthode Le Duc
                </h3>
                <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Pressions plus ciblées et drainantes
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Particulièrement efficace sur les œdèmes, les jambes lourdes, les inflammations
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Recommandée dans le cadre de soins post-chirurgicaux ou post-traumatiques
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl mx-auto">
                Ces techniques manuelles favorisent une relance douce du système lymphatique et une détoxification naturelle du corps, tout en apportant une profonde sensation de bien-être émotionnel.
              </p>
            </div>
          </section>

          {/* Pressothérapie */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6">
                Pressothérapie
              </h2>
              <h3 className="text-xl font-medium text-foreground mb-6">
                Un soutien mécanique intelligent et médical
              </h3>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  La pressothérapie que nous utilisons repose sur une technologie médicale de haute qualité, conçue pour offrir un drainage précis, sécurisé et efficace.
                </p>
                <p>
                  Grâce à des manchons pneumatiques de dernière génération, elle stimule la circulation lymphatique et veineuse par pressions séquentielles, tout en garantissant un confort optimal.
                </p>
                
                <div className="mt-8">
                  <h4 className="font-medium text-foreground mb-4">Ses bienfaits :</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Soulage les jambes lourdes
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Réduit la rétention d'eau et les gonflements
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Stimule la circulation
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Idéale pour les personnes sédentaires, les sportifs, ou en récupération physique
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Optimise les résultats de soins esthétiques ou thérapeutiques
                    </li>
                  </ul>
                </div>
                
                <p className="mt-6 font-medium">
                  Alliant performance médicale et relaxation profonde, elle complète parfaitement les techniques manuelles traditionnelles.
                </p>
              </div>
            </div>
          </section>

          {/* Témoignages */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                Ce que nos clients disent
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed text-center space-y-6">
                <p>
                  Écoutez les voix de ceux qui ont vécu le drainage d'empathie. Chaque témoignage raconte une histoire unique de soin, de réconfort et de guérison.
                </p>
                
                <div className="bg-background rounded-lg p-6 mt-6">
                  <h3 className="font-medium text-foreground mb-4">
                    Des expériences transformantes
                  </h3>
                  <p>
                    Les retours de nos clients témoignent du pouvoir de la transformation. Venez découvrir combien vos attentes peuvent être dépassées.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Épilation Laser Section */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-8 text-center">
                Épilation Laser
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-6">
                <p className="text-center max-w-3xl mx-auto">
                  Complétez votre parcours bien-être avec notre service d'épilation laser, une solution douce et durable pour une peau parfaitement lisse.
                </p>
                
                <div className="grid md:grid-cols-2 gap-8 mt-8">
                  <div className="bg-background rounded-lg p-6">
                    <h3 className="font-medium text-foreground mb-4">Technologie avancée</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Laser médical de dernière génération
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Adapté à tous types de peau
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Traitement confortable et sécurisé
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-accent/10 rounded-lg p-6">
                    <h3 className="font-medium text-foreground mb-4">Zones traitées</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Visage et corps
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Zones sensibles avec expertise
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Résultats durables et efficaces
                      </li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-center font-medium mt-8">
                  Une approche personnalisée pour chaque client, dans le respect de votre confort et de vos attentes.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-primary/5 rounded-lg p-12">
              <h2 className="text-2xl font-light primary-text mb-6">
                Venez vivre votre propre expérience
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Réservez votre séance aujourd'hui et découvrez l'art du soin en douceur.
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