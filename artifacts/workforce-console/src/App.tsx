import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { LocationProvider } from "@/lib/location-context";

import { AppShell } from "@/components/layout/shell";
import Login from "@/pages/login";
import Bootstrap from "@/pages/bootstrap";
import Dashboard from "@/pages/dashboard";
import Rooms from "@/pages/rooms";
import Tasks from "@/pages/tasks";
import Assignments from "@/pages/assignments";
import Shifts from "@/pages/shifts";
import Users from "@/pages/users";
import SessionDebug from "@/pages/session";
import Timeline from "@/pages/timeline";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {children}
    </div>
  );
}

function ProtectedRoutes() {
  return (
    <LocationProvider>
      <AppShell>
        <Switch>
          <Route path="/app/dashboard" component={() => <PageContent><Dashboard /></PageContent>} />
          <Route path="/app/rooms" component={() => <PageContent><Rooms /></PageContent>} />
          <Route path="/app/tasks" component={() => <PageContent><Tasks /></PageContent>} />
          <Route path="/app/assignments" component={() => <PageContent><Assignments /></PageContent>} />
          <Route path="/app/shifts" component={() => <PageContent><Shifts /></PageContent>} />
          <Route path="/app/users" component={() => <PageContent><Users /></PageContent>} />
          <Route path="/app/session" component={() => <PageContent><SessionDebug /></PageContent>} />
          <Route path="/app/timeline" component={Timeline} />
          <Route path="/app" component={() => <Redirect to="/app/dashboard" />} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </LocationProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/app/dashboard" />} />
      <Route path="/login" component={Login} />
      <Route path="/bootstrap" component={Bootstrap} />
      <Route path="/app/*" component={ProtectedRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
