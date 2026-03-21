import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";

// Layout & Pages
import { AppShell } from "@/components/layout/shell";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Rooms from "@/pages/rooms";
import Tasks from "@/pages/tasks";
import Assignments from "@/pages/assignments";
import Shifts from "@/pages/shifts";
import SessionDebug from "@/pages/session";
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

function ProtectedRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/app/dashboard" component={Dashboard} />
        <Route path="/app/rooms" component={Rooms} />
        <Route path="/app/tasks" component={Tasks} />
        <Route path="/app/assignments" component={Assignments} />
        <Route path="/app/shifts" component={Shifts} />
        <Route path="/app/session" component={SessionDebug} />
        <Route path="/app" component={() => <Redirect to="/app/dashboard" />} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/app/dashboard" />} />
      <Route path="/login" component={Login} />
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
