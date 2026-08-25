import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { FileBarChart, Download, Calendar, Users, Shield, FileText, FileSpreadsheet, DollarSign, ArrowUpRight } from "lucide-react";
import type { Passenger, Insurance } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface ReportPassenger extends Passenger {
  insuranceName: string | null;
  agentName: string | null;
}

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

export default function Reports() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [filterInsurance, setFilterInsurance] = useState("all");

  const isInsuranceAdmin = user?.role === "insurance_admin";

  const { data, isLoading } = useQuery<{ passengers: ReportPassenger[]; insurances: Insurance[] }>({
    queryKey: ["/api/reports/data", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/data?start=${startDate}&end=${endDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const allInsurances = data?.insurances ?? [];
  const allPassengers = data?.passengers ?? [];

  const filteredPassengers = allPassengers.filter((p) => {
    if (filterInsurance === "all") return true;
    if (filterInsurance === "sans_assurance") return !p.insuranceId;
    return p.insuranceId === parseInt(filterInsurance);
  });

  const groupedByInsurance: Record<string, { name: string; insuranceId: number | null; passengers: ReportPassenger[] }> = {};
  allPassengers.forEach((p) => {
    const key = p.insuranceId ? String(p.insuranceId) : "sans_assurance";
    if (!groupedByInsurance[key]) {
      groupedByInsurance[key] = {
        name: p.insuranceName || "Sans assurance",
        insuranceId: p.insuranceId,
        passengers: [],
      };
    }
    groupedByInsurance[key].passengers.push(p);
  });

  const totalPrimes = filteredPassengers.reduce((s, p) => s + (p.price || 500), 0);
  const totalCommissions = filteredPassengers.reduce((s, p) => s + (p.commissionGenerated || 0), 0);
  const netRevenue = totalPrimes - totalCommissions;

  const handleDownload = (format: "pdf" | "excel", insuranceId?: number) => {
    let url = `/api/reports/download?start=${startDate}&end=${endDate}&format=${format}`;
    if (insuranceId) url += `&insuranceId=${insuranceId}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reports-title">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            {isInsuranceAdmin
              ? "Telechargez vos rapports par periode en PDF ou Excel"
              : "Generez et telechargez les rapports par assurance en PDF ou Excel"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              data-testid="input-report-start"
            />
          </div>
          <span className="text-muted-foreground text-sm">au</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
            data-testid="input-report-end"
          />
        </div>
      </div>

      {!isInsuranceAdmin && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterInsurance} onValueChange={setFilterInsurance}>
            <SelectTrigger className="w-auto min-w-[200px]" data-testid="select-filter-insurance">
              <SelectValue placeholder="Toutes assurances" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes assurances</SelectItem>
              {allInsurances.filter((ins) => ins.status === "active").map((ins) => (
                <SelectItem key={ins.id} value={String(ins.id)}>{ins.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Passagers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-report-total">{filteredPassengers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filterInsurance !== "all" ? "filtre actif" : "sur la periode"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Primes collectees</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-report-primes">
                  {totalPrimes.toLocaleString("fr-FR")} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">total des primes d'assurance</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Commission SecureFlow</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-report-commissions">
                  {totalCommissions.toLocaleString("fr-FR")} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">retenu par SecureFlow</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {isInsuranceAdmin ? "Vos revenus nets" : "Revenus nets assurance"}
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" data-testid="text-report-net">
                  {netRevenue.toLocaleString("fr-FR")} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isInsuranceAdmin ? "apres commission SecureFlow" : "revenant a l'assurance"}
                </p>
              </CardContent>
            </Card>
          </div>

          {isInsuranceAdmin ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Telecharger votre rapport
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleDownload("pdf")} data-testid="button-download-pdf-own">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload("excel")} data-testid="button-download-excel-own">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Rapport pour la periode du {startDate} au {endDate} - {filteredPassengers.length} passager(s)
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Rapports par assurance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedByInsurance).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(groupedByInsurance).map(([key, group]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-md bg-accent/30 flex-wrap gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent shrink-0">
                            <Shield className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium" data-testid={`text-insurance-name-${key}`}>{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.passengers.length} passager(s)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.insuranceId && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload("pdf", group.insuranceId!)}
                                data-testid={`button-download-pdf-${key}`}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload("excel", group.insuranceId!)}
                                data-testid={`button-download-excel-${key}`}
                              >
                                <FileSpreadsheet className="w-3 h-3 mr-1" />
                                Excel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                      <span className="text-sm text-muted-foreground mr-auto">Tout telecharger (toutes assurances):</span>
                      <Button variant="outline" onClick={() => handleDownload("pdf")} data-testid="button-download-pdf-all">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF global
                      </Button>
                      <Button variant="outline" onClick={() => handleDownload("excel")} data-testid="button-download-excel-all">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel global
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnee pour cette periode</p>
                )}
              </CardContent>
            </Card>
          )}

          {filteredPassengers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileBarChart className="w-4 h-4" />
                  Liste detaillee ({filteredPassengers.length} passager{filteredPassengers.length > 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N. Police</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Telephone</TableHead>
                      {!isInsuranceAdmin && <TableHead>Assurance</TableHead>}
                      <TableHead>Agent</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Prime</TableHead>
                      <TableHead className="text-right">Com. SF</TableHead>
                      <TableHead className="text-right">Net assurance</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPassengers.map((p) => (
                      <TableRow key={p.id} data-testid={`report-row-${p.id}`}>
                        <TableCell className="font-mono text-xs">SF-{String(p.id).padStart(4, "0")}</TableCell>
                        <TableCell className="font-medium">{p.fullName}</TableCell>
                        <TableCell>{p.phone}</TableCell>
                        {!isInsuranceAdmin && <TableCell>{p.insuranceName || "-"}</TableCell>}
                        <TableCell>{p.agentName || "-"}</TableCell>
                        <TableCell>{p.destination}</TableCell>
                        <TableCell>{p.company}</TableCell>
                        <TableCell>{p.travelDate}</TableCell>
                        <TableCell className="text-right font-semibold">{(p.price || 500).toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">{(p.commissionGenerated || 0).toLocaleString("fr-FR")}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{((p.price || 500) - (p.commissionGenerated || 0)).toLocaleString("fr-FR")}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[p.status] || "secondary"} className="text-[10px]">
                            {statusLabels[p.status] || p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={isInsuranceAdmin ? 7 : 8} className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">{totalPrimes.toLocaleString("fr-FR")} FCFA</TableCell>
                      <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">{totalCommissions.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{netRevenue.toLocaleString("fr-FR")}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
