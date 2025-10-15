import { Facebook, Instagram } from "lucide-react";
import Logo from "@/components/logo";

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="glass-effect border-t py-12" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div data-testid="footer-brand">
            <div className="flex items-center space-x-3 mb-4">
              <Logo />
              <div className="font-semibold text-lg text-foreground">Odyssea Lymphea</div>
            </div>
            <p className="text-muted-foreground mb-4" data-testid="footer-description">
              Cabinet de kinésithérapie spécialisé dans le drainage lymphatique, le traitement de cicatrices et l'épilation laser à Waterloo.
            </p>
            <div className="flex space-x-4" data-testid="footer-social">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-facebook"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-instagram"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div data-testid="footer-navigation">
            <h3 className="font-medium text-foreground mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollToSection("accueil")}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="footer-link-accueil"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("services")}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="footer-link-services"
                >
                  Services
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("apropos")}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="footer-link-apropos"
                >
                  À propos
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("contact")}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="footer-link-contact"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>
          
          <div data-testid="footer-contact">
            <h3 className="font-medium text-foreground mb-4">Contact</h3>
            <div className="space-y-2 text-muted-foreground">
              <p className="flex items-start" data-testid="footer-address">
                <span className="mr-2 text-primary mt-1">📍</span>
                Rue de la station, 70<br />1410 Waterloo
              </p>
              <p className="flex items-center" data-testid="footer-phone">
                <span className="mr-2 text-primary">📞</span>
                +32 494 74 17 77
              </p>
              <p className="flex items-center" data-testid="footer-email">
                <span className="mr-2 text-primary">✉️</span>
                odyssea.lymphea@gmail.com
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground" data-testid="footer-copyright">
          <p>&copy; 2024 Odyssea Lymphea. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
