import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import Logo from "@/components/logo";
import { SiInstagram } from "react-icons/si";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();

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
            <div className="font-light text-2xl text-foreground">Odyssea Lymphea</div>
          </div>
          
          <div className="hidden md:flex space-x-8" data-testid="desktop-menu">
            <Link href="/">
              <span className="text-foreground hover:text-primary transition-colors text-sm cursor-pointer">
                Accueil
              </span>
            </Link>
            <Link href="/renata-franca">
              <span className="text-foreground hover:text-primary transition-colors text-sm cursor-pointer">
                Renata Franca
              </span>
            </Link>
            <Link href="/drainage-lymphatique">
              <span 
                className="text-foreground hover:text-primary transition-colors text-sm cursor-pointer"
                data-testid="link-drainage-lymphatique"
              >
                Drainage lymphatique conventionnel
              </span>
            </Link>
            <Link href="/soins-cicatrices">
              <span className="text-foreground hover:text-primary transition-colors text-sm cursor-pointer">
                Soins de cicatrices
              </span>
            </Link>
            <Link href="/epilation-laser">
              <span 
                className="text-foreground hover:text-primary transition-colors text-sm cursor-pointer"
                data-testid="link-epilation-laser"
              >
                Épilation Laser
              </span>
            </Link>
            <a 
              href="https://www.instagram.com/odyssealymphea_?igsh=MTZ4dHI3dWZ0amJhaA=="
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
              data-testid="link-instagram"
            >
              <SiInstagram className="h-5 w-5" />
            </a>
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
              <Link href="/">
                <span 
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  data-testid="mobile-link-accueil"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Accueil
                </span>
              </Link>
              <Link href="/renata-franca">
                <span 
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  data-testid="mobile-link-renata-franca"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Renata Franca
                </span>
              </Link>
              <Link href="/drainage-lymphatique">
                <span 
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  data-testid="mobile-link-drainage-lymphatique"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Drainage lymphatique conventionnel
                </span>
              </Link>
              <Link href="/soins-cicatrices">
                <span 
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  data-testid="mobile-link-soins-cicatrices"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Soins de cicatrices
                </span>
              </Link>
              <Link href="/epilation-laser">
                <span 
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  data-testid="mobile-link-epilation-laser"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Épilation Laser
                </span>
              </Link>
              <a 
                href="https://www.instagram.com/odyssealymphea_?igsh=MTZ4dHI3dWZ0amJhaA=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="mobile-link-instagram"
                onClick={() => setIsMenuOpen(false)}
              >
                <SiInstagram className="h-5 w-5 mr-2" />
                Instagram
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
