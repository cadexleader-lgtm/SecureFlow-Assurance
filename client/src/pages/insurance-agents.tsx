import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Trash2, Users } from "lucide-react";

const addAgentSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est requis"),
  username: z.string().min(1, "Le nom d'utilisateur est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caracteres"),
});

type AddAgentForm = z.infer<typeof addAgentSchema>;

interface InsuranceAgent {
  id: number;
  fullName: string;
  email: string | null;
  username: string;
  createdAt: string;
  passengerCount: number;
}

export default function InsuranceAgents() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<InsuranceAgent | null>(null);

  const form = useForm<AddAgentForm>({
    resolver: zodResolver(addAgentSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const { data: agents, isLoading } = useQuery<InsuranceAgent[]>({
    queryKey: ["/api/insurance/agents"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddAgentForm) => {
      const res = await apiRequest("POST", "/api/insurance/agents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/agents"] });
      setShowAddDialog(false);
      form.reset();
      toast({ title: "Agent ajoute", description: "Le nouvel agent a ete cree avec succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/insurance/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/agents"] });
      setDeleteAgent(null);
      toast({ title: "Agent supprime", description: "L'agent a ete supprime avec succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: AddAgentForm) => {
    addMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-insurance-agents-title">Gestion des agents</h1>
          <p className="text-sm text-muted-foreground">Gerez les agents de votre assurance</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-insurance-agent">
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des agents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enregistrements</TableHead>
                    <TableHead>Date creation</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id} data-testid={`row-insurance-agent-${agent.id}`}>
                      <TableCell className="font-medium" data-testid={`text-agent-name-${agent.id}`}>{agent.fullName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{agent.email ?? "-"}</TableCell>
                      <TableCell className="text-sm" data-testid={`text-agent-count-${agent.id}`}>{agent.passengerCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(agent.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteAgent(agent)}
                          data-testid={`button-delete-insurance-agent-${agent.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">Aucun agent enregistre</p>
              <p className="text-sm mt-1">Ajoutez des agents pour commencer</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un agent</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Moussa Diallo" {...field} data-testid="input-insurance-agent-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: moussa" {...field} data-testid="input-insurance-agent-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ex: moussa@email.com" {...field} data-testid="input-insurance-agent-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mot de passe" {...field} data-testid="input-insurance-agent-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
                <Button type="submit" disabled={addMutation.isPending} data-testid="button-confirm-add-insurance-agent">
                  {addMutation.isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAgent} onOpenChange={(open) => !open && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer l'agent {deleteAgent?.fullName} ? Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-agent">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAgent && deleteMutation.mutate(deleteAgent.id)}
              data-testid="button-confirm-delete-agent"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
