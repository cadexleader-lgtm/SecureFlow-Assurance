import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Phone,
  Bus,
  Shield,
  Heart,
  Briefcase,
  AlertCircle,
  PhoneCall,
  FileText,
  User,
  Navigation,
  Globe,
  Mail,
  Scale,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface VerifyData {
  id: number;
  policyNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  insuranceCompany: string | null;
  departure: string | null;
  destination: string;
  company: string;
  busNumber: string | null;
  travelDate: string;
  travelTime: string;
  price: number;
  qrCode: string;
  status: string;
  statutAssurance: string;
  dateExpiration: string | null;
  coverageStart: string;
  coverageEnd: string;
  createdAt: string;
  insuranceLogo: string | null;
  raisonSociale: string | null;
  formeJuridique: string | null;
  capitalSocial: string | null;
  siegeSocial: string | null;
  insuranceTelephone: string | null;
  insuranceEmail: string | null;
  siteWeb: string | null;
  numeroAgrementCima: string | null;
  numeroIfu: string | null;
  garantieDeces: string | null;
  garantieInvalidite: string | null;
  garantieFraisMedicaux: string | null;
  garantieRapatriement: string | null;
  dureeValidite: string | null;
  franchise: string | null;
  hotlineSinistres: string | null;
  emailSinistres: string | null;
  emailReclamations: string | null;
  urlDeclarationSinistre: string | null;
  urlConditionsGenerales: string | null;
  documentsRequis: string | null;
  exclusionsPrincipales: string | null;
  typePolice: string | null;
  souscripteur: string | null;
}

const defaultCoverageItems = [
  { icon: Heart, label: "Frais medicaux en cas d'accident", detail: "Prise en charge jusqu'a 500 000 FCFA" },
  { icon: Briefcase, label: "Perte ou dommage des bagages", detail: "Indemnisation jusqu'a 150 000 FCFA" },
  { icon: AlertCircle, label: "Retard ou annulation du voyage", detail: "Remboursement du billet" },
  { icon: Shield, label: "Responsabilite civile", detail: "Couverture en cas de dommages a un tiers" },
  { icon: User, label: "Rapatriement sanitaire", detail: "Transport medical d'urgence inclus" },
];

