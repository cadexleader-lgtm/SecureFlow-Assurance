import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, TrendingUp, Bus, MapPin, Building2 } from "lucide-react";
import type { Passenger } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(217, 91%, 35%)",
  "hsl(12, 76%, 40%)",
  "hsl(173, 58%, 35%)",
  "hsl(43, 74%, 45%)",
  "hsl(27, 87%, 50%)",
  "hsl(280, 60%, 45%)",
];

function StatCard({ title, value, icon: Icon, description, loading }: {
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
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    todayCount: number;
    totalCount: number;
    activeCount: number;
    companiesCount: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: byCompany, isLoading: companyLoading } = useQuery<{ company: string; count: number }[]>({
    queryKey: ["/api/stats/by-company"],
  });

  const { data: byDestination, isLoading: destLoading } = useQuery<{ destination: string; count: number }[]>({
    queryKey: ["/api/stats/by-destination"],
  });

  const { data: recentPassengers, isLoading: recentLoading } = useQuery<Passenger[]>({
    queryKey: ["/api/passengers/recent"],
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activite SecureFlow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aujourd'hui"
          value={stats?.todayCount ?? 0}
          icon={TrendingUp}
          description="Passagers enregistres aujourd'hui"
          loading={statsLoading}
        />
        <StatCard
          title="Total Passagers"
          value={stats?.totalCount ?? 0}
          icon={Users}
          description="Depuis le debut"
          loading={statsLoading}
        />
        <StatCard
          title="Assurances Actives"
          value={stats?.activeCount ?? 0}
          icon={Shield}
          description="Polices en cours"
          loading={statsLoading}
        />
        <StatCard
          title="Compagnies"
          value={stats?.companiesCount ?? 0}
          icon={Building2}
          description="Compagnies partenaires"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Par Compagnie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : byCompany && byCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCompany} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="company" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Passagers" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Bus className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Par Destination
            </CardTitle>
          </CardHeader>
          <CardContent>
            {destLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : byDestination && byDestination.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={byDestination}
                    dataKey="count"
                    nameKey="destination"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ destination, count }) => `${destination} (${count})`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {byDestination.map((_, i) => (
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
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Derniers enregistrements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              ))}
            </div>
          ) : recentPassengers && recentPassengers.length > 0 ? (
            <div className="space-y-1">
              {recentPassengers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                  data-testid={`row-passenger-${p.id}`}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                    {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.company} &middot; {p.destination} &middot; {p.travelTime}
                    </p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {p.status === "active" ? "Actif" : "Expire"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Aucun passager enregistre</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
