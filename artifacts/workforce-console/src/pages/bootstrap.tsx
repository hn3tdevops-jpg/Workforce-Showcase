import { useState } from "react";
import { Rocket, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { API_BASE, ApiError } from "@/lib/api-client";

interface BootstrapForm {
  email: string;
  password: string;
  business_name: string;
}

type BootstrapStatus = "idle" | "loading" | "success" | "forbidden" | "error";

export default function Bootstrap() {
  const [form, setForm] = useState<BootstrapForm>({
    email: "",
    password: "",
    business_name: "",
  });
  const [status, setStatus] = useState<BootstrapStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE}/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.status === 403) {
        setStatus("forbidden");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new ApiError(response.status, data.detail ?? "Bootstrap failed");
      }

      setStatus("success");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 403) {
        setStatus("forbidden");
      } else {
        setStatus("error");
        setErrorMsg(apiErr?.message ?? "An unexpected error occurred.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Rocket className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">First-Run Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bootstrap the Workforce platform with an initial admin user and business.
          </p>
        </div>

        {status === "forbidden" && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Bootstrap already completed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The system has already been initialised. Bootstrap is disabled once initial users exist.
                </p>
                <Link href="/login">
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs">
                    Go to Login <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "success" && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-400">Bootstrap successful</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your admin user and business have been created. You can now log in.
                </p>
                <Link href="/login">
                  <Button size="sm" className="mt-3 gap-1.5 text-xs">
                    Sign In <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </CardContent>
          </Card>
        )}

        {status !== "success" && status !== "forbidden" && (
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Initial Configuration</CardTitle>
              <CardDescription className="text-xs">
                This page is only accessible before any users exist. It will return 403 once the system is bootstrapped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Business Name</Label>
                  <Input
                    required
                    placeholder="Silver Sands Motel"
                    className="h-9 text-sm"
                    value={form.business_name}
                    onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Admin Email</Label>
                  <Input
                    required
                    type="email"
                    placeholder="admin@example.com"
                    className="h-9 text-sm font-mono"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Admin Password</Label>
                  <Input
                    required
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="h-9 text-sm"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={status === "loading"}
                >
                  <Rocket className="w-4 h-4" />
                  {status === "loading" ? "Bootstrapping..." : "Initialise Platform"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
