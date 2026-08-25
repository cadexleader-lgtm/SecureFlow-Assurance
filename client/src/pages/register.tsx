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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPassengerSchema } from "@shared/schema";
import type { Passenger, TransportCompany } from "@shared/schema";
import { UserPlus, QrCode, Printer, Share2, CheckCircle2, MapPin, Bus, Clock, Phone, User, Calendar, Building2, Navigation, ImageIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/use-auth";

const registerSchema = insertPassengerSchema.extend({
  fullName: z.string().min(2, "Le nom complet est requis (min 2 caracteres)"),
  phone: z.string().min(8, "Numero de telephone valide requis (min 8 chiffres)"),
  departure: z.string().min(1, "Saisissez la ville de depart"),
  destination: z.string().min(1, "Saisissez la ville de destination"),
  company: z.string().min(1, "Selectionnez une compagnie"),
  travelDate: z.string().min(1, "Date de voyage requise"),
  travelTime: z.string().min(1, "Heure de depart requise"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

function TicketView({ passenger, onNewRegistration }: { passenger: Passenger; onNewRegistration: () => void }) {
  const { user } = useAuth();
  const passengerId = `SF-${String(passenger.id).padStart(4, "0")}`;

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">Enregistrement confirme</span>
      </div>

      <div className="bg-white dark:bg-card rounded-lg overflow-hidden border border-border" data-testid="ticket-container">
        <div className="bg-primary px-5 py-4 flex items-center gap-3">
          <img src="/logo.jpeg" alt="SecureFlow" className="w-10 h-10 rounded-md bg-white p-0.5 object-contain" />
          <div>
            <h2 className="text-primary-foreground font-bold text-base tracking-tight">SecureFlow</h2>
            <p className="text-primary-foreground/70 text-[11px]">Police d'Assurance Transport</p>
          </div>
          <div className="ml-auto text-right">
            <span className="text-primary-foreground font-mono text-xs font-bold" data-testid="text-passenger-id">{passengerId}</span>
          </div>
        </div>

        {user?.insuranceLogo && (
          <div className="px-5 py-2.5 bg-muted/30 flex items-center gap-3 border-b border-border">
            <img
              src={user.insuranceLogo}
              alt={user.insuranceName || "Assurance"}
              className="w-8 h-8 rounded-md object-contain bg-white border border-border"
              data-testid="img-ticket-insurance-logo"
            />
            <span className="text-sm font-semibold text-foreground">{user.insuranceName}</span>
          </div>
        )}

        <div className="px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-2 bg-white rounded-lg border border-border shrink-0">
            <QRCodeSVG
              value={passenger.qrCode}
              size={120}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="flex-1 w-full space-y-0.5 text-center sm:text-left">
            <p className="text-lg font-bold" data-testid="text-passenger-name">{passenger.fullName}</p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground text-xs">
              <Phone className="w-3 h-3" />
              <span data-testid="text-passenger-phone">{passenger.phone}</span>
            </div>
          </div>
        </div>

        <div className="mx-5 border-t border-dashed border-border" />

        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {passenger.departure && (
            <div className="flex items-start gap-2">
              <Navigation className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Depart</p>
                <p className="font-semibold text-sm">{passenger.departure}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Destination</p>
              <p className="font-semibold text-sm">{passenger.destination}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compagnie</p>
              <p className="font-semibold text-sm">{passenger.company}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
              <p className="font-semibold text-sm">{passenger.travelDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Heure</p>
              <p className="font-semibold text-sm">{passenger.travelTime}</p>
            </div>
          </div>
          {passenger.busNumber && (
            <div className="flex items-start gap-2 col-span-2">
              <Bus className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bus</p>
                <p className="font-semibold text-sm">{passenger.busNumber}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mx-5 border-t border-dashed border-border" />

        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[11px] font-medium text-green-700 dark:text-green-400">Assurance Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Scannez le QR code pour verifier</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.print()}
          data-testid="button-print"
        >
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
                text: `Assurance SecureFlow: ${passenger.fullName} - ID: ${passengerId}`,
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

export default function Register() {
  const { toast } = useToast();
  const [registeredPassenger, setRegisteredPassenger] = useState<Passenger | null>(null);

  const { data: transportCompanies = [] } = useQuery<TransportCompany[]>({
    queryKey: ["/api/transport-companies"],
  });

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      departure: "",
      destination: "",
      company: "",
      busNumber: "",
      travelDate: today,
      travelTime: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/passengers", data);
      return res.json() as Promise<Passenger>;
    },
    onSuccess: (passenger) => {
      setRegisteredPassenger(passenger);
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/by-company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/by-destination"] });
      queryClient.invalidateQueries({ queryKey: ["/api/passengers/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/passengers"] });
      toast({
        title: "Passager enregistre",
        description: `${passenger.fullName} a ete enregistre avec succes.`,
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
      departure: "",
      destination: "",
      company: "",
      busNumber: "",
      travelDate: today,
      travelTime: "",
    });
  };

  if (registeredPassenger) {
    return <TicketView passenger={registeredPassenger} onNewRegistration={handleNewRegistration} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-register-title">Enregistrer un passager</h1>
        <p className="text-sm text-muted-foreground">Remplissez les informations pour generer la police d'assurance</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Jean Dupont" {...field} data-testid="input-full-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: +229 97 12 34 56" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville de depart</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cotonou" {...field} value={field.value ?? ""} data-testid="input-departure" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville de destination</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Parakou" {...field} data-testid="input-destination" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compagnie de transport</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-company">
                          <SelectValue placeholder="Choisir une compagnie..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transportCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="busNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero du bus (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BUS-042" {...field} value={field.value ?? ""} data-testid="input-bus-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="travelDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de voyage</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-travel-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de depart</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-travel-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-register">
                {mutation.isPending ? (
                  <>Enregistrement en cours...</>
                ) : (
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
    </div>
  );
}
