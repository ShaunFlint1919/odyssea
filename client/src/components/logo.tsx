import logoImage from "@assets/logo cabinet_1757463193419.png";

export default function Logo() {
  return (
    <div className="logo-container" data-testid="logo">
      <img 
        src={logoImage} 
        alt="Odyssea Lymphea Logo" 
        className="w-16 h-16 object-contain"
      />
    </div>
  );
}
