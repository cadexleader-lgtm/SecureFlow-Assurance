import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, QrCode, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Passenger } from "@shared/schema";

const statusLabels: Record<string, string> = {
  en_attente: "En attente",
  contrat_cree: "Contrat cree",
  valide: "Valide",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  en_attente: "secondary",
  contrat_cree: "outline",
  valide: "default",
};

export default function Passengers() {
  const [search, setSearch] = useState("");
  const [filterDest, setFilterDest] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  const { data: passengers, isLoading } = useQuery<Passenger[]>({
    queryKey: ["/api/passengers"],
  });

  const filtered = passengers?.filter((p) => {
    const matchSearch = search === "" ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      String(p.id).includes(search);
    const matchDest = filterDest === "all" || p.destination === filterDest;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchDest && matchStatus;
  }) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-passengers-title">Tous les Passagers</h1>
        <p className="text-sm text-muted-foreground">
          {passengers ? `${passengers.length} passager(s) enregistre(s) au total` : "Chargement..."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, telephone ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-passengers"
          />
        </div>
        <Select value={filterDest} onValueChange={setFilterDest}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-destination">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes destinations</SelectItem>
            {[...new Set(passengers?.map(p => p.destination).filter(Boolean) ?? [])].sort().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-filter-status">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="contrat_cree">Contrat cree</SelectItem>
            <SelectItem value="valide">Valide</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedPassenger(p)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground text-xs font-semibold shrink-0">
                    {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" data-testid={`text-name-${p.id}`}>{p.fullName}</p>
                      <span className="text-xs text-muted-foreground font-mono">SF-{String(p.id).padStart(4, "0")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.company} &middot; {p.departure ? `${p.departure} → ` : ""}{p.destination} &middot; {p.travelDate} a {p.travelTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariants[p.status] || "secondary"} className="text-[10px]">
                      {statusLabels[p.status] || p.status}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPassenger(p); }} data-testid={`button-view-${p.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Aucun passager trouve</p>
          <p className="text-sm mt-1">Modifiez vos filtres</p>
        </div>
      )}

      <Dialog open={!!selectedPassenger} onOpenChange={(open) => !open && setSelectedPassenger(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Detail du passager
            </DialogTitle>
          </DialogHeader>
          {selectedPassenger && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={`${window.location.origin}/verify/${selectedPassenger.id}`} size={160} level="H" includeMargin />
              </div>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">N. Police</span>
                  <span className="font-mono font-semibold" data-testid="text-detail-id">SF-{String(selectedPassenger.id).padStart(4, "0")}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Nom complet</span>
                  <span className="font-medium" data-testid="text-detail-name">{selectedPassenger.fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Telephone</span>
                  <span data-testid="text-detail-phone">{selectedPassenger.phone}</span>
                </div>
                {selectedPassenger.departure && (
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Depart</span>
                    <span data-testid="text-detail-departure">{selectedPassenger.departure}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Destination</span>
                  <span data-testid="text-detail-destination">{selectedPassenger.destination}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Compagnie</span>
                  <span data-testid="text-detail-company">{selectedPassenger.company}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Date</span>
                  <span data-testid="text-detail-date">{selectedPassenger.travelDate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-semibold" data-testid="text-detail-commission">{selectedPassenger.commissionGenerated ?? 0} CFA</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Statut</span>
                  <Badge variant={statusVariants[selectedPassenger.status] || "secondary"} className="text-[10px]">
                    {statusLabels[selectedPassenger.status] || selectedPassenger.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
