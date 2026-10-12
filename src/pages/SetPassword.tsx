import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Status = "verifying" | "invalid" | "ready";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = typeParam === "invite" || typeParam === "recovery" ? typeParam : null;

  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (verifyStarted.current) return;
    verifyStarted.current = true;

    if (!tokenHash || !type) {
      setStatus("invalid");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(({ error }) => {
        setStatus(error ? "invalid" : "ready");
      });
  }, [tokenHash, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: t("setPassword.tooShort"), variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: t("setPassword.mismatch"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("setPassword.success") });
      navigate("/my-tickets", { replace: true });
    } catch (err: any) {
      toast({ title: t("setPassword.failed"), description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const title = type === "recovery" ? t("setPassword.titleRecovery") : t("setPassword.titleInvite");

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-md">
          {status === "verifying" && (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t("setPassword.verifying")}</span>
              </CardContent>
            </Card>
          )}

          {status === "invalid" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("setPassword.invalidTitle")}</CardTitle>
                <CardDescription>{t("setPassword.invalidDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  {t("setPassword.backToLogin")}
                </Button>
              </CardContent>
            </Card>
          )}

          {status === "ready" && (
            <Card>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t("setPassword.formDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="new_password">{t("setPassword.newPassword")}</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{t("setPassword.minChars")}</p>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">{t("setPassword.confirmPassword")}</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {submitting ? t("setPassword.saving") : t("setPassword.save")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
