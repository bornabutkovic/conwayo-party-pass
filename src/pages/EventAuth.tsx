import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useEvent";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function EventAuth() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { data: event, isLoading, error } = useEvent(slug ?? "");

  const [tab, setTab] = useState<string>("register");
  const [submitting, setSubmitting] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  if (isLoading) return <EventPageSkeleton />;

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Event Not Found</h1>
          <p className="mb-8 text-muted-foreground">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.first_name || !regForm.last_name || !regForm.email || !regForm.password) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (regForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create auth user
      const { error: authError } = await signUp(regForm.email, regForm.password, {
        first_name: regForm.first_name,
        last_name: regForm.last_name,
      });
      if (authError) throw authError;

      // 2. Get the newly created user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account, then log in.",
        });
        setTab("login");
        setSubmitting(false);
        return;
      }

      // 3. Create attendee record linked to profile
      const { error: attError } = await supabase.from("attendees").insert({
        event_id: event.id,
        first_name: regForm.first_name,
        last_name: regForm.last_name,
        email: regForm.email,
        phone: regForm.phone || null,
        profile_id: session.user.id,
        status: "approved",
        payment_status: "paid",
      });

      if (attError) throw attError;

      toast({ title: "Registration successful!" });
      navigate(`/event/${slug}/dashboard`);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) throw error;

      // Check if attendee exists for this event
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Login failed");

      const { data: attendee } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", event.id)
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (!attendee) {
        toast({
          title: "No registration found",
          description: "You are not registered for this event. Please register first.",
          variant: "destructive",
        });
        setTab("register");
        setSubmitting(false);
        return;
      }

      navigate(`/event/${slug}/dashboard`);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <EventHero event={event} />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-md">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Your Account</CardTitle>
                  <CardDescription>Register for {event.name} and get your digital ticket.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="reg_first_name">First Name *</Label>
                        <Input
                          id="reg_first_name"
                          value={regForm.first_name}
                          onChange={(e) => setRegForm((p) => ({ ...p, first_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reg_last_name">Last Name *</Label>
                        <Input
                          id="reg_last_name"
                          value={regForm.last_name}
                          onChange={(e) => setRegForm((p) => ({ ...p, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reg_email">Email *</Label>
                      <Input
                        id="reg_email"
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg_phone">Phone</Label>
                      <Input
                        id="reg_phone"
                        value={regForm.phone}
                        onChange={(e) => setRegForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg_password">Password *</Label>
                      <Input
                        id="reg_password"
                        type="password"
                        value={regForm.password}
                        onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {submitting ? "Creating Account..." : "Register & Get Ticket"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Log in to access your ticket for {event.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login_email">Email</Label>
                      <Input
                        id="login_email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="login_password">Password</Label>
                      <Input
                        id="login_password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {submitting ? "Logging In..." : "Log In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
