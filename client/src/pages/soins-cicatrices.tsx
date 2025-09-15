import Navigation from "@/components/navigation";
import MinimalFooter from "@/components/minimal-footer";
import { useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export default function SoinsCicatrices() {
  const { elementRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    document.title = "Soins de cicatrices - Odyssea Lymphea | Endneedling à Waterloo";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Traitement innovant des cicatrices par endneedling chez Odyssea Lymphea. Combinaison endermologie médicale et microneedling pour tous types de peau à Waterloo.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Traitement innovant des cicatrices par endneedling chez Odyssea Lymphea. Combinaison endermologie médicale et microneedling pour tous types de peau à Waterloo.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header Introduction */}
          <div 
            ref={elementRef}
            className={`text-center mb-16 fade-in ${isVisible ? "visible" : ""}`}
          >
            <p className="text-muted-foreground leading-relaxed text-sm max-w-3xl mx-auto mb-16">
              Lorsque la peau a vécu des agressions ou des interventions chirurgicales, elle peut présenter des cicatrices inesthétiques ou inconfortables. Que ce soit suite à une intervention chirurgicale, un accident, de l'acné ou encore des vergetures cutanées.
            </p>
          </div>

          {/* Endneedling Section */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h1 className="text-2xl font-medium primary-text mb-8">
                Endneedling : notre approche signature
              </h1>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-6">
                <p>
                  Chez Odyssea Lymphea, nous avons développé une approche exclusive : l'endneedling, une combinaison synergique d'endermologie médicale (LPG) et de microneedling médical.
                </p>
                <p>
                  Cette alliance puissante agit en profondeur sur les tissus cicatriciels pour optimiser la régénération cutanée :
                </p>
                
                <div className="mt-8">
                  <h3 className="font-medium text-foreground mb-4">Endermologie médicale (massage mécanique par succion et roulage) :</h3>
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Stimule la circulation sanguine et lymphatique, favorisant le drainage des toxines, fluides et œdèmes locaux
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Remodèle les adhérences et la fibrose, redonnant souplesse et élasticité à la peau
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Améliore l'oxygénation et la nutrition cellulaire, préparant parfaitement la peau au microneedling
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <h3 className="font-medium text-foreground mb-4">Microneedling médical :</h3>
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Induit la production naturelle de collagène et d'élastine, pour une texture plus lisse et uniforme
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Particulièrement utile pour les peaux foncées (phototypes IV à VI), grâce à son action contrôlée et respectueuse de l'épiderme
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Idéal pour les cicatrices atrophiques, hypertrophiques, ou dans les zones sensibles et visibles
                    </li>
                  </ul>
                </div>

                <p className="mt-8 font-medium">
                  En associant ces deux techniques, l'endneedling maximise les résultats, tout en réduisant les risques.
                </p>
              </div>
            </div>
          </section>

          {/* Protocole personnalisé */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6">
                Protocole personnalisé jusqu'au phénotype VI
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  Notre approche est entièrement sur mesure et s'adapte à chaque profil de peau et de cicatrice :
                </p>
                
                <ul className="space-y-3 ml-4 mt-6">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Type de cicatrices : atrophique, hypertrophique, chéloïde
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Ancienneté et localisation de la cicatrice
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    Objectifs esthétiques et confort du patient
                  </li>
                </ul>

                <div className="mt-8">
                  <p className="font-medium text-foreground mb-4">Nos soins combinés permettent :</p>
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Un lissage progressif du relief cicatriciel
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Une souplesse restaurée et un meilleur confort cutané
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Une peau plus éclatante, en respectant le teint naturel
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></span>
                      Une prévention efficace des complications secondaires (rigidité, adhérences...)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Déroulé d'un protocole type */}
          <section className="mb-16">
            <div className="bg-accent/10 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6">
                Déroulé d'un protocole type
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full mr-4 mt-1 flex-shrink-0">1</span>
                    <div>
                      <h3 className="font-medium text-foreground">Consultation initiale :</h3>
                      <p>Évaluation et plan de traitement personnalisé</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full mr-4 mt-1 flex-shrink-0">2</span>
                    <div>
                      <h3 className="font-medium text-foreground">Séances d'endneedling :</h3>
                      <p>association endermologie médicale + microneedling</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full mr-4 mt-1 flex-shrink-0">3</span>
                    <div>
                      <h3 className="font-medium text-foreground">Suivi régulier :</h3>
                      <p>ajustement du protocole selon l'évolution des résultats</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* En résumé */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-medium primary-text mb-6">
                En résumé
              </h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>
                  L'endneedling par Odyssea Lymphea est une solution professionnelle, sûre et innovante pour traiter les cicatrices de manière douce, efficace et adaptée à toutes les carnations, jusqu'aux phénotypes VI.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-primary/5 rounded-lg p-12">
              <h2 className="text-2xl font-light primary-text mb-6">
                Contactez-nous
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Contactez-nous dès aujourd'hui pour une évaluation sur mesure et entamons ensemble un chemin vers une cicatrisation harmonieuse, esthétique et durable.
              </p>
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="button-minimal px-8 py-3 rounded font-medium"
                data-testid="button-contact"
              >
                Contactez-nous
              </button>
            </div>
          </section>

        </div>
      </main>
      
      <MinimalFooter />
    </div>
  );
}