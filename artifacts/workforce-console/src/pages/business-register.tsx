import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

type BizState = {
  name: string;
  display_name?: string;
  type?: string;
  legal_class?: string;
  email?: string;
  phone?: string;
  contact_name?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  postal_code?: string;
};

export default function BusinessRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { session, switchBusiness } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [state, setState] = useState<BizState>({ name: "", display_name: "", type: "", legal_class: "", email: session?.email ?? "", phone: "", contact_name: session?.first_name ? `${session.first_name} ${session.last_name ?? ""}` : "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof BizState>(k: K, v: BizState[K]) => setState((s) => ({ ...s, [k]: v }));

  const validateStep = () => {
    if (step === 1) {
      if (!state.name) return "Please enter a business name";
    }
    if (step === 2) {
      if (!state.email || !state.contact_name) return "Please enter contact email and name";
    }
    return null;
  };

  const next = () => {
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = validateStep();
    if (v) return setError(v);
    setPending(true);
    setError(null);
    try {
      const payload = {
        name: state.name,
        display_name: state.display_name || null,
        type: state.type || null,
        legal_class: state.legal_class || null,
        email: state.email || null,
        phone: state.phone || null,
        contact_name: state.contact_name || null,
        address: {
          country: state.country || null,
          region: state.region || null,
          city: state.city || null,
          address_lines: state.address ? [state.address] : [],
          postal_code: state.postal_code || null,
        },
      } as any;

      const res = await fetchApi<any>("/business", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({ title: "Business created", description: "Business registration successful" });

      // If API returns an access token, use it to authenticate immediately
      if (res?.access_token) {
        localStorage.setItem("workforce_token", res.access_token);
        // Redirect into app
        setLocation("/app/dashboard");
        return;
      }

      // If API returns a business_id, attempt to switch to it
      if (res?.business_id && typeof switchBusiness === "function") {
        try {
          await switchBusiness(res.business_id);
          setLocation("/app/dashboard");
          return;
        } catch {
          // Fall through to settings on failure
        }
      }

      // Default: go to settings
      setLocation("/app/settings");
    } catch (err: any) {
      setError(err?.message || "Failed to create business. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardHeader>
            <CardTitle>Register a business</CardTitle>
            <CardDescription className="text-muted-foreground">Create a new business account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Business name</Label>
                    <Input value={state.name} onChange={(e) => setField("name", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Display name (optional)</Label>
                    <Input value={state.display_name} onChange={(e) => setField("display_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Business type</Label>
                    <Input value={state.type} onChange={(e) => setField("type", e.target.value)} />
                  </div>
                  <div>
                    <Label>Registration tier / legal class (placeholder)</Label>
                    <Input value={state.legal_class} onChange={(e) => setField("legal_class", e.target.value)} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Business email</Label>
                    <Input type="email" value={state.email} onChange={(e) => setField("email", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Business phone (optional)</Label>
                    <Input value={state.phone} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Primary contact name</Label>
                    <Input value={state.contact_name} onChange={(e) => setField("contact_name", e.target.value)} required />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Country</Label>
                    <Input value={state.country} onChange={(e) => setField("country", e.target.value)} />
                  </div>
                  <div>
                    <Label>State / Region</Label>
                    <Input value={state.region} onChange={(e) => setField("region", e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={state.city} onChange={(e) => setField("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>Address line (optional)</Label>
                    <Input value={state.address} onChange={(e) => setField("address", e.target.value)} />
                  </div>
                  <div>
                    <Label>Postal code (optional)</Label>
                    <Input value={state.postal_code} onChange={(e) => setField("postal_code", e.target.value)} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-sm font-semibold">Review</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Name</div>
                      <div>{state.name}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Display</div>
                      <div>{state.display_name || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Contact</div>
                      <div>{state.contact_name} · {state.email}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Location</div>
                      <div>{[state.address, state.city, state.region, state.country].filter(Boolean).join(", ") || "-"}</div>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="p-2 text-sm text-destructive">{error}</div>}

              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={back} disabled={pending}>Back</Button>
                )}
                {step < 4 ? (
                  <Button onClick={next} disabled={pending}>Next</Button>
                ) : (
                  <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create business"}</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
