import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface InvitationDetail {
  id: string;
  invite_token: string;
  status: string;
  target_email: string;
  expires_at: string;
  employee_name: string;
  job_title: string | null;
  department: string | null;
  work_email: string | null;
  employee_profile_id: string;
}

export default function InviteClaim() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const { session, isAuthenticated } = useAuth();
  const [claimed, setClaimed] = useState(false);

  const { data: inv, isLoading, error } = useQuery<InvitationDetail>({
    queryKey: ["invite", token],
    queryFn: () => fetchApi(`/workforce/invitations/token/${token}`),
    enabled: !!token,
    retry: false,
  });

  const claimMut = useMutation({
    mutationFn: (userId: string) =>
      fetchApi(`/workforce/invitations/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: () => setClaimed(true),
  });

  const handleClaim = () => {
    if (!session?.id) { navigate("/login"); return; }
    claimMut.mutate(session.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Invitation Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This invitation link is invalid or has expired. Ask your manager to resend it.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inv.status !== "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              Invitation Already {inv.status === "CLAIMED" ? "Used" : inv.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {inv.status === "CLAIMED"
                ? "This invitation has already been claimed and linked to an account."
                : "This invitation is no longer active."}
            </p>
            <Button variant="outline" onClick={() => navigate("/app/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-emerald-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Account Linked!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is now linked to the employee profile for{" "}
              <span className="font-semibold text-foreground">{inv.employee_name}</span>.
              Your permissions will be applied on your next login.
            </p>
            <Button onClick={() => navigate("/app/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Employee Invitation</CardTitle>
              <p className="text-xs text-muted-foreground">Silver Sands Motel — Workforce Portal</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3 space-y-1.5">
            <p className="text-sm font-semibold">{inv.employee_name}</p>
            {inv.job_title && <p className="text-xs text-muted-foreground">{inv.job_title}</p>}
            {inv.department && (
              <Badge variant="outline" className="text-[10px] h-5">
                {inv.department}
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Sent to: <span className="text-foreground font-medium">{inv.target_email}</span></p>
            {inv.expires_at && (
              <p>Expires: <span className="text-foreground">{new Date(inv.expires_at).toLocaleDateString()}</span></p>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-400 bg-amber-950/30 border border-amber-800/30 rounded px-3 py-2">
                You need to be logged in to claim this invitation.
              </p>
              <Button className="w-full" onClick={() => navigate(`/login?redirect=/invite/${token}`)}>
                Log in to Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-muted/30 border border-border/30 rounded px-3 py-2">
                Logged in as: <span className="text-foreground font-medium">{session?.email}</span>
              </div>
              <Button
                className="w-full"
                onClick={handleClaim}
                disabled={claimMut.isPending}
              >
                {claimMut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Linking account…</>
                ) : (
                  <><UserCheck className="w-4 h-4 mr-2" />Connect my account</>
                )}
              </Button>
              {claimMut.isError && (
                <p className="text-xs text-destructive">
                  {(claimMut.error as Error)?.message ?? "Failed to claim invitation"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
