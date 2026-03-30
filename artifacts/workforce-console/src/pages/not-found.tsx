import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6 p-8 max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto w-24 h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center border border-destructive/20 shadow-lg shadow-destructive/10">
          <AlertCircle className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-medium text-muted-foreground">Page Not Found</h2>
          <p className="text-muted-foreground text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-white">
          <Link href="/app/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