export default function Verify() {
  const params = useParams<{ id: string }>();

  const { data: passenger, isLoading, error } = useQuery<VerifyData>({
    queryKey: ["/api/verify", params.id],
  });

  const computeTimeRemaining = (dateExp: string | null | undefined) => {
    if (!dateExp) return null;
    const exp = new Date(dateExp).getTime();
    const now = Date.now();
    const diff = exp - now;
    if (diff <= 0) return { expired: true, text: "Expiree", days: Math.abs(Math.floor(diff / 86400000)) };
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours >= 24) {
      const d = Math.floor(hours / 24);
      const h = hours % 24;
      return { expired: false, text: `${d}j ${h}h ${minutes}min`, days: 0 };
    }
    return { expired: false, text: `${hours}h ${minutes}min`, days: 0 };
  };

  const [timeRemaining, setTimeRemaining] = useState(computeTimeRemaining(passenger?.dateExpiration));

  useEffect(() => {
    if (!passenger?.dateExpiration) return;
    setTimeRemaining(computeTimeRemaining(passenger.dateExpiration));
    const interval = setInterval(() => {
      setTimeRemaining(computeTimeRemaining(passenger.dateExpiration));
    }, 60000);
    return () => clearInterval(interval);
  }, [passenger?.dateExpiration]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !passenger) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold" data-testid="text-verify-error">Verification echouee</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aucune police d'assurance trouvee pour cet identifiant. Verifiez le QR code et reessayez.
              </p>
            </div>
            <div className="w-full border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Si vous pensez qu'il s'agit d'une erreur, contactez notre service client.
              </p>
              <p className="text-xs font-semibold mt-1">+229 01 50 36 36 36</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpiredByTime = timeRemaining?.expired === true;
  const isActive = passenger.statutAssurance === "actif" && !isExpiredByTime;
  const hasInsuranceLegal = passenger.raisonSociale || passenger.numeroAgrementCima;
  const hasGuarantees = passenger.garantieDeces || passenger.garantieInvalidite || passenger.garantieFraisMedicaux || passenger.garantieRapatriement;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " a " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const guaranteeItems = hasGuarantees ? [
    passenger.garantieDeces ? { icon: Heart, label: "Deces accidentel", detail: passenger.garantieDeces } : null,
    passenger.garantieInvalidite ? { icon: Shield, label: "Invalidite permanente", detail: passenger.garantieInvalidite } : null,
    passenger.garantieFraisMedicaux ? { icon: Briefcase, label: "Frais medicaux", detail: passenger.garantieFraisMedicaux } : null,
    passenger.garantieRapatriement ? { icon: User, label: "Rapatriement", detail: passenger.garantieRapatriement } : null,
  ].filter(Boolean) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-primary px-4 py-4 flex items-center gap-3" data-testid="verify-header">
        <img src="/logo.jpeg" alt="SecureFlow" className="w-10 h-10 rounded-md bg-white p-0.5 object-contain" />
        <div>
          <h1 className="text-primary-foreground font-bold text-lg tracking-tight">SecureFlow</h1>
          <p className="text-primary-foreground/70 text-xs">Certificat d'Assurance Voyage</p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4 pb-8">
        <div className={`rounded-lg p-4 flex items-start gap-3 ${isActive ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"}`} data-testid="verify-status-banner">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${isActive ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
            {isActive ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className={`text-base font-bold ${isActive ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`} data-testid="text-verify-status">
              {isActive ? "Assurance Active" : "Assurance Expiree"}
            </h2>
            {isActive && timeRemaining && !timeRemaining.expired ? (
              <div>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Valide jusqu'au : {passenger.dateExpiration ? formatDateTime(passenger.dateExpiration) : "-"}
                </p>
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mt-0.5" data-testid="text-time-remaining">
                  Temps restant : {timeRemaining.text}
                </p>
              </div>
            ) : !isActive ? (
              <div>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {passenger.dateExpiration ? `Expiree le : ${formatDateTime(passenger.dateExpiration)}` : "La couverture pour ce voyage a expire"}
                </p>
                {timeRemaining && timeRemaining.expired && timeRemaining.days > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    Depuis {timeRemaining.days} jour(s)
                  </p>
                )}
                <p className="text-xs font-semibold text-red-800 dark:text-red-300 mt-1">
                  Ce passager n'est plus couvert
                </p>
              </div>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-400">
                Votre couverture est valide pour ce voyage
              </p>
            )}
          </div>
        </div>

        {(hasInsuranceLegal || passenger.insuranceLogo) && (
          <Card data-testid="card-insurance-identity">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {passenger.insuranceLogo && (
                  <img
                    src={passenger.insuranceLogo}
                    alt={passenger.insuranceCompany || "Assurance"}
                    className="w-14 h-14 rounded-lg object-contain bg-white border border-border shrink-0"
                    data-testid="img-verify-insurance-logo"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold" data-testid="text-verify-raison-sociale">
                    {passenger.raisonSociale || passenger.insuranceCompany}
                  </h3>
                  {passenger.formeJuridique && (
                    <p className="text-xs text-muted-foreground">{passenger.formeJuridique}{passenger.capitalSocial ? ` au capital de ${passenger.capitalSocial}` : ""}</p>
                  )}
                  {passenger.siegeSocial && (
                    <p className="text-xs text-muted-foreground mt-0.5">{passenger.siegeSocial}</p>
                  )}
                  {passenger.insuranceTelephone && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">{passenger.insuranceTelephone}</span>
                    </div>
                  )}
                  {passenger.insuranceEmail && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">{passenger.insuranceEmail}</span>
                    </div>
                  )}
                  {passenger.siteWeb && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">{passenger.siteWeb}</span>
                    </div>
                  )}
                </div>
              </div>
              {(passenger.numeroAgrementCima || passenger.numeroIfu) && (
                <div className="mt-3 pt-2 border-t border-border flex flex-wrap gap-3">
                  {passenger.numeroAgrementCima && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Agrement CIMA</p>
                      <p className="text-xs font-semibold" data-testid="text-verify-agrement">{passenger.numeroAgrementCima}</p>
                    </div>
                  )}
                  {passenger.numeroIfu && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">N° IFU</p>
                      <p className="text-xs font-semibold" data-testid="text-verify-ifu">{passenger.numeroIfu}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white dark:bg-muted rounded-lg border border-border shrink-0">
                <QRCodeSVG value={`${window.location.origin}/verify/${passenger.id}`} size={80} level="H" includeMargin={false} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-muted-foreground" data-testid="text-policy-number">{passenger.policyNumber}</p>
                <h3 className="text-lg font-bold mt-0.5 truncate" data-testid="text-verify-name">{passenger.fullName}</h3>
                <p className="text-xs text-muted-foreground">Passager assure</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs" data-testid="text-verify-phone">{passenger.phone}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Details du voyage
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {passenger.departure && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Depart</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Navigation className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-sm" data-testid="text-verify-departure">{passenger.departure}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Destination</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <p className="font-semibold text-sm" data-testid="text-verify-destination">{passenger.destination}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compagnie</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <p className="font-semibold text-sm" data-testid="text-verify-company">{passenger.company}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date de voyage</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <p className="font-semibold text-sm" data-testid="text-verify-date">{formatDate(passenger.travelDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Heure de depart</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <p className="font-semibold text-sm" data-testid="text-verify-time">{passenger.travelTime}</p>
                </div>
              </div>
              {passenger.busNumber && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Numero de bus</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Bus className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-sm" data-testid="text-verify-bus">{passenger.busNumber}</p>
                  </div>
                </div>
              )}
              {passenger.documentType && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{passenger.documentType}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="font-mono font-semibold text-sm" data-testid="text-verify-document">{passenger.documentNumber || "-"}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Duree de couverture
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center p-2 rounded-md bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Debut</p>
                <p className="text-sm font-bold" data-testid="text-coverage-start">{formatDate(passenger.coverageStart)}</p>
                <p className="text-xs text-muted-foreground">{passenger.travelTime}</p>
              </div>
              <div className="text-muted-foreground text-xs font-semibold">a</div>
              <div className="flex-1 text-center p-2 rounded-md bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Fin</p>
                <p className="text-sm font-bold" data-testid="text-coverage-end">{formatDate(passenger.coverageEnd)}</p>
                <p className="text-xs text-muted-foreground">{passenger.dureeValidite || "23:59"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10">
              <span className="text-sm text-muted-foreground">Prix de l'assurance</span>
              <span className="text-lg font-bold text-primary" data-testid="text-verify-price">{passenger.price} FCFA</span>
            </div>
            {passenger.franchise && (
              <p className="text-xs text-muted-foreground mt-2">Franchise : {passenger.franchise}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Garanties couvertes
            </h4>
            <div className="space-y-3" data-testid="coverage-list">
              {guaranteeItems ? guaranteeItems.map((item, i) => item && (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                </div>
              )) : defaultCoverageItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {(passenger.emergencyContactName || passenger.emergencyContactPhone) && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                Personne a contacter en cas de sinistre
              </h4>
              <div className="space-y-2">
                {passenger.emergencyContactName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Nom</span>
                    <span className="text-sm font-semibold" data-testid="text-verify-emergency-name">{passenger.emergencyContactName}</span>
                  </div>
                )}
                {passenger.emergencyContactPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Telephone</span>
                    <span className="text-sm font-semibold" data-testid="text-verify-emergency-phone">{passenger.emergencyContactPhone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(passenger.hotlineSinistres || passenger.emailSinistres) && (
          <Card className="border-orange-200 dark:border-orange-800" data-testid="card-insurance-contacts">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-orange-700 dark:text-orange-400">
                <PhoneCall className="w-4 h-4" />
                Contact assurance en cas de sinistre
              </h4>
              <div className="space-y-2">
                {passenger.hotlineSinistres && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Hotline 24/7</span>
                    <span className="text-sm font-bold">{passenger.hotlineSinistres}</span>
                  </div>
                )}
                {passenger.emailSinistres && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email sinistres</span>
                    <span className="text-sm font-bold">{passenger.emailSinistres}</span>
                  </div>
                )}
                {passenger.urlDeclarationSinistre && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Declaration en ligne</span>
                    <span className="text-sm font-bold">{passenger.urlDeclarationSinistre}</span>
                  </div>
                )}
              </div>
              {passenger.documentsRequis && (
                <div className="mt-3 pt-2 border-t border-border">
                  <p className="text-xs font-semibold mb-1">Documents a fournir :</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{passenger.documentsRequis}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/30">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
              <PhoneCall className="w-4 h-4" />
              Contact SecureFlow en cas de sinistre
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Numero d'urgence</span>
                <span className="text-sm font-bold" data-testid="text-emergency-phone">+229 01 50 36 36 36</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">WhatsApp</span>
                <span className="text-sm font-bold">+229 01 50 36 36 36</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-bold">infosecureflowco@gmail.com</span>
              </div>
              <div className="mt-3 p-2 rounded-md bg-muted/50">
                <p className="text-[10px] text-muted-foreground">
                  En cas d'accident ou de sinistre, appelez immediatement le numero d'urgence ci-dessus. Gardez votre QR code et votre numero de police ({passenger.policyNumber}) a portee de main pour faciliter la prise en charge.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(passenger.typePolice || passenger.souscripteur || passenger.urlConditionsGenerales || passenger.exclusionsPrincipales) && (
          <Card data-testid="card-legal-mentions">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-muted-foreground" />
                Mentions legales
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                {passenger.typePolice && (
                  <p>{passenger.typePolice}</p>
                )}
                {passenger.souscripteur && (
                  <p>Souscrite par {passenger.souscripteur} aupres de {passenger.insuranceCompany}</p>
                )}
                <p>Regie par le Code CIMA</p>
                {passenger.emailReclamations && (
                  <p>Reclamations : {passenger.emailReclamations}</p>
                )}
                {passenger.urlConditionsGenerales && (
                  <p>Conditions generales : {passenger.urlConditionsGenerales}</p>
                )}
                {passenger.exclusionsPrincipales && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-foreground mb-1">Exclusions principales :</p>
                    <p className="whitespace-pre-line">{passenger.exclusionsPrincipales}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Pourquoi souscrire a l'assurance transport ?
            </h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                Les routes au Benin presentent des risques importants : accidents de la route, pannes mecaniques, conditions meteorologiques imprevisibles. Chaque annee, des centaines de passagers sont touches par des incidents sur les axes routiers.
              </p>
              <p>
                Avec SecureFlow, vous etes protege des le depart jusqu'a votre destination. En cas de sinistre, vos frais medicaux, vos bagages et vos droits sont couverts. Voyagez l'esprit tranquille.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-2">
          <img src="/logo.jpeg" alt="SecureFlow" className="w-8 h-8 rounded-md mx-auto mb-1 object-contain" />
          <p className="text-[10px] text-muted-foreground">Powered by SecureFlow | www.secureflow.bj</p>
          <p className="text-[10px] text-muted-foreground">Voyagez en toute securite</p>
        </div>
      </div>
    </div>
  );
}
