import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Shield, Bus, DollarSign, TrendingUp, TrendingDown, MapPin, UserCog, CalendarDays, FileText, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} CFA`;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Fevrier", "03": "Mars", "04": "Avril", "05": "Mai", "06": "Juin",
  "07": "Juillet", "08": "Aout", "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Decembre",
};

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default function SuperAdminDashboard() {
  const currentYear = new Date().getFullYear();
  const [historyYear, setHistoryYear] = useState(String(currentYear));

  const { data: stats, isLoading: statsLoading } = useQuery<{
    todayCount: number;
    weekCount: number;
    monthCount: number;
    totalCount: number;
    activeInsurances: number;
    activeTransportCompanies: number;
    monthRevenue: number;
    totalRevenue: number;
    monthPremium: number;
    lastMonthCount: number;
    lastMonthRevenue: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery<{ date: string; count: number }[]>({
    queryKey: ["/api/admin/stats/daily"],
  });

  const { data: insuranceDistribution, isLoading: distLoading } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/admin/stats/insurance-distribution"],
  });

  const { data: byDestination, isLoading: destLoading } = useQuery<{ destination: string; count: number }[]>({
    queryKey: ["/api/admin/stats/by-destination"],
  });

  const { data: topAgents, isLoading: agentsLoading } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/admin/stats/top-agents"],
  });

  const { data: monthlyHistory, isLoading: historyLoading } = useQuery<{ month: string; passengers: number; revenue: number }[]>({
    queryKey: ["/api/admin/stats/monthly-history", historyYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/monthly-history?year=${historyYear}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const monthChange = stats ? percentChange(stats.monthCount, stats.lastMonthCount) : 0;
  const yearAvailable = [];
  for (let y = currentYear; y >= currentYear - 5; y--) yearAvailable.push(String(y));
  const historyTotal = monthlyHistory?.reduce((acc, m) => ({ passengers: acc.passengers + m.passengers, revenue: acc.revenue + m.revenue }), { passengers: 0, revenue: 0 });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Tableau de bord Super Admin
        </h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble globale de la plateforme SecureFlow</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aujourd'hui"
          value={stats?.todayCount ?? 0}
          icon={Clock}
          description="passagers enregistres"
          loading={statsLoading}
        />
        <StatCard
          title="Cette semaine"
          value={stats?.weekCount ?? 0}
          icon={CalendarDays}
          description="passagers enregistres"
          loading={statsLoading}
        />
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
        <StatCard
          title="Total"
          value={stats?.totalCount ?? 0}
          icon={Users}
          description="depuis le debut"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assurances actives"
          value={stats?.activeInsurances ?? 0}
          icon={Shield}
          description="compagnies d'assurance"
          loading={statsLoading}
        />
        <StatCard
          title="Compagnies transport"
          value={stats?.activeTransportCompanies ?? 0}
          icon={Bus}
          description="actives"
          loading={statsLoading}
        />
        <StatCard
          title="Revenus ce mois"
          value={formatCFA(stats?.monthPremium ?? stats?.monthRevenue ?? 0)}
          icon={DollarSign}
          description="primes d'assurance"
          loading={statsLoading}
        />
        <StatCard
          title="Revenus totaux"
          value={formatCFA(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          description="tous temps confondus"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
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
              <ResponsiveContainer width="100%" height={280}>
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
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Repartition par assurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : insuranceDistribution && insuranceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={insuranceDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {insuranceDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Shield className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Top 5 Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {destLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : byDestination && byDestination.length > 0 ? (
              <div className="space-y-3">
                {byDestination.slice(0, 5).map((item, index) => (
                  <div
                    key={item.destination}
                    className="flex items-center gap-3"
                    data-testid={`row-destination-${index}`}
                  >
                    <span className="text-sm font-semibold text-muted-foreground w-5">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{item.destination}</span>
                        <span className="text-sm text-muted-foreground">{item.count} passagers</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-accent overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.count / (byDestination[0]?.count || 1)) * 100}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Top 5 Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : topAgents && topAgents.length > 0 ? (
              <div className="space-y-3">
                {topAgents.slice(0, 5).map((agent, index) => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3"
                    data-testid={`row-agent-${index}`}
                  >
                    <span className="text-sm font-semibold text-muted-foreground w-5">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{agent.name}</span>
                        <span className="text-sm text-muted-foreground">{agent.count} passagers</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-accent overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(agent.count / (topAgents[0]?.count || 1)) * 100}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <UserCog className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucun agent disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
