import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RevenueRow {
  insuranceId: number;
  name: string;
  count: number;
  commission: number;
  revenue: number;
  premiumTotal: number;
  commissionSF: number;
  netRevenue: number;
  paid?: boolean;
}

function formatCFA(n: number) {
  return n.toLocaleString("fr-FR") + " CFA";
}

export default function Revenue() {
  const { toast } = useToast();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [start, setStart] = useState(firstDay);
  const [end, setEnd] = useState(lastDay);

  const { data, isLoading } = useQuery<RevenueRow[]>({
    queryKey: ["/api/admin/revenue", start, end],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue?start=${start}&end=${end}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors du chargement des revenus");
      return res.json();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (insuranceId: number) => {
      await apiRequest("POST", `/api/admin/revenue/${insuranceId}/mark-paid`, {
        start,
        end,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue", start, end] });
      toast({ title: "Paiement enregistre", description: "Le paiement a ete marque comme effectue." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de marquer le paiement.", variant: "destructive" });
    },
  });

  const totalPremium = data?.reduce((sum, row) => sum + row.premiumTotal, 0) ?? 0;
  const totalCommissionSF = data?.reduce((sum, row) => sum + row.commissionSF, 0) ?? 0;
  const totalNet = data?.reduce((sum, row) => sum + row.netRevenue, 0) ?? 0;
  const totalPassengers = data?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-revenue-title">
          Revenus & Facturation
        </h1>
        <p className="text-sm text-muted-foreground">
          Suivez les revenus par assurance et la commission SecureFlow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus bruts (primes)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-summary-premium">{formatCFA(totalPremium)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalPassengers} passager(s) sur la periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commission SecureFlow</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-summary-commission">{formatCFA(totalCommissionSF)}</div>
            <p className="text-xs text-muted-foreground mt-1">Notre part sur cette periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus nets assurances</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-summary-net">{formatCFA(totalNet)}</div>
            <p className="text-xs text-muted-foreground mt-1">Apres deduction commission SF</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Date de debut</label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-auto"
                data-testid="input-revenue-start"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Date de fin</label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-auto"
                data-testid="input-revenue-end"
              />
            </div>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue", start, end] })}
              data-testid="button-filter-revenue"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Detail par assurance
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assurance</TableHead>
                  <TableHead className="text-right">Passagers</TableHead>
                  <TableHead className="text-right">Revenus bruts (primes)</TableHead>
                  <TableHead className="text-right">Commission SecureFlow</TableHead>
                  <TableHead className="text-right">Revenus nets assurance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.insuranceId} data-testid={`revenue-row-${row.insuranceId}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right" data-testid={`text-count-${row.insuranceId}`}>
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-premium-${row.insuranceId}`}>
                      {formatCFA(row.premiumTotal)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold" data-testid={`text-commission-sf-${row.insuranceId}`}>
                      {formatCFA(row.commissionSF)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-net-${row.insuranceId}`}>
                      {formatCFA(row.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.paid ? (
                        <span className="text-sm text-muted-foreground">Paye</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPaidMutation.mutate(row.insuranceId)}
                          disabled={markPaidMutation.isPending}
                          data-testid={`button-mark-paid-${row.insuranceId}`}
                        >
                          Marquer paye
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold" data-testid="text-total-passengers">
                    {totalPassengers}
                  </TableCell>
                  <TableCell className="text-right font-bold" data-testid="text-total-premium">
                    {formatCFA(totalPremium)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600 dark:text-green-400" data-testid="text-total-commission-sf">
                    {formatCFA(totalCommissionSF)}
                  </TableCell>
                  <TableCell className="text-right font-bold" data-testid="text-total-net">
                    {formatCFA(totalNet)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune donnee pour cette periode
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
