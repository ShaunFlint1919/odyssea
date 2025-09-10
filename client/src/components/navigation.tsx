import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "nav-minimal shadow-sm" : "nav-minimal"
      }`}
      data-testid="navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3" data-testid="logo-section">
            <Logo />
            <div className="font-semibold text-lg text-foreground">Odyssea Lymphea</div>
          </div>
          
          <div className="hidden md:flex space-x-8" data-testid="desktop-menu">
            <button 
              onClick={() => scrollToSection("accueil")}
              className="text-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-accueil"
            >
              Accueil
            </button>
            <button 
              onClick={() => scrollToSection("services")}
              className="text-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-services"
            >
              Renata Franca
            </button>
            <button 
              onClick={() => scrollToSection("apropos")}
              className="text-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-apropos"
            >
              Drainage lymphatique conventionnel
            </button>
            <button 
              onClick={() => scrollToSection("contact")}
              className="text-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-contact"
            >
              Soins de cicatrices
            </button>
            <button 
              onClick={() => scrollToSection("contact")}
              className="text-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-epilation"
            >
              Épilation laser
            </button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-card border-t border-border" data-testid="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => scrollToSection("accueil")}
                className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="mobile-link-accueil"
              >
                Accueil
              </button>
              <button 
                onClick={() => scrollToSection("services")}
                className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="mobile-link-services"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection("apropos")}
                className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="mobile-link-apropos"
              >
                À propos
              </button>
              <button 
                onClick={() => scrollToSection("contact")}
                className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="mobile-link-contact"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
