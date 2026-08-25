import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, TrendingDown, UserCog, DollarSign, ArrowUpRight, MapPin, Bus, ImageIcon, AlertTriangle, Building2, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { Insurance } from "@shared/schema";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface InsuranceStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  totalCount: number;
  agentCount: number;
  activeAgentCount: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  lastMonthPremium: number;
  monthPremium: number;
  totalPremium: number;
  todayPremium: number;
  weekPremium: number;
  monthCommission: number;
  totalCommission: number;
  todayCommission: number;
  weekCommission: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  passengers: number;
  commission: number;
}

interface TopAgent {
  agentId: number;
  fullName: string;
  count: number;
  revenue: number;
}

interface TransportDist {
  company: string;
  count: number;
}

interface TopDestination {
  destination: string;
  count: number;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Avr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Aou", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function formatMonth(m: string) {
  const parts = m.split("-");
  return MONTH_NAMES[parts[1]] || parts[1];
}

function formatCFA(n: number) {
  return n.toLocaleString("fr-FR") + " CFA";
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Fevrier", "03": "Mars", "04": "Avril", "05": "Mai", "06": "Juin",
  "07": "Juillet", "08": "Aout", "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Decembre",
};

export default function InsuranceDashboard() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [historyYear, setHistoryYear] = useState(String(currentYear));

  const { data: stats, isLoading: statsLoading } = useQuery<InsuranceStats>({
    queryKey: ["/api/insurance/stats"],
  });

  const { data: monthlyData } = useQuery<MonthlyData[]>({
    queryKey: ["/api/insurance/stats/monthly"],
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery<{ date: string; count: number }[]>({
    queryKey: ["/api/insurance/stats/daily"],
  });

  const { data: topAgents } = useQuery<TopAgent[]>({
    queryKey: ["/api/insurance/stats/top-agents"],
  });

  const { data: transportDist } = useQuery<TransportDist[]>({
    queryKey: ["/api/insurance/stats/transport-distribution"],
  });

  const { data: topDestinations } = useQuery<TopDestination[]>({
    queryKey: ["/api/insurance/stats/top-destinations"],
  });

  const { data: legalInfo } = useQuery<Insurance>({
    queryKey: ["/api/insurance/legal-info"],
  });

  const { data: monthlyHistory, isLoading: historyLoading } = useQuery<{ month: string; passengers: number; revenue: number }[]>({
    queryKey: ["/api/insurance/stats/monthly-history", historyYear],
    queryFn: async () => {
      const res = await fetch(`/api/insurance/stats/monthly-history?year=${historyYear}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const yearAvailable = [];
  for (let y = currentYear; y >= currentYear - 5; y--) yearAvailable.push(String(y));
  const historyTotal = monthlyHistory?.reduce((acc, m) => ({ passengers: acc.passengers + m.passengers, revenue: acc.revenue + m.revenue }), { passengers: 0, revenue: 0 });

  const requiredLegalFields = [
    legalInfo?.raisonSociale,
    legalInfo?.siegeSocial,
    legalInfo?.telephone,
    legalInfo?.numeroAgrementCima,
    legalInfo?.garantieDeces,
    legalInfo?.garantieFraisMedicaux,
    legalInfo?.hotlineSinistres,
    legalInfo?.emailSinistres,
  ];
  const filledCount = requiredLegalFields.filter(Boolean).length;
  const hasIncompleteLegalInfo = legalInfo && filledCount < 4;

  const monthChange = stats ? percentChange(stats.monthPremium, stats.lastMonthPremium ?? stats.lastMonthRevenue) : 0;
  const netRevenue = stats ? stats.monthPremium - stats.monthCommission : 0;
  const netTotal = stats ? stats.totalPremium - stats.totalCommission : 0;

  const chartMonthly = monthlyData?.map(d => ({
    name: formatMonth(d.month),
    revenus: d.revenue,
    commission: d.commission,
    net: d.revenue - d.commission,
    passagers: d.passengers,
  })) ?? [];

  const chartAgents = topAgents?.map(a => ({
    name: a.fullName?.split(" ").slice(0, 2).join(" ") || "Agent",
    passagers: a.count,
    revenus: a.revenue,
  })) ?? [];

  const totalTransport = transportDist?.reduce((s, d) => s + d.count, 0) ?? 1;
  const chartTransport = transportDist?.map(d => ({
    name: d.company,
    value: d.count,
    percent: Math.round((d.count / totalTransport) * 100),
  })) ?? [];

  const chartDestinations = topDestinations?.map(d => ({
    name: d.destination,
    passagers: d.count,
  })) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        {user?.insuranceLogo ? (
          <img
            src={user.insuranceLogo}
            alt={user.insuranceName || "Logo"}
            className="w-12 h-12 rounded-lg object-contain bg-white border border-border shrink-0"
            data-testid="img-insurance-logo"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-insurance-dashboard-title">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">{user?.insuranceName || "Vue d'ensemble de votre activite d'assurance"}</p>
        </div>
      </div>

      {hasIncompleteLegalInfo && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" data-testid="banner-incomplete-legal">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Informations legales incompletes</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Vos tickets d'assurance ne contiennent pas encore toutes les informations legales requises par le Code CIMA. Remplissez-les pour etre en conformite.
            </p>
            <Link href="/insurance-info">
              <Button variant="outline" size="sm" className="mt-2" data-testid="button-complete-legal">
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Completer les informations
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aujourd'hui</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-aujourdhui">{stats?.todayCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">passagers enregistres</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cette semaine</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-semaine">{stats?.weekCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">passagers enregistres</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-ce-mois">{stats?.monthCount ?? 0}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {monthChange >= 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                  <span className={monthChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {monthChange >= 0 ? "+" : ""}{monthChange}%
                  </span>
                  vs mois dernier
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-16" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-total">{stats?.totalCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">depuis le debut</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-24" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="text-stat-revenue">{formatCFA(stats?.monthPremium ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">primes d'assurance</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agents actifs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="text-stat-agents">{stats?.activeAgentCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {stats?.agentCount ?? 0} agent(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus nets</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-24" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="text-stat-net-revenue">{formatCFA(netRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">apres commission SF</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-24" /> : (
              <>
                <div className="text-2xl font-bold" data-testid="text-stat-total-revenue">{formatCFA(stats?.totalPremium ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">tous temps confondus</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Evolution journaliere des passagers (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : dailyData && dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData.map(d => ({ ...d, label: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) }))} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} name="Passagers" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                <div className="flex flex-col items-center gap-2">
                  <TrendingUp className="w-8 h-8 opacity-50" />
                  <p>Aucune donnee disponible</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Top 5 agents (ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartAgents.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartAgents} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [value, "Passagers"]}
                  />
                  <Bar dataKey="passagers" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Pas encore de donnees
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Repartition par compagnie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartTransport.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartTransport}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${percent}%)`}
                  >
                    {chartTransport.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [value, "Passagers"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Pas encore de donnees
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Top destinations (ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartDestinations.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartDestinations}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [value, "Passagers"]}
                  />
                  <Bar dataKey="passagers" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Pas encore de donnees
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Statistiques detaillees</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : stats ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Passagers</TableHead>
                  <TableHead className="text-right">Revenus bruts</TableHead>
                  <TableHead className="text-right">Commission SecureFlow</TableHead>
                  <TableHead className="text-right">Revenus nets</TableHead>
                  <TableHead className="text-right">Prime moyenne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow data-testid="row-stats-today">
                  <TableCell className="font-medium">Aujourd'hui</TableCell>
                  <TableCell className="text-right">{stats.todayCount}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.todayPremium)}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.todayCommission)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCFA(stats.todayPremium - stats.todayCommission)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stats.todayCount > 0 ? formatCFA(Math.round(stats.todayPremium / stats.todayCount)) : "-"}</TableCell>
                </TableRow>
                <TableRow data-testid="row-stats-week">
                  <TableCell className="font-medium">Cette semaine</TableCell>
                  <TableCell className="text-right">{stats.weekCount}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.weekPremium)}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.weekCommission)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCFA(stats.weekPremium - stats.weekCommission)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stats.weekCount > 0 ? formatCFA(Math.round(stats.weekPremium / stats.weekCount)) : "-"}</TableCell>
                </TableRow>
                <TableRow data-testid="row-stats-month">
                  <TableCell className="font-medium">Ce mois</TableCell>
                  <TableCell className="text-right">{stats.monthCount}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.monthPremium)}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.monthCommission)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCFA(stats.monthPremium - stats.monthCommission)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stats.monthCount > 0 ? formatCFA(Math.round(stats.monthPremium / stats.monthCount)) : "-"}</TableCell>
                </TableRow>
                <TableRow className="font-bold" data-testid="row-stats-total">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{stats.totalCount}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.totalPremium)}</TableCell>
                  <TableCell className="text-right">{formatCFA(stats.totalCommission)}</TableCell>
                  <TableCell className="text-right">{formatCFA(netTotal)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stats.totalCount > 0 ? formatCFA(Math.round(stats.totalPremium / stats.totalCount)) : "-"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="card-monthly-history">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Historique Mensuel
          </CardTitle>
          <Select value={historyYear} onValueChange={setHistoryYear}>
            <SelectTrigger className="w-[120px]" data-testid="select-history-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearAvailable.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : monthlyHistory && monthlyHistory.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">Passagers</TableHead>
                    <TableHead className="text-right">Revenus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyHistory.map(row => {
                    const monthNum = row.month.split("-")[1];
                    const monthLabel = MONTH_LABELS[monthNum] || monthNum;
                    return (
                      <TableRow key={row.month} data-testid={`row-history-${row.month}`}>
                        <TableCell className="font-medium">{monthLabel}</TableCell>
                        <TableCell className="text-right">{row.passengers.toLocaleString("fr-FR")}</TableCell>
                        <TableCell className="text-right">{formatCFA(row.revenue)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {historyTotal && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm font-semibold">Total {historyYear}</span>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold" data-testid="text-history-total-passengers">{historyTotal.passengers.toLocaleString("fr-FR")} passagers</span>
                    <span className="text-sm font-bold text-primary" data-testid="text-history-total-revenue">{formatCFA(historyTotal.revenue)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Aucune donnee pour {historyYear}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Derniere mise a jour : {new Date().toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
