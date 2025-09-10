export default function MinimalFooter() {
  return (
    <footer className="minimal-section py-16 border-t" data-testid="footer">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-16 text-center">
          <div data-testid="footer-location">
            <h3 className="font-medium text-foreground mb-4">Emplacement</h3>
            <div className="space-y-1 text-muted-foreground text-sm">
              <p data-testid="text-address-street">Rue de la station, 70</p>
              <p data-testid="text-address-city">1410 Waterloo</p>
            </div>
          </div>
          
          <div data-testid="footer-hours">
            <h3 className="font-medium text-foreground mb-4">Heures d'ouverture</h3>
            <div className="space-y-1 text-muted-foreground text-sm">
              <p>lundi - vendredi</p>
              <p data-testid="text-hours-weekdays">9h - 19h</p>
              <p>samedi</p>
              <p data-testid="text-hours-saturday">10h - 13h</p>
            </div>
          </div>
          
          <div data-testid="footer-contact">
            <h3 className="font-medium text-foreground mb-4">Contact</h3>
            <div className="space-y-1 text-muted-foreground text-sm">
              <p data-testid="text-phone">+32 494 74 17 77</p>
              <p data-testid="text-email">odyssea.lymphea@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}