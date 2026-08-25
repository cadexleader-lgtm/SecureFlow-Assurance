import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import type { TransportCompany } from "@shared/schema";

export default function TransportCompanies() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<TransportCompany | null>(null);

  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");

  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: companies, isLoading } = useQuery<TransportCompany[]>({
    queryKey: ["/api/admin/transport-companies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; contact?: string; phone?: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/admin/transport-companies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport-companies"] });
      toast({ title: "Compagnie ajoutée", description: "La compagnie de transport a été créée avec succès." });
      closeAddDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TransportCompany> }) => {
      const res = await apiRequest("PATCH", `/api/admin/transport-companies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport-companies"] });
      toast({ title: "Compagnie mise à jour" });
      setEditingCompany(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/transport-companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport-companies"] });
      toast({ title: "Compagnie supprimée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setFormName("");
    setFormContact("");
    setFormPhone("");
    setFormEmail("");
  };

  const openEdit = (company: TransportCompany) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditContact(company.contact ?? "");
    setEditPhone(company.phone ?? "");
    setEditEmail(company.email ?? "");
  };

  const handleCreate = () => {
    if (!formName) return;
    createMutation.mutate({
      name: formName,
      contact: formContact || undefined,
      phone: formPhone || undefined,
      email: formEmail || undefined,
    });
  };

  const handleEdit = () => {
    if (!editingCompany || !editName) return;
    updateMutation.mutate({
      id: editingCompany.id,
      data: {
        name: editName,
        contact: editContact || null,
        phone: editPhone || null,
        email: editEmail || null,
      },
    });
  };

  const handleToggleStatus = (company: TransportCompany) => {
    const newStatus = company.status === "active" ? "inactive" : "active";
    updateMutation.mutate({ id: company.id, data: { status: newStatus } });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Gestion des Compagnies de Transport
        </h1>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-company">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une compagnie
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
          ) : !companies || companies.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-medium">Aucune compagnie enregistrée</p>
              <p className="text-sm mt-1">Ajoutez une compagnie de transport pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${company.id}`}>
                        {company.name}
                      </TableCell>
                      <TableCell data-testid={`text-contact-${company.id}`}>
                        {company.contact || "—"}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${company.id}`}>
                        {company.phone || "—"}
                      </TableCell>
                      <TableCell data-testid={`text-email-${company.id}`}>
                        {company.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={company.status === "active" ? "default" : "secondary"}
                          data-testid={`badge-status-${company.id}`}
                        >
                          {company.status === "active" ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(company)}
                            data-testid={`button-edit-${company.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(company)}
                            data-testid={`button-toggle-status-${company.id}`}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-delete-${company.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer la compagnie "{company.name}" ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${company.id}`}>
                                  Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(company.id)}
                                  data-testid={`button-confirm-delete-${company.id}`}
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
            <DialogTitle>Ajouter une compagnie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Transport Express"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
                placeholder="Nom du contact"
                data-testid="input-company-contact"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+229 XX XX XX XX"
                data-testid="input-company-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@transport.com"
                data-testid="input-company-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog} data-testid="button-cancel-add">
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName}
              data-testid="button-confirm-add"
            >
              {createMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la compagnie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                data-testid="input-edit-contact"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                data-testid="input-edit-phone"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCompany(null)} data-testid="button-cancel-edit">
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !editName}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
