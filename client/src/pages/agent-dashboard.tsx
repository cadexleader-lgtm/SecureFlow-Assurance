import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { documentTypes, insertPassengerSchema } from "@shared/schema";
import type { Passenger, TransportCompany } from "@shared/schema";
import { UserPlus, QrCode, Printer, Share2, CheckCircle2, MapPin, Bus, Clock, Phone, Calendar, Building2, TrendingUp, LogOut, ChevronDown, ChevronUp, Shield, Settings as SettingsIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SettingsPage from "@/pages/settings";

const registerSchema = insertPassengerSchema.extend({
  fullName: z.string().min(2, "Le nom complet est requis (min 2 caracteres)"),
  phone: z.string().min(8, "Numero de telephone valide requis (min 8 chiffres)"),
  email: z.string().email("Adresse email invalide").or(z.literal("")).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  departure: z.string().min(1, "Saisissez la ville de depart"),
  destination: z.string().min(1, "Saisissez la ville de destination"),
  company: z.string().min(1, "Selectionnez une compagnie"),
  travelDate: z.string().min(1, "Date de voyage requise"),
  travelTime: z.string().min(1, "Heure de depart requise"),
  price: z.coerce.number().min(100, "Prix minimum 100 FCFA").default(500),
});

type RegisterFormData = z.infer<typeof registerSchema>;

function printTicket() {
  const ticketEl = document.querySelector('[data-testid="ticket-container"]');
  if (!ticketEl) return;
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) return;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML).join('\n');
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ticket SecureFlow</title>${styles}<style>@page{size:80mm auto;margin:2mm;}html,body{margin:0;padding:0;width:80mm;background:white;}body{display:flex;justify-content:center;padding:4px;}.ticket-print{width:100%;max-width:76mm;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;}</style></head><body><div class="ticket-print">${ticketEl.innerHTML}</div><script>setTimeout(()=>{window.print();window.close();},500)<\/script></body></html>`);
  printWindow.document.close();
}

function TicketView({ passenger, onNewRegistration, insuranceName, insuranceLogo }: { passenger: Passenger; onNewRegistration: () => void; insuranceName?: string; insuranceLogo?: string }) {
  const passengerId = `SF-${String(passenger.id).padStart(4, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">Enregistrement confirme</span>
      </div>

      <div className="bg-white dark:bg-card rounded-lg overflow-hidden border border-border" data-testid="ticket-container">
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          {insuranceLogo ? (
            <img src={insuranceLogo} alt={insuranceName || "Assurance"} className="w-9 h-9 rounded-md bg-white p-0.5 object-contain" />
          ) : (
            <img src="/logo.jpeg" alt="SecureFlow" className="w-9 h-9 rounded-md bg-white p-0.5 object-contain" />
          )}
          <div>
            <h2 className="text-primary-foreground font-bold text-sm tracking-tight">{insuranceName || "SecureFlow"}</h2>
            <p className="text-primary-foreground/70 text-[10px]">Police d'Assurance Transport</p>
          </div>
          <div className="ml-auto">
            <span className="text-primary-foreground font-mono text-xs font-bold" data-testid="text-passenger-id">{passengerId}</span>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-border">
            <QRCodeSVG value={`${window.location.origin}/verify/${passenger.id}`} size={110} level="H" includeMargin={false} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold" data-testid="text-passenger-name">{passenger.fullName}</p>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
              <Phone className="w-3 h-3" />
              <span>{passenger.phone}</span>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-dashed border-border" />

        <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {passenger.departure && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Depart</p>
                <p className="font-semibold text-xs">{passenger.departure}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Destination</p>
              <p className="font-semibold text-xs">{passenger.destination}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compagnie</p>
              <p className="font-semibold text-xs">{passenger.company}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
              <p className="font-semibold text-xs">{passenger.travelDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Heure</p>
              <p className="font-semibold text-xs">{passenger.travelTime}</p>
            </div>
          </div>
          {passenger.busNumber && (
            <div className="flex items-start gap-1.5 col-span-2">
              <Bus className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bus</p>
                <p className="font-semibold text-xs">{passenger.busNumber}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-dashed border-border" />

        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Prix de l'assurance</span>
            <span className="text-sm font-bold text-primary" data-testid="text-ticket-price">{passenger.price} FCFA</span>
          </div>
          {passenger.emergencyContactName && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact d'urgence</span>
              <span className="text-xs font-medium" data-testid="text-ticket-emergency">{passenger.emergencyContactName} {passenger.emergencyContactPhone ? `- ${passenger.emergencyContactPhone}` : ""}</span>
            </div>
          )}
          {passenger.documentType && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{passenger.documentType}</span>
              <span className="text-xs font-mono font-semibold" data-testid="text-ticket-document">{passenger.documentNumber || "-"}</span>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-dashed border-border" />

        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-medium text-green-700 dark:text-green-400">Assurance Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Scannez le QR code pour verifier</p>
        </div>

        <div className="bg-muted/30 px-4 py-1.5 text-center border-t border-border">
          <p className="text-[9px] text-muted-foreground">Powered by <span className="font-semibold">SecureFlow</span> &mdash; Assurance Transport</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={printTicket} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "SecureFlow - Police d'assurance",
                text: `Assurance: ${passenger.fullName} - SF-${String(passenger.id).padStart(4, "0")}`,
                url: `${window.location.origin}/verify/${passenger.id}`,
              });
            }
          }}
          data-testid="button-share"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </Button>
      </div>
      <Button onClick={onNewRegistration} className="w-full" data-testid="button-new-registration">
        <UserPlus className="w-4 h-4 mr-2" />
        Nouvel enregistrement
      </Button>
    </div>
  );
}

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [registeredPassenger, setRegisteredPassenger] = useState<Passenger | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: agentStats } = useQuery<{ todayCount: number; weekCount: number; monthCount: number; totalCount: number }>({
    queryKey: ["/api/agent/stats"],
  });

  const { data: transportCompanies } = useQuery<TransportCompany[]>({
    queryKey: ["/api/transport-companies"],
  });

  const { data: recentList } = useQuery<Passenger[]>({
    queryKey: ["/api/agent/passengers"],
    enabled: showHistory,
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      documentType: "",
      documentNumber: "",
      departure: "",
      destination: "",
      company: "",
      busNumber: "",
      travelDate: today,
      travelTime: "",
      price: 500,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/passengers", data);
      return res.json() as Promise<Passenger>;
    },
    onSuccess: (passenger) => {
      setRegisteredPassenger(passenger);
      queryClient.invalidateQueries({ queryKey: ["/api/agent/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/passengers"] });
      toast({
        title: "Passager enregistre",
        description: `${passenger.fullName} enregistre avec succes.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    mutation.mutate(data);
  };

  const handleNewRegistration = () => {
    setRegisteredPassenger(null);
    form.reset({
      fullName: "",
      phone: "",
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      documentType: "",
      documentNumber: "",
      departure: "",
      destination: "",
      company: "",
      busNumber: "",
      travelDate: today,
      travelTime: "",
      price: 500,
    });
  };

  const companyList = transportCompanies?.map(tc => tc.name) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {user?.insuranceLogo ? (
            <img src={user.insuranceLogo} alt="Logo" className="w-8 h-8 rounded-md bg-white p-0.5 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <div>
            <p className="text-primary-foreground text-sm font-bold leading-none">
              Bonjour, {user?.fullName}
            </p>
            <p className="text-primary-foreground/70 text-[10px]">
              {user?.insuranceName || "SecureFlow"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setShowSettings(true)} className="text-primary-foreground" data-testid="button-agent-settings">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={logout} className="text-primary-foreground" data-testid="button-logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {showSettings ? (
        <SettingsPage onBack={() => setShowSettings(false)} />
      ) : (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none" data-testid="text-agent-today">{agentStats?.todayCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none" data-testid="text-agent-month">{agentStats?.monthCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ce mois</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {registeredPassenger ? (
          <TicketView passenger={registeredPassenger} onNewRegistration={handleNewRegistration} insuranceName={user?.insuranceName} insuranceLogo={user?.insuranceLogo} />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Enregistrer un passager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl><Input placeholder="Ex: Jean Dupont" {...field} data-testid="input-full-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone</FormLabel>
                      <FormControl><Input placeholder="Ex: +229 97 12 34 56" {...field} data-testid="input-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (pour recevoir le ticket)</FormLabel>
                      <FormControl><Input type="email" placeholder="Ex: jean@email.com" {...field} value={field.value ?? ""} data-testid="input-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact d'urgence</FormLabel>
                        <FormControl><Input placeholder="Nom du proche" {...field} value={field.value ?? ""} data-testid="input-emergency-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tel. urgence</FormLabel>
                        <FormControl><Input placeholder="+229 ..." {...field} value={field.value ?? ""} data-testid="input-emergency-phone" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="documentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de document</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger data-testid="select-document-type"><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                          <SelectContent>{documentTypes.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="documentNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N. du document</FormLabel>
                        <FormControl><Input placeholder="Ex: AB123456" {...field} value={field.value ?? ""} data-testid="input-document-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="departure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville de depart</FormLabel>
                        <FormControl><Input placeholder="Ex: Cotonou" {...field} value={field.value ?? ""} data-testid="input-departure" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville de destination</FormLabel>
                        <FormControl><Input placeholder="Ex: Parakou" {...field} data-testid="input-destination" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <FormField control={form.control} name="company" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compagnie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-company"><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {companyList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="busNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N. bus (optionnel)</FormLabel>
                        <FormControl><Input placeholder="Ex: BUS-042" {...field} value={field.value ?? ""} data-testid="input-bus-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix (FCFA)</FormLabel>
                        <FormControl><Input type="number" placeholder="500" {...field} data-testid="input-price" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="travelDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-travel-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="travelTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure</FormLabel>
                        <FormControl><Input type="time" {...field} data-testid="input-travel-time" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-register">
                    {mutation.isPending ? "Enregistrement..." : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Enregistrer et generer QR Code
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) {
              queryClient.invalidateQueries({ queryKey: ["/api/agent/passengers"] });
            }
          }}
          data-testid="button-toggle-history"
        >
          {showHistory ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          {showHistory ? "Masquer l'historique" : "Voir mon historique"}
        </Button>

        {showHistory && recentList && (
          <div className="space-y-2">
            {recentList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun enregistrement pour le moment</p>
            ) : (
              recentList.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold shrink-0">
                        {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-history-name-${p.id}`}>{p.fullName}</p>
                        <p className="text-[10px] text-muted-foreground">{p.departure ? `${p.departure} → ` : ""}{p.destination} &middot; {p.travelDate}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {p.status === "en_attente" ? "En attente" : p.status === "contrat_cree" ? "Contrat" : "Valide"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <div className="text-center pb-4">
          <p className="text-[10px] text-muted-foreground">
            SecureFlow &middot; Tel/WhatsApp: +229 01 50 36 36 36
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
