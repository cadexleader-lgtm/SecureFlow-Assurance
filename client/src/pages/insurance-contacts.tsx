import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, Mail, Pencil } from "lucide-react";
import { insuranceCompanies } from "@shared/schema";
import type { InsuranceContact } from "@shared/schema";

export default function InsuranceContacts() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<InsuranceContact | null>(null);
  const [formCompany, setFormCompany] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: contacts, isLoading } = useQuery<InsuranceContact[]>({
    queryKey: ["/api/admin/insurance-contacts"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { companyName: string; email: string; active: boolean }) =>
      apiRequest("POST", "/api/admin/insurance-contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance-contacts"] });
      toast({ title: "Contact ajoute", description: "L'email de la compagnie d'assurance a ete enregistre." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message || "Impossible d'ajouter le contact", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ companyName: string; email: string; active: boolean }> }) =>
      apiRequest("PATCH", `/api/admin/insurance-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance-contacts"] });
      toast({ title: "Contact mis a jour" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le contact", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/insurance-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance-contacts"] });
      toast({ title: "Contact supprime" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le contact", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingContact(null);
    setFormCompany("");
    setCustomCompany("");
    setFormEmail("");
    setFormActive(true);
  };

  const openAdd = () => {
    setEditingContact(null);
    setFormCompany("");
    setCustomCompany("");
    setFormEmail("");
    setFormActive(true);
    setShowDialog(true);
  };

  const openEdit = (contact: InsuranceContact) => {
    setEditingContact(contact);
    setFormCompany(contact.companyName);
    setFormEmail(contact.email);
    setFormActive(contact.active);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const companyName = formCompany === "Autre" ? customCompany.trim() : formCompany;
    if (!companyName || !formEmail) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: { companyName, email: formEmail, active: formActive } });
    } else {
      createMutation.mutate({ companyName, email: formEmail, active: formActive });
    }
  };

  const handleToggleActive = (contact: InsuranceContact) => {
    updateMutation.mutate({ id: contact.id, data: { active: !contact.active } });
  };

  const configuredCompanies = contacts?.map((c) => c.companyName) ?? [];
  const availableCompanies = insuranceCompanies.filter((c) => c !== "Autre" && !configuredCompanies.includes(c));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-insurance-title">Assurances</h1>
          <p className="text-sm text-muted-foreground">Configurez les emails des compagnies d'assurance pour les notifications automatiques</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-insurance">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Contacts des compagnies d'assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !contacts || contacts.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune compagnie d'assurance configuree</p>
              <p className="text-sm text-muted-foreground mt-1">Ajoutez les emails des assureurs pour qu'ils recoivent les notifications a chaque enregistrement</p>
              <Button onClick={openAdd} className="mt-4" variant="outline" data-testid="button-add-insurance-empty">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une compagnie
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compagnie d'assurance</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id} data-testid={`row-insurance-${contact.id}`}>
                      <TableCell className="font-medium">{contact.companyName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          {contact.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={contact.active}
                            onCheckedChange={() => handleToggleActive(contact)}
                            data-testid={`switch-active-${contact.id}`}
                          />
                          <Badge variant={contact.active ? "default" : "secondary"} className="text-[10px]">
                            {contact.active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(contact)} data-testid={`button-edit-${contact.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Supprimer ${contact.companyName} ?`)) {
                                deleteMutation.mutate(contact.id);
                              }
                            }}
                            data-testid={`button-delete-${contact.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comment ca fonctionne</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Quand un agent enregistre un passager et choisit une compagnie d'assurance :</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Le systeme verifie si cette compagnie a un email configure ici</li>
            <li>Si oui et que le statut est <Badge variant="default" className="text-[10px] mx-1">Actif</Badge>, un email est envoye automatiquement a l'assureur</li>
            <li>L'email contient toutes les informations du passager assure (nom, telephone, document, destination, etc.)</li>
          </ol>
          <p className="mt-3">Vous pouvez desactiver temporairement les notifications pour un assureur en basculant le statut sur <Badge variant="secondary" className="text-[10px] mx-1">Inactif</Badge>.</p>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Modifier le contact" : "Ajouter une compagnie d'assurance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Compagnie d'assurance</Label>
              {editingContact ? (
                <Input value={formCompany} disabled data-testid="input-company-name" />
              ) : (
                <Select value={formCompany} onValueChange={setFormCompany}>
                  <SelectTrigger data-testid="select-company-name">
                    <SelectValue placeholder="Choisir une compagnie" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {formCompany === "Autre" && !editingContact && (
                <Input
                  placeholder="Nom de la compagnie"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  data-testid="input-custom-company"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Adresse email</Label>
              <Input
                type="email"
                placeholder="assurance@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                data-testid="input-insurance-email"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} data-testid="switch-form-active" />
              <Label>Notifications actives</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-insurance"
            >
              {createMutation.isPending || updateMutation.isPending ? "En cours..." : editingContact ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
