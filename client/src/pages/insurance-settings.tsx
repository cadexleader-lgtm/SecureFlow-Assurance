import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Shield, Phone, FileText, Save, Upload, ImageIcon, AlertTriangle, Loader2 } from "lucide-react";
import type { Insurance } from "@shared/schema";

export default function InsuranceSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logoUploading, setLogoUploading] = useState(false);

  const { data: insurance, isLoading } = useQuery<Insurance>({
    queryKey: ["/api/insurance/legal-info"],
  });

  const [tab1, setTab1] = useState<Record<string, string>>({});
  const [tab2, setTab2] = useState<Record<string, string>>({});
  const [tab3, setTab3] = useState<Record<string, string>>({});
  const [tab4, setTab4] = useState<Record<string, string>>({});

  useEffect(() => {
    if (insurance) {
      setTab1({
        raisonSociale: insurance.raisonSociale || "",
        formeJuridique: insurance.formeJuridique || "",
        capitalSocial: insurance.capitalSocial || "",
        siegeSocial: insurance.siegeSocial || "",
        telephone: insurance.telephone || "",
        siteWeb: insurance.siteWeb || "",
        numeroAgrementCima: insurance.numeroAgrementCima || "",
        numeroIfu: insurance.numeroIfu || "",
      });
      setTab2({
        garantieDeces: insurance.garantieDeces || "",
        garantieInvalidite: insurance.garantieInvalidite || "",
        garantieFraisMedicaux: insurance.garantieFraisMedicaux || "",
        garantieRapatriement: insurance.garantieRapatriement || "",
        dureeValidite: insurance.dureeValidite || "",
        franchise: insurance.franchise || "",
      });
      setTab3({
        hotlineSinistres: insurance.hotlineSinistres || "",
        emailSinistres: insurance.emailSinistres || "",
        emailReclamations: insurance.emailReclamations || "",
        urlDeclarationSinistre: insurance.urlDeclarationSinistre || "",
        urlConditionsGenerales: insurance.urlConditionsGenerales || "",
      });
      setTab4({
        documentsRequis: insurance.documentsRequis || "",
        exclusionsPrincipales: insurance.exclusionsPrincipales || "",
        typePolice: insurance.typePolice || "",
        souscripteur: insurance.souscripteur || "",
      });
    }
  }, [insurance]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/insurance/legal-info", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/legal-info"] });
      toast({ title: "Enregistre", description: "Les informations ont ete mises a jour avec succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/insurance/logo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur upload" }));
        throw new Error(err.message);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/legal-info"] });
      toast({ title: "Logo mis a jour", description: "Le logo de votre assurance a ete modifie." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de modifier le logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const hasLegalInfo = insurance && (insurance.raisonSociale || insurance.numeroAgrementCima || insurance.garantieDeces);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-legal-settings-title">Informations de l'assurance</h1>
        <p className="text-sm text-muted-foreground">Gerez les informations legales qui apparaitront sur les tickets d'assurance</p>
      </div>

      {!hasLegalInfo && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" data-testid="banner-incomplete-legal">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Informations legales incompletes</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Veuillez remplir vos informations legales pour que vos tickets d'assurance soient conformes au Code CIMA.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Logo de l'assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {insurance?.logo ? (
              <img
                src={insurance.logo}
                alt={insurance.name || "Logo"}
                className="w-16 h-16 rounded-lg object-contain bg-white border border-border"
                data-testid="img-legal-logo"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <input
                type="file"
                id="legal-logo-input"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }}
                data-testid="input-legal-logo"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={logoUploading}
                onClick={() => document.getElementById("legal-logo-input")?.click()}
                data-testid="button-upload-logo"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {logoUploading ? "Envoi..." : "Modifier le logo"}
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG (max 2Mo)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="legal" className="w-full">
        <TabsList className="w-full grid grid-cols-4" data-testid="tabs-legal-info">
          <TabsTrigger value="legal" className="text-xs" data-testid="tab-legal">
            <Building2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Identite
          </TabsTrigger>
          <TabsTrigger value="guarantees" className="text-xs" data-testid="tab-guarantees">
            <Shield className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Garanties
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs" data-testid="tab-contacts">
            <Phone className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Sinistres
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs" data-testid="tab-documents">
            <FileText className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legal">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informations legales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="raisonSociale">Raison sociale</Label>
                  <Input
                    id="raisonSociale"
                    placeholder="Ex: SANLAM ASSURANCES BENIN SA"
                    value={tab1.raisonSociale || ""}
                    onChange={(e) => setTab1({ ...tab1, raisonSociale: e.target.value })}
                    data-testid="input-raison-sociale"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="formeJuridique">Forme juridique</Label>
                  <Input
                    id="formeJuridique"
                    placeholder="Ex: Societe Anonyme"
                    value={tab1.formeJuridique || ""}
                    onChange={(e) => setTab1({ ...tab1, formeJuridique: e.target.value })}
                    data-testid="input-forme-juridique"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capitalSocial">Capital social</Label>
                  <Input
                    id="capitalSocial"
                    placeholder="Ex: 1 000 000 000 CFA"
                    value={tab1.capitalSocial || ""}
                    onChange={(e) => setTab1({ ...tab1, capitalSocial: e.target.value })}
                    data-testid="input-capital-social"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    placeholder="Ex: +229 21 XX XX XX"
                    value={tab1.telephone || ""}
                    onChange={(e) => setTab1({ ...tab1, telephone: e.target.value })}
                    data-testid="input-telephone"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siegeSocial">Siege social (adresse complete)</Label>
                <Textarea
                  id="siegeSocial"
                  placeholder="Ex: Avenue Jean-Paul II, Cotonou, Benin"
                  value={tab1.siegeSocial || ""}
                  onChange={(e) => setTab1({ ...tab1, siegeSocial: e.target.value })}
                  rows={2}
                  data-testid="input-siege-social"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siteWeb">Site web</Label>
                <Input
                  id="siteWeb"
                  placeholder="Ex: www.sanlam.bj"
                  value={tab1.siteWeb || ""}
                  onChange={(e) => setTab1({ ...tab1, siteWeb: e.target.value })}
                  data-testid="input-site-web"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="numeroAgrementCima" className="flex items-center gap-1">
                    N° Agrement CIMA
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="numeroAgrementCima"
                    placeholder="Ex: XXX-XX-XXX"
                    value={tab1.numeroAgrementCima || ""}
                    onChange={(e) => setTab1({ ...tab1, numeroAgrementCima: e.target.value })}
                    data-testid="input-agrement-cima"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numeroIfu">N° IFU</Label>
                  <Input
                    id="numeroIfu"
                    placeholder="Ex: XXXXXXXXXX"
                    value={tab1.numeroIfu || ""}
                    onChange={(e) => setTab1({ ...tab1, numeroIfu: e.target.value })}
                    data-testid="input-ifu"
                  />
                </div>
              </div>
              <Button
                onClick={() => saveMutation.mutate(tab1)}
                disabled={saveMutation.isPending}
                data-testid="button-save-legal"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guarantees">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Garanties couvertes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="garantieDeces">Deces accidentel</Label>
                  <Input
                    id="garantieDeces"
                    placeholder="Ex: 5 000 000 CFA"
                    value={tab2.garantieDeces || ""}
                    onChange={(e) => setTab2({ ...tab2, garantieDeces: e.target.value })}
                    data-testid="input-garantie-deces"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="garantieInvalidite">Invalidite permanente</Label>
                  <Input
                    id="garantieInvalidite"
                    placeholder="Ex: 3 000 000 CFA"
                    value={tab2.garantieInvalidite || ""}
                    onChange={(e) => setTab2({ ...tab2, garantieInvalidite: e.target.value })}
                    data-testid="input-garantie-invalidite"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="garantieFraisMedicaux">Frais medicaux</Label>
                  <Input
                    id="garantieFraisMedicaux"
                    placeholder="Ex: 500 000 CFA"
                    value={tab2.garantieFraisMedicaux || ""}
                    onChange={(e) => setTab2({ ...tab2, garantieFraisMedicaux: e.target.value })}
                    data-testid="input-garantie-frais-medicaux"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="garantieRapatriement">Rapatriement</Label>
                  <Input
                    id="garantieRapatriement"
                    placeholder="Ex: 1 000 000 CFA"
                    value={tab2.garantieRapatriement || ""}
                    onChange={(e) => setTab2({ ...tab2, garantieRapatriement: e.target.value })}
                    data-testid="input-garantie-rapatriement"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dureeValidite">Duree de validite</Label>
                <Input
                  id="dureeValidite"
                  placeholder="Ex: 24 heures a partir du depart"
                  value={tab2.dureeValidite || ""}
                  onChange={(e) => setTab2({ ...tab2, dureeValidite: e.target.value })}
                  data-testid="input-duree-validite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="franchise">Franchise</Label>
                <Input
                  id="franchise"
                  placeholder="Ex: 0 CFA"
                  value={tab2.franchise || ""}
                  onChange={(e) => setTab2({ ...tab2, franchise: e.target.value })}
                  data-testid="input-franchise"
                />
              </div>
              <Button
                onClick={() => saveMutation.mutate(tab2)}
                disabled={saveMutation.isPending}
                data-testid="button-save-guarantees"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contacts en cas de sinistre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hotlineSinistres">Hotline 24/7</Label>
                <Input
                  id="hotlineSinistres"
                  placeholder="Ex: +229 96 XX XX XX"
                  value={tab3.hotlineSinistres || ""}
                  onChange={(e) => setTab3({ ...tab3, hotlineSinistres: e.target.value })}
                  data-testid="input-hotline-sinistres"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emailSinistres">Email sinistres</Label>
                  <Input
                    id="emailSinistres"
                    type="email"
                    placeholder="Ex: sinistres@sanlam.bj"
                    value={tab3.emailSinistres || ""}
                    onChange={(e) => setTab3({ ...tab3, emailSinistres: e.target.value })}
                    data-testid="input-email-sinistres"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailReclamations">Email reclamations</Label>
                  <Input
                    id="emailReclamations"
                    type="email"
                    placeholder="Ex: reclamations@sanlam.bj"
                    value={tab3.emailReclamations || ""}
                    onChange={(e) => setTab3({ ...tab3, emailReclamations: e.target.value })}
                    data-testid="input-email-reclamations"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="urlDeclarationSinistre">URL declaration en ligne</Label>
                <Input
                  id="urlDeclarationSinistre"
                  placeholder="Ex: www.sanlam.bj/sinistres"
                  value={tab3.urlDeclarationSinistre || ""}
                  onChange={(e) => setTab3({ ...tab3, urlDeclarationSinistre: e.target.value })}
                  data-testid="input-url-declaration"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="urlConditionsGenerales">URL conditions generales</Label>
                <Input
                  id="urlConditionsGenerales"
                  placeholder="Ex: www.sanlam.bj/conditions-transport"
                  value={tab3.urlConditionsGenerales || ""}
                  onChange={(e) => setTab3({ ...tab3, urlConditionsGenerales: e.target.value })}
                  data-testid="input-url-conditions"
                />
              </div>
              <Button
                onClick={() => saveMutation.mutate(tab3)}
                disabled={saveMutation.isPending}
                data-testid="button-save-contacts"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents requis & Exclusions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="typePolice">Type de police</Label>
                  <Input
                    id="typePolice"
                    placeholder="Ex: Police collective voyage"
                    value={tab4.typePolice || ""}
                    onChange={(e) => setTab4({ ...tab4, typePolice: e.target.value })}
                    data-testid="input-type-police"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="souscripteur">Souscripteur</Label>
                  <Input
                    id="souscripteur"
                    placeholder="Ex: SecureFlow SARL"
                    value={tab4.souscripteur || ""}
                    onChange={(e) => setTab4({ ...tab4, souscripteur: e.target.value })}
                    data-testid="input-souscripteur"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="documentsRequis">Documents requis en cas de sinistre</Label>
                <Textarea
                  id="documentsRequis"
                  placeholder={"Ex:\n• Ce ticket d'assurance\n• Piece d'identite\n• Certificat medical (si blessure)\n• Proces-verbal de police (si deces)"}
                  value={tab4.documentsRequis || ""}
                  onChange={(e) => setTab4({ ...tab4, documentsRequis: e.target.value })}
                  rows={5}
                  data-testid="input-documents-requis"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exclusionsPrincipales">Exclusions principales</Label>
                <Textarea
                  id="exclusionsPrincipales"
                  placeholder={"Ex:\n• Etat d'ivresse ou usage de stupefiants\n• Suicide dans les 2 premieres annees\n• Guerres, emeutes, actes de terrorisme\n• Sports extremes"}
                  value={tab4.exclusionsPrincipales || ""}
                  onChange={(e) => setTab4({ ...tab4, exclusionsPrincipales: e.target.value })}
                  rows={5}
                  data-testid="input-exclusions"
                />
              </div>
              <Button
                onClick={() => saveMutation.mutate(tab4)}
                disabled={saveMutation.isPending}
                data-testid="button-save-documents"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
