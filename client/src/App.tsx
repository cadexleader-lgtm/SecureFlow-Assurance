import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InsuranceSidebar } from "@/components/insurance-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import InsuranceManagement from "@/pages/insurance-management";
import TransportCompanies from "@/pages/transport-companies";
import Passengers from "@/pages/passengers";
import Revenue from "@/pages/revenue";
import ActionLogs from "@/pages/action-logs";
import InsuranceDashboard from "@/pages/insurance-dashboard";
import InsuranceAgents from "@/pages/insurance-agents";
import InsurancePassengers from "@/pages/insurance-passengers";
import Verify from "@/pages/verify";
import Login from "@/pages/login";
import AgentDashboard from "@/pages/agent-dashboard";
import SettingsPage from "@/pages/settings";
import Reports from "@/pages/reports";
import InsuranceSettingsPage from "@/pages/insurance-settings";

import { Skeleton } from "@/components/ui/skeleton";

function SuperAdminLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/" component={SuperAdminDashboard} />
              <Route path="/insurances" component={InsuranceManagement} />
              <Route path="/transport" component={TransportCompanies} />
              <Route path="/passengers" component={Passengers} />
              <Route path="/revenue" component={Revenue} />
              <Route path="/reports" component={Reports} />
              <Route path="/logs" component={ActionLogs} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function InsuranceAdminLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <InsuranceSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/" component={InsuranceDashboard} />
              <Route path="/agents" component={InsuranceAgents} />
              <Route path="/passengers" component={InsurancePassengers} />
              <Route path="/reports" component={Reports} />
              <Route path="/stats" component={InsuranceDashboard} />
              <Route path="/insurance-info" component={InsuranceSettingsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === "agent") {
    return <AgentDashboard />;
  }

  if (user.role === "insurance_admin") {
    return <InsuranceAdminLayout />;
  }

  return <SuperAdminLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Switch>
              <Route path="/verify/:id" component={Verify} />
              <Route component={AuthenticatedApp} />
            </Switch>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
