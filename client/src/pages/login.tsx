import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, Eye, EyeOff, KeyRound } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"identifier" | "code">("identifier");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const resetMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const response = await apiRequest("POST", resetStep === "identifier" ? "/api/auth/forgot-password" : "/api/auth/reset-password", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: resetStep === "identifier" ? "Demande envoyee" : "Mot de passe modifie", description: data.message });
      if (resetStep === "identifier") setResetStep("code");
      else {
        setResetOpen(false);
        setResetStep("identifier");
        setResetCode("");
        setResetPassword("");
      }
    },
    onError: (error: Error) => toast({ title: "Erreur", description: error.message, variant: "destructive" }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const user = await login(username, password);
      setLocation("/");
      toast({
        title: `Bienvenue, ${user.fullName || user.username} !`,
        description: "Connexion reussie. Bon travail !",
      });
    } catch {
      toast({
        title: "Erreur de connexion",
        description: "Nom d'utilisateur ou mot de passe incorrect.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpeg" alt="SecureFlow" className="w-16 h-16 rounded-lg object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">SecureFlow</h1>
            <p className="text-sm text-muted-foreground">Assurance Transport - Connexion</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                {loading ? "Connexion..." : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-primary hover:underline"
              onClick={() => { setResetIdentifier(username); setResetOpen(true); }}
              data-testid="button-forgot-password"
            >
              Mot de passe oublié ?
            </button>
          </CardContent>
        </Card>
        <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) setResetStep("identifier"); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Réinitialiser le mot de passe</DialogTitle>
              <DialogDescription>
                {resetStep === "identifier" ? "Saisissez votre nom d'utilisateur ou votre adresse e-mail." : "Saisissez le code reçu par e-mail et choisissez un nouveau mot de passe."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-identifier">Identifiant ou e-mail</Label>
                <Input id="reset-identifier" value={resetIdentifier} disabled={resetStep === "code"} onChange={(e) => setResetIdentifier(e.target.value)} data-testid="input-reset-identifier" />
              </div>
              {resetStep === "code" && <>
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Code reçu</Label>
                  <Input id="reset-code" inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))} data-testid="input-reset-code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">Nouveau mot de passe</Label>
                  <Input id="reset-new-password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} data-testid="input-reset-new-password" />
                </div>
              </>}
              <Button
                className="w-full"
                disabled={resetMutation.isPending || !resetIdentifier || (resetStep === "code" && (!resetCode || !resetPassword))}
                onClick={() => resetMutation.mutate(resetStep === "identifier" ? { identifier: resetIdentifier } : { identifier: resetIdentifier, code: resetCode, newPassword: resetPassword })}
                data-testid="button-submit-reset"
              >
                {resetMutation.isPending ? "Traitement..." : resetStep === "identifier" ? "Envoyer le code" : "Modifier le mot de passe"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
