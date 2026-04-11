import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type SignupState = {
  email: string;
  password: string;
  confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
};

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [state, setState] = useState<SignupState>({ email: "", password: "", confirm: "", first_name: "", last_name: "", phone: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof SignupState>(k: K, v: SignupState[K]) => setState((s) => ({ ...s, [k]: v }));

  const validateStep = () => {
    if (step === 1) {
      if (!state.email || !state.password || !state.confirm) return "Please complete email and password";
      if (state.password.length < 8) return "Password must be at least 8 characters";
      if (state.password !== state.confirm) return "Passwords do not match";
    }
    if (step === 2) {
      if (!state.first_name || !state.last_name) return "Please enter your name";
    }
    return null;
  };

  const next = () => {
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    setPending(true);
    try {
      // Attempt registration
      const payload = {
        email: state.email,
        password: state.password,
        first_name: state.first_name,
        last_name: state.last_name,
        phone: state.phone || null,
      } as any;

      const res = await fetchApi<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // If backend returned access_token, store it and redirect to app
      if (res?.access_token) {
        localStorage.setItem("workforce_token", res.access_token);
        toast({ title: "Account created", description: "Signed in successfully" });
        setLocation("/app/dashboard");
        return;
      }

      // Otherwise redirect back to login with prefilled email and message
      toast({ title: "Account created", description: "Please sign in to continue" });
      setLocation(`/login`);
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-lg p-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription className="text-muted-foreground">Sign up for a Workforce account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" required value={state.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" required value={state.password} onChange={(e) => setField("password", e.target.value)} />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input type="password" required value={state.confirm} onChange={(e) => setField("confirm", e.target.value)} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <Label>First name</Label>
                    <Input required value={state.first_name} onChange={(e) => setField("first_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input required value={state.last_name} onChange={(e) => setField("last_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input value={state.phone} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Review</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Email</div>
                      <div>{state.email}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Name</div>
                      <div>{`${state.first_name} ${state.last_name}`}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Phone</div>
                      <div>{state.phone || "-"}</div>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="p-2 text-sm text-destructive">{error}</div>}

              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={back} disabled={pending}>Back</Button>
                )}
                {step < 3 ? (
                  <Button onClick={next} disabled={pending}>{"Next"}</Button>
                ) : (
                  <Button type="submit" disabled={pending}>
                    {pending ? "Creating…" : "Create account"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
