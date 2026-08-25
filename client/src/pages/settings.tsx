import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, KeyRound, Mail, UserCircle, ArrowLeft, Shield, AlertTriangle, Download, RotateCcw, ShieldAlert, Lock, CheckCircle2, Eye, EyeOff, Upload, ImageIcon } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const profileSchema = z.object({
  fullName: z.string().min(2, "Le nom complet doit avoir au moins 2 caracteres"),
  username: z.string().min(3, "Le nom d'utilisateur doit avoir au moins 3 caracteres"),
  email: z.string().email("Adresse email invalide").or(z.literal("")).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmation requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings(props: { onBack?: () => void } & Record<string, any>) {
  const { onBack } = props;
  const { user } = useAuth();
  const { toast } = useToast();
  const [verificationStep, setVerificationStep] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "Profil mis a jour", description: "Vos informations ont ete modifiees avec succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/profile/change-password", data);
      return res.json();
    },
    onSuccess: (data: { requiresVerification: boolean; message: string }) => {
      if (data.requiresVerification) {
        setVerificationStep(true);
        toast({ title: "Code envoye", description: data.message });
      } else {
        toast({ title: "Mot de passe modifie", description: data.message });
        passwordForm.reset();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: { code: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/profile/verify-password-change", data);
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({ title: "Mot de passe modifie", description: data.message });
      setVerificationStep(false);
      setPendingNewPassword("");
      setOtpValue("");
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    setPendingNewPassword(data.newPassword);
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const onVerifyCode = () => {
    if (otpValue.length !== 6) return;
    verifyMutation.mutate({ code: otpValue, newPassword: pendingNewPassword });
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/insurance/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur upload" }));
        throw new Error(err.message);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Logo mis a jour", description: "Le logo de votre assurance a ete modifie." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de modifier le logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Administrateur",
    insurance_admin: "Administrateur Assurance",
    agent: "Agent Terrain",
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-settings-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold" data-testid="text-settings-title">Parametres du compte</h1>
          <p className="text-sm text-muted-foreground">Gerez vos informations personnelles et votre securite</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {roleLabels[user?.role || ""] || user?.role} {user?.insuranceName ? `- ${user.insuranceName}` : ""}
            </span>
          </div>
        </CardHeader>
      </Card>

      {user?.role === "insurance_admin" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Logo de l'assurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {user.insuranceLogo ? (
                <img
                  src={user.insuranceLogo}
                  alt={user.insuranceName || "Logo"}
                  className="w-16 h-16 rounded-lg object-contain bg-white border border-border"
                  data-testid="img-settings-logo"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-muted-foreground" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="settings-logo-input"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = "";
                  }}
                  data-testid="input-settings-logo"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => document.getElementById("settings-logo-input")?.click()}
                  data-testid="button-change-logo"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {logoUploading ? "Envoi..." : "Modifier mon logo"}
                </Button>
                <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG (max 2Mo)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-settings-fullname" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={profileForm.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-settings-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={profileForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} data-testid="input-settings-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" disabled={profileMutation.isPending} data-testid="button-save-profile">
                <User className="w-4 h-4 mr-2" />
                {profileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Changer le mot de passe
          </CardTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <Mail className="w-3 h-3" />
            Un code de verification sera envoye a votre email pour confirmer le changement
          </p>
        </CardHeader>
        <CardContent>
          {verificationStep ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Entrez le code de verification</p>
                <p className="text-xs text-muted-foreground">
                  Un code a 6 chiffres a ete envoye a <strong>{user?.email}</strong>
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue} data-testid="input-otp-code">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setVerificationStep(false); setOtpValue(""); }}
                  data-testid="button-cancel-verify"
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={onVerifyCode}
                  disabled={otpValue.length !== 6 || verifyMutation.isPending}
                  data-testid="button-confirm-verify"
                >
                  {verifyMutation.isPending ? "Verification..." : "Confirmer"}
                </Button>
              </div>
            </div>
          ) : (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showCurrentPassword ? "text" : "password"} {...field} className="pr-10" data-testid="input-current-password" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowCurrentPassword(!showCurrentPassword)} data-testid="button-toggle-current-password" tabIndex={-1}>
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showNewPassword ? "text" : "password"} {...field} className="pr-10" data-testid="input-new-password" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowNewPassword(!showNewPassword)} data-testid="button-toggle-new-password" tabIndex={-1}>
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} {...field} className="pr-10" data-testid="input-confirm-password" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowConfirmPassword(!showConfirmPassword)} data-testid="button-toggle-confirm-password" tabIndex={-1}>
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" disabled={passwordMutation.isPending} data-testid="button-change-password">
                  <KeyRound className="w-4 h-4 mr-2" />
                  {passwordMutation.isPending ? "Verification..." : "Changer le mot de passe"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {user?.role === "super_admin" && <ResetSection />}
    </div>
  );
}

function ResetSection() {
  const { toast } = useToast();
  const [step, setStep] = useState<"closed" | "warning" | "confirm">("closed");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset-data", data);
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({ title: "Reinitialisation terminee", description: data.message });
      setStep("closed");
      setResetUsername("");
      setResetPassword("");
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
    if (!resetUsername.trim() || !resetPassword.trim()) {
      toast({ title: "Erreur", description: "Veuillez remplir l'identifiant et le mot de passe.", variant: "destructive" });
      return;
    }
    resetMutation.mutate({ username: resetUsername, password: resetPassword });
  };

  if (step === "closed") {
    return (
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reinitialiser completement le systeme. Cette action supprimera toutes les donnees.
          </p>
          <Button
            variant="destructive"
            onClick={() => setStep("warning")}
            data-testid="button-open-reset"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reinitialiser le systeme
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
            Seuls les comptes <strong>Super Admin</strong> (Clarence et Eric) seront conserves avec leurs mots de passe reinitialises.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" />
            Sauvegarder les donnees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Telechargez une copie de toutes les donnees avant la reinitialisation.
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
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => setStep("closed")} data-testid="button-cancel-reset">
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => setStep("confirm")} data-testid="button-proceed-reset">
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
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
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
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  data-testid="input-reset-password"
                />
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("closed"); setResetUsername(""); setResetPassword(""); }}
                data-testid="button-cancel-reset-confirm"
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReset}
                disabled={resetMutation.isPending || !resetUsername.trim() || !resetPassword.trim()}
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
    </>
  );
}
