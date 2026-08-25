import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Trash2, Users, TrendingUp, Calendar } from "lucide-react";

interface AgentStat {
  agentId: number;
  fullName: string;
  username: string;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  totalCount: number;
}

interface Agent {
  id: number;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export default function Agents() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: agentStats, isLoading } = useQuery<AgentStat[]>({
    queryKey: ["/api/admin/agents/stats"],
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/admin/agents"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { username: string; fullName: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/agents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents/stats"] });
      setShowAddDialog(false);
      setNewUsername("");
      setNewFullName("");
      setNewPassword("");
      toast({ title: "Agent ajoute", description: "Le nouvel agent a ete cree avec succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents/stats"] });
      toast({ title: "Agent supprime" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleAddAgent = () => {
    if (!newUsername || !newFullName || !newPassword) return;
    addMutation.mutate({ username: newUsername, fullName: newFullName, password: newPassword });
  };

  const totalToday = agentStats?.reduce((sum, a) => sum + a.todayCount, 0) ?? 0;
  const totalMonth = agentStats?.reduce((sum, a) => sum + a.monthCount, 0) ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-agents-title">Gestion des agents</h1>
          <p className="text-sm text-muted-foreground">Suivez les performances de vos agents</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-agent">
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un agent
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agents actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-agents-count">{agents?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enregistrements aujourd'hui</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ce mois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonth}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agentStats && agentStats.length > 0 ? (
        <div className="space-y-3">
          {agentStats.map((agent) => (
            <Card key={agent.agentId} data-testid={`card-agent-${agent.agentId}`}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground text-xs font-semibold shrink-0">
                    {agent.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{agent.fullName}</p>
                      <span className="text-xs text-muted-foreground">@{agent.username}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Badge variant="default" className="text-[10px]">{agent.todayCount}</Badge>
                        <span className="text-[10px] text-muted-foreground">aujourd'hui</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">{agent.weekCount}</Badge>
                        <span className="text-[10px] text-muted-foreground">semaine</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">{agent.monthCount}</Badge>
                        <span className="text-[10px] text-muted-foreground">mois</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">{agent.totalCount}</Badge>
                        <span className="text-[10px] text-muted-foreground">total</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Supprimer l'agent ${agent.fullName} ?`)) {
                        deleteMutation.mutate(agent.agentId);
                      }
                    }}
                    data-testid={`button-delete-agent-${agent.agentId}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Aucun agent enregistre</p>
          <p className="text-sm mt-1">Ajoutez des agents pour commencer</p>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Ex: Moussa Diallo" data-testid="input-agent-fullname" />
            </div>
            <div className="space-y-1.5">
              <Label>Nom d'utilisateur</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Ex: moussa" data-testid="input-agent-username" />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mot de passe" data-testid="input-agent-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
            <Button onClick={handleAddAgent} disabled={addMutation.isPending || !newUsername || !newFullName || !newPassword} data-testid="button-confirm-add-agent">
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
