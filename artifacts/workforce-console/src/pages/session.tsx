import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Server } from "lucide-react";

export default function SessionDebug() {
  const { session } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-500 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" />
          Session Debug
        </h1>
        <p className="text-muted-foreground mt-1">Raw JWT payload and permissions from the API server.</p>
      </div>

      <Card className="border-border/50 shadow-md bg-card/80 backdrop-blur">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="w-5 h-5 text-primary" />
            Payload: /auth/me
          </CardTitle>
          <CardDescription>Live data returned from https://hn3t.pythonanywhere.com</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <pre className="p-6 overflow-auto text-sm font-mono text-emerald-400 bg-black/50">
            {JSON.stringify(session, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
