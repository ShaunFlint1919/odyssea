import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import renataFrancaHorizontal from "@assets/logo-horizontal-noir-or (1)_1757961640279.jpg";
import renataFrancaVertical from "@assets/logo-vertical-noir-or_1757961640279.jpg";

export default function RenataFranca() {
  const { elementRef, isVisible } = useIntersectionObserver();

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
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div 
            ref={elementRef}
            className={`text-center mb-16 fade-in ${isVisible ? "visible" : ""}`}
          >
            <div className="mb-12 bg-background rounded-lg p-6">
              <img 
                src={renataFrancaHorizontal} 
                alt="Méthode Renata França"
                className="mx-auto max-w-md w-full h-auto object-contain mix-blend-multiply"
              />
            </div>
            <h1 className="text-3xl lg:text-4xl font-light primary-text mb-8">
              Les soins Renata Franca chez Odyssea Lymphea
            </h1>
            <div className="text-muted-foreground leading-relaxed space-y-4 text-sm max-w-3xl mx-auto">
              <p>
                Chez Odyssea Lymphea, nous avons fait le choix du changement, nous vous amenons combien au <strong>Brésil</strong>, chez Carmen célèbre de <strong>Renata Franca</strong>, pour une journée d'enseignement inédit et en <strong>méthode originale</strong>. C'est ce choix-là que en à fait avec nous nos protocoles authentiques et unique pour vous donner de nous savez ce sont les fondements de nos savoir-être et bien-être pour notre patientèle. Nous avons fait le choix de la première chance.
              </p>
              <p>
                <strong>Notre méthode exclusive provient donc du Brésil.</strong>
              </p>
              <p>
                Nous avons besoin de partager où sous <strong>Renata Franca authentiques</strong>, selon la techniques auquel de la formation.
              </p>
            </div>
          </div>

          {/* Drainage Lymphatique Section */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                DRAINAGE LYMPHATIQUE - SIGNATURE RENATA FRANCA (80 MIN)
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Le drainage lymphatique Renata Franca se prise d'un drainage classique. C'est un massage <strong>ferme et rapide</strong>, qui utilise des <strong>chaudes intensités</strong>, très spécialisé et segments. Il s'effective à l'aide de manœuvres spécifiques et de rythmes rapides et variés.
                </p>
                <p>
                  Bien plus qu'un soin esthétique, c'est un véritable <strong>allié santé et bien-être</strong>, le thérapie dans notre centre de beau-entretien.
                </p>
                
                <div className="mt-6">
                  <h3 className="font-medium text-foreground mb-3">Les bienfaits :</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Favorise une efficace des drainés métaboliques
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Améliore des inflammations et de gonflement
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Favorise une élimination des toxines
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Stimulation du système immunitaire
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Technique de jambes lourdes et favorise la circulation sanguine
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Aide à l'anesthésie et prévient les affaissements de ligament
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Favorise des résultats de programmes nutritionnels ou esthétiques différents
                    </li>
                  </ul>
                </div>
                
                <p className="mt-6">
                  Se permet aussi et seul, un accompagnement minceur ou bien d'amélioration pour <strong>détacher l'organise</strong>, dénouer une de rigidité et complète; des effets très visibles dès la séance.
                </p>
                
                <p className="text-right font-medium mt-6">Tarif : 100 €</p>
              </div>
            </div>
          </section>

          {/* Massage Remodelant Section */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                MASSAGE REMODELANT (60 MIN)
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Ce massage très thérapeutique est destiné spécialement pour les <strong>zones graisseuses et la cellulite</strong> aussi bien k 1, results. Modifié les tissus pour affres collectivement plus de fermeté et de tonus.
                </p>
                
                <div className="mt-6">
                  <h3 className="font-medium text-foreground mb-3">Principe du buste :</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Action puissante pour une cellulite localisée
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Gestes toutes plus toujours pour bonne fermeté, finesse...
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Amélioration de la biosité cutanée
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Meilleurs effets très de première chance
                    </li>
                  </ul>
                </div>
                
                <p className="mt-6">
                  Ce soin est décrit sur un massage sculptant est configué esthétique et relaxant.
                </p>
                
                <p className="text-right font-medium mt-6">Tarif : 90 €</p>
              </div>
            </div>
          </section>

          {/* Miracle Touch Section */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                MIRACLE TOUCH - LIFT DE LA SYMPHONIE (60 MIN)
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Le Miracle Touch est aussi conçu sur un <strong>Renata Franca</strong>, il combine les <strong>effets drainants + drainage lymphatique</strong> et se <strong>bienfaits anti-inflammat</strong> + cosmétique.
                </p>
                
                <div className="mt-6">
                  <h3 className="font-medium text-foreground mb-3">Les résultats :</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Corps affiné sans souffrir
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Objectifs de fermeté
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Bien-être et détente
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Ses soins lifting service immodat
                    </li>
                  </ul>
                </div>
                
                <p className="mt-6">
                  C'est le soin idéal avant un événement ou pour débuter son métabolisme avant efficacité.
                </p>
                
                <p className="text-right font-medium mt-6">Tarif : 90 €</p>
              </div>
            </div>
          </section>

          {/* Massage Relaxant Section */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                MASSAGE RELAXANT - L'INSTANT POUR SOI (60 MIN)
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Un moment personnel d'abandon et en bien-être où se.
                </p>
                <p>
                  Application personnée d'<strong>chaçunes</strong> et en <strong>bien-être</strong>
                </p>
                <p>
                  Application of dispersal
                </p>
                <p>
                  Ce massage fait totalement partie du thème prétive du Delémenteurs voiturent.
                </p>
                
                <p className="text-right font-medium mt-6">Tarif : 70 €</p>
              </div>
            </div>
          </section>

          {/* Miracle Face Section */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6 text-center">
                MIRACLE FACE - LE SOIN DU VISAGE QUI CHANGE TOUT (90 MIN)
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Le Miracle Face de Renata Franca prise de drainage et remodelage du visage, à elle Franca.
                </p>
                <p>
                  Ses effets se ressentent pour un éclique immédiat !
                </p>
                
                <div className="mt-6">
                  <h3 className="font-medium text-foreground mb-3">Les points :</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Objectifs cellulage
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Stimulation des points par canaux
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Amélioration de la souplesse musculaire
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Amélioration de la circulation sanguine + lymphatique
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Levée dilation métal
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Amélioration de la fermeté + éfffets lifting du visage
                    </li>
                  </ul>
                </div>
                
                <p className="mt-6">
                  Les soins visage parfait pour retrouver surface, finitions et fermeté en une seule séance.
                </p>
                
                <p className="text-right font-medium mt-6">Tarif : 95 €</p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-primary/5 rounded-lg p-12">
              <div className="mb-8 bg-background rounded-lg p-6">
                <img 
                  src={renataFrancaVertical} 
                  alt="Méthode Renata França"
                  className="mx-auto max-w-xs w-full h-auto object-contain mix-blend-multiply"
                />
              </div>
              <h2 className="text-2xl font-light primary-text mb-6">
                Prenez rendez-vous pour un voyage sensoriel brésilien
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Votre corps mérite ce qu'il y a de mieux. Offrez-le un soin signé Renata Franca, dans un service en belle et bien-être monde.
              </p>
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="button-minimal px-8 py-3 rounded font-medium"
              >
                Prendre rendez-vous
              </button>
            </div>
          </section>

        </div>
      </main>
      
      <MinimalFooter />
    </div>
  );
}