import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/");
    }, 1500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Shield className="h-12 w-12 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-redirect-title">SecureFlow</h1>
            <p className="text-sm text-muted-foreground">
              Redirection vers votre tableau de bord...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
