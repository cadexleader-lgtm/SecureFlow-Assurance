import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Download, RotateCcw, ShieldAlert, Lock, User, CheckCircle2 } from "lucide-react";

export default function ResetSystem() {
  const { toast } = useToast();
  const [step, setStep] = useState<"warning" | "confirm">("warning");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset-data", data);
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({ title: "Reinitialisation terminee", description: data.message });
      setStep("warning");
      setUsername("");
      setPassword("");
      setHasDownloaded(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch("/api/admin/export-all", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur de telechargement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SecureFlow_Export_Complet_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setHasDownloaded(true);
      toast({ title: "Export termine", description: "Le fichier Excel contenant toutes les donnees a ete telecharge." });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de telecharger les donnees.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    if (!username.trim() || !password.trim()) {
      toast({ title: "Erreur", description: "Veuillez remplir l'identifiant et le mot de passe.", variant: "destructive" });
      return;
    }
    resetMutation.mutate({ username, password });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reset-title">Reinitialisation du systeme</h1>
        <p className="text-sm text-muted-foreground">Remettez le systeme a zero en supprimant toutes les donnees</p>
      </div>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Attention - Action irreversible
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            La reinitialisation complete du systeme va supprimer definitivement :
          </p>
          <ul className="text-sm space-y-1.5 ml-4">
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>Toutes les <strong>compagnies d'assurance</strong> et leurs configurations</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>Tous les <strong>agents</strong> et administrateurs d'assurance</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>Tous les <strong>passagers</strong> enregistres et leurs polices</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>Toutes les <strong>compagnies de transport</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>Tous les <strong>logs</strong>, factures et codes de verification</span>
            </li>
          </ul>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Seuls les comptes <strong>Super Admin</strong> (Clarence et Eric) seront conserves avec leurs mots de passe reinitialises. Les assurances et compagnies de transport de base seront restaurees.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" />
            Sauvegarder les donnees avant la reinitialisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nous vous recommandons fortement de telecharger une copie de toutes les donnees avant de proceder a la reinitialisation.
          </p>
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className="w-full"
            data-testid="button-download-all-data"
          >
            {isDownloading ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                Preparation de l'export...
              </>
            ) : hasDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Donnees telechargees - Telecharger a nouveau
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Telecharger toutes les donnees (Excel)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {step === "warning" && (
        <div className="flex justify-center">
          <Button
            variant="destructive"
            onClick={() => setStep("confirm")}
            data-testid="button-proceed-reset"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Proceder a la reinitialisation
          </Button>
        </div>
      )}

      {step === "confirm" && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Confirmation d'identite administrateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous etes sur le point de <strong className="text-destructive">reinitialiser completement le systeme</strong>. 
              Pour confirmer, veuillez entrer vos identifiants Super Admin.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-username" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Identifiant administrateur
                </Label>
                <Input
                  id="reset-username"
                  placeholder="Votre nom d'utilisateur admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-reset-username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-password" className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Mot de passe administrateur
                </Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Votre mot de passe admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-reset-password"
                />
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("warning"); setUsername(""); setPassword(""); }}
                data-testid="button-cancel-reset"
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReset}
                disabled={resetMutation.isPending || !username.trim() || !password.trim()}
                data-testid="button-confirm-reset"
              >
                {resetMutation.isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Reinitialisation...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Confirmer la reinitialisation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
