import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ShieldAlert, RotateCcw, CheckCircle2, X } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/app/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError("");
    try {
      await login({ email, password });
      setLocation("/app/dashboard");
    } catch (err: any) {
      // Distinguish network-level failures (status 0) from API error responses.
      const status = (err && (err as any).status) ?? (err && (err as any).statusCode) ?? 0;
      if (status === 0) {
        setError("Network error contacting server. Please check your connection and try again.");
      } else {
        setError((err && err.message) || "Invalid credentials. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    setResetPending(true);
    try {
      const res = await fetch("/api/v1/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail, new_password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.detail ?? "Reset failed.");
        return;
      }
      setResetDone(true);
      setEmail(resetEmail);
    } catch {
      setResetError("Could not reach the server. Please try again.");
    } finally {
      setResetPending(false);
    }
  };

  const closeReset = () => {
    setShowReset(false);
    setResetEmail("");
    setResetPassword("");
    setResetConfirm("");
    setResetError("");
    setResetDone(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Abstract dark background"
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 shadow-xl shadow-black/50 flex items-center justify-center overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Workforce Console</h1>
          <p className="text-muted-foreground font-mono text-sm">OPERATIONS PLATFORM</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 h-12 text-base border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-muted-foreground font-medium">Password</Label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-xs text-primary/70 hover:text-primary transition-colors underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                    <Link href="/register" className="text-xs text-primary/70 hover:text-primary transition-colors underline-offset-4 hover:underline">
                      Create account
                    </Link>
                  </div>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 h-12 text-base border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 text-base font-semibold"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5 mr-2 opacity-70" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>
            New here? <Link href="/register" className="text-primary underline">Create an account</Link>
          </p>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Reset Password</CardTitle>
                </div>
                <button
                  onClick={closeReset}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <CardDescription className="text-sm text-muted-foreground pt-1">
                Set a new local password for your account. This works independently of the remote server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetDone ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <div>
                    <p className="font-semibold text-foreground">Password saved</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now sign in with your new credentials.
                    </p>
                  </div>
                  <Button className="w-full" onClick={closeReset}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-muted-foreground text-sm">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-pw" className="text-muted-foreground text-sm">New Password</Label>
                    <Input
                      id="reset-pw"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm" className="text-muted-foreground text-sm">Confirm Password</Label>
                    <Input
                      id="reset-confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                      required
                      className="bg-background/50 border-border/50"
                    />
                  </div>

                  {resetError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium">{resetError}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeReset}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={resetPending}>
                      {resetPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Password"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
