import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Phone, Mail, Send } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useToast } from "@/hooks/use-toast";

export default function ContactSection() {
  const { elementRef, isVisible } = useIntersectionObserver();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    service: "",
    message: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.service) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez entrer une adresse email valide.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Demande envoyée avec succès!",
        description: "Nous vous recontacterons dans les plus brefs délais.",
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        service: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Erreur lors de l'envoi",
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-background" data-testid="contact-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={elementRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-3xl lg:text-4xl font-light mb-4" data-testid="contact-title">
            <span className="text-gradient">Contactez-nous</span>
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="contact-description">
            Prenez rendez-vous pour une consultation personnalisée
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-8">
            <Card className={`glass-effect fade-in ${
              isVisible ? "visible" : ""
            }`} data-testid="contact-info-location">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-foreground mb-4 flex items-center">
                  <MapPin className="text-primary mr-3 h-5 w-5" />
                  Emplacement
                </h3>
                <p className="text-muted-foreground mb-2" data-testid="text-address-street">Rue de la station, 70</p>
                <p className="text-muted-foreground" data-testid="text-address-city">1410 Waterloo</p>
              </CardContent>
            </Card>

            <Card className={`glass-effect fade-in ${
              isVisible ? "visible" : ""
            }`} style={{ transitionDelay: "200ms" }} data-testid="contact-info-hours">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-foreground mb-4 flex items-center">
                  <Clock className="text-primary mr-3 h-5 w-5" />
                  Heures d'ouverture
                </h3>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Lundi - Jeudi</span>
                    <span data-testid="text-hours-weekdays">9h - 19h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendredi</span>
                    <span data-testid="text-hours-friday">9h - 18h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Samedi</span>
                    <span data-testid="text-hours-saturday">9h30 - 13h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dimanche</span>
                    <span data-testid="text-hours-sunday">Fermé</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`glass-effect fade-in ${
              isVisible ? "visible" : ""
            }`} style={{ transitionDelay: "400ms" }} data-testid="contact-info-details">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-foreground mb-4 flex items-center">
                  <Phone className="text-primary mr-3 h-5 w-5" />
                  Contact
                </h3>
                <p className="text-muted-foreground mb-2" data-testid="text-phone">+32 494 74 17 77</p>
                <p className="text-muted-foreground" data-testid="text-email">odyssea.lymphea@gmail.com</p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className={`glass-effect fade-in ${
              isVisible ? "visible" : ""
            }`} style={{ transitionDelay: "600ms" }} data-testid="contact-form-card">
              <CardContent className="p-8">
                <h3 className="text-xl font-medium text-foreground mb-6" data-testid="form-title">
                  Prendre rendez-vous
                </h3>
                <form className="space-y-6" onSubmit={handleSubmit} data-testid="appointment-form">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                        Prénom *
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="w-full"
                        data-testid="input-firstname"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                        Nom *
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="w-full"
                        data-testid="input-lastname"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="w-full"
                        data-testid="input-email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="w-full"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="service" className="block text-sm font-medium text-foreground mb-2">
                      Service souhaité *
                    </Label>
                    <Select value={formData.service} onValueChange={(value) => handleInputChange("service", value)}>
                      <SelectTrigger className="w-full" data-testid="select-service">
                        <SelectValue placeholder="Sélectionnez un service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drainage">Drainage lymphatique</SelectItem>
                        <SelectItem value="cicatrices">Traitement de cicatrices</SelectItem>
                        <SelectItem value="epilation">Épilation laser</SelectItem>
                        <SelectItem value="consultation">Consultation générale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      rows={4}
                      className="w-full resize-none"
                      placeholder="Décrivez brièvement votre demande ou vos questions..."
                      data-testid="textarea-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full button-modern text-primary-foreground py-4 rounded-lg font-medium h-auto flex items-center justify-center"
                    data-testid="button-submit"
                  >
                    {isSubmitting ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer la demande
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
