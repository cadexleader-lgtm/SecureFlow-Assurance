import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Power, Upload, ImageIcon } from "lucide-react";
import type { Insurance } from "@shared/schema";

function LogoPreview({ src, size = 32 }: { src: string | null; size?: number }) {
  if (!src) {
    return (
      <div
        className="rounded-md bg-muted flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Logo"
      className="rounded-md object-contain bg-white border border-border shrink-0"
      style={{ width: size, height: size }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function InsuranceManagement() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCommission, setFormCommission] = useState(50);
  const [formAdminUsername, setFormAdminUsername] = useState("");
  const [formAdminPassword, setFormAdminPassword] = useState("");
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null);
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCommission, setEditCommission] = useState(50);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  const addLogoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);

  const { data: insurances, isLoading } = useQuery<Insurance[]>({
    queryKey: ["/api/admin/insurances"],
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/insurances", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur lors de la creation" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurances"] });
      toast({ title: "Assurance ajoutee", description: "La compagnie d'assurance a ete creee avec succes." });
      closeAddDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Insurance> }) => {
      const res = await apiRequest("PATCH", `/api/admin/insurances/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurances"] });
      toast({ title: "Assurance mise a jour" });
      setEditingInsurance(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur upload");
      const { logoPath } = await res.json();
      const updateRes = await apiRequest("PATCH", `/api/admin/insurances/${id}`, { logo: logoPath });
      return updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurances"] });
      toast({ title: "Logo mis a jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre a jour le logo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/insurances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurances"] });
      toast({ title: "Assurance supprimee" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setFormName("");
    setFormEmail("");
    setFormCommission(50);
    setFormAdminUsername("");
    setFormAdminPassword("");
    setFormLogoFile(null);
    setFormLogoPreview(null);
  };

  const openEdit = (insurance: Insurance) => {
    setEditingInsurance(insurance);
    setEditName(insurance.name);
    setEditEmail(insurance.email);
    setEditCommission(insurance.commissionPerPassenger);
    setEditLogoFile(null);
    setEditLogoPreview(insurance.logo);
  };

  const handleLogoSelect = (file: File | null, mode: "add" | "edit") => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (mode === "add") {
      setFormLogoFile(file);
      setFormLogoPreview(url);
    } else {
      setEditLogoFile(file);
      setEditLogoPreview(url);
    }
  };

  const handleCreate = () => {
    if (!formName || !formEmail || !formAdminUsername || !formAdminPassword) return;
    const formData = new FormData();
    formData.append("name", formName);
    formData.append("email", formEmail);
    formData.append("commissionPerPassenger", String(formCommission));
    formData.append("adminUsername", formAdminUsername);
    formData.append("adminPassword", formAdminPassword);
    if (formLogoFile) {
      formData.append("logo", formLogoFile);
    }
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!editingInsurance || !editName || !editEmail) return;
    if (editLogoFile) {
      uploadLogoMutation.mutate({ id: editingInsurance.id, file: editLogoFile }, {
        onSuccess: () => {
          updateMutation.mutate({
            id: editingInsurance.id,
            data: { name: editName, email: editEmail, commissionPerPassenger: editCommission },
          });
        },
      });
    } else {
      updateMutation.mutate({
        id: editingInsurance.id,
        data: { name: editName, email: editEmail, commissionPerPassenger: editCommission },
      });
    }
  };

  const handleToggleStatus = (insurance: Insurance) => {
    const newStatus = insurance.status === "active" ? "inactive" : "active";
    updateMutation.mutate({ id: insurance.id, data: { status: newStatus } });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Gestion des Assurances
        </h1>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-insurance">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une assurance
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !insurances || insurances.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-medium">Aucune assurance enregistree</p>
              <p className="text-sm mt-1">Ajoutez une compagnie d'assurance pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Logo</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Commission/passager</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date creation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insurances.map((insurance) => (
                    <TableRow key={insurance.id} data-testid={`row-insurance-${insurance.id}`}>
                      <TableCell>
                        <LogoPreview src={insurance.logo} size={36} />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-name-${insurance.id}`}>
                        {insurance.name}
                      </TableCell>
                      <TableCell data-testid={`text-email-${insurance.id}`}>{insurance.email}</TableCell>
                      <TableCell data-testid={`text-commission-${insurance.id}`}>
                        {insurance.commissionPerPassenger} CFA
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={insurance.status === "active" ? "default" : "secondary"}
                          data-testid={`badge-status-${insurance.id}`}
                        >
                          {insurance.status === "active" ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-date-${insurance.id}`}>
                        {new Date(insurance.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(insurance)}
                            data-testid={`button-edit-${insurance.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(insurance)}
                            data-testid={`button-toggle-status-${insurance.id}`}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-delete-${insurance.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Etes-vous sur de vouloir supprimer l'assurance "{insurance.name}" ? Cette action est irreversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${insurance.id}`}>
                                  Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(insurance.id)}
                                  data-testid={`button-confirm-delete-${insurance.id}`}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une assurance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Logo de l'assurance</Label>
              <div className="flex items-center gap-3">
                {formLogoPreview ? (
                  <img src={formLogoPreview} alt="Apercu" className="w-14 h-14 rounded-md object-contain bg-white border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={addLogoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => handleLogoSelect(e.target.files?.[0] || null, "add")}
                    data-testid="input-add-logo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLogoInputRef.current?.click()}
                    data-testid="button-select-logo"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {formLogoFile ? "Changer" : "Choisir un logo"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG (max 2Mo)</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nom de l'assurance</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: AXA Assurance"
                data-testid="input-insurance-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@assurance.com"
                data-testid="input-insurance-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Commission par passager en CFA</Label>
              <Input
                type="number"
                value={formCommission}
                onChange={(e) => setFormCommission(Number(e.target.value))}
                data-testid="input-insurance-commission"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom d'utilisateur admin</Label>
              <Input
                value={formAdminUsername}
                onChange={(e) => setFormAdminUsername(e.target.value)}
                placeholder="admin_assurance"
                data-testid="input-admin-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe admin</Label>
              <Input
                type="password"
                value={formAdminPassword}
                onChange={(e) => setFormAdminPassword(e.target.value)}
                placeholder="Mot de passe"
                data-testid="input-admin-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog} data-testid="button-cancel-add">
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName || !formEmail || !formAdminUsername || !formAdminPassword}
              data-testid="button-confirm-add"
            >
              {createMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingInsurance} onOpenChange={(open) => !open && setEditingInsurance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'assurance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {editLogoPreview ? (
                  <img src={editLogoPreview} alt="Logo" className="w-14 h-14 rounded-md object-contain bg-white border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={editLogoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => handleLogoSelect(e.target.files?.[0] || null, "edit")}
                    data-testid="input-edit-logo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editLogoInputRef.current?.click()}
                    data-testid="button-change-logo"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {editLogoFile ? "Changer" : "Modifier le logo"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nom de l'assurance</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Commission par passager en CFA</Label>
              <Input
                type="number"
                value={editCommission}
                onChange={(e) => setEditCommission(Number(e.target.value))}
                data-testid="input-edit-commission"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInsurance(null)} data-testid="button-cancel-edit">
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || uploadLogoMutation.isPending || !editName || !editEmail}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending || uploadLogoMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
