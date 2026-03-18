import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useEvent";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, UserCircle } from "lucide-react";

const PHONE_CODES = [
  { code: "+385", country: "HR" },
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "GB" },
  { code: "+49", country: "DE" },
  { code: "+43", country: "AT" },
  { code: "+386", country: "SI" },
  { code: "+381", country: "RS" },
  { code: "+387", country: "BA" },
  { code: "+382", country: "ME" },
  { code: "+39", country: "IT" },
  { code: "+33", country: "FR" },
  { code: "+34", country: "ES" },
  { code: "+31", country: "NL" },
  { code: "+48", country: "PL" },
  { code: "+36", country: "HU" },
  { code: "+420", country: "CZ" },
  { code: "+421", country: "SK" },
  { code: "+40", country: "RO" },
  { code: "+359", country: "BG" },
  { code: "+30", country: "GR" },
  { code: "+90", country: "TR" },
];

const COUNTRIES_LIST = [
  { code: "HR", name: "Croatia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "SE", name: "Sweden" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "US", name: "United States" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "ME", name: "Montenegro" },
  { code: "MK", name: "North Macedonia" },
  { code: "AL", name: "Albania" },
  { code: "CH", name: "Switzerland" },
  { code: "NO", name: "Norway" },
  { code: "TR", name: "Turkey" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function EventAuth() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn } = useAuth();

  // slug may be undefined for /auth route
  const { data: event, isLoading, error } = useEvent(slug ?? "__none__");
  const isEventPage = !!slug;

  const prefillEmail = searchParams.get("email") || "";
  const defaultTab = searchParams.get("tab") || "register";

  const [tab, setTab] = useState<string>(defaultTab);
  const [submitting, setSubmitting] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);

  const [regForm, setRegForm] = useState({
    first_name: "",
    last_name: "",
    email: prefillEmail,
    password: "",
    phoneCode: "+385",
    phoneNumber: "",
    address: "",
    city: "",
    postal_code: "",
    country_code: "HR",
    country_name: "Croatia",
    date_of_birth: "",
    gender: "",
  });

  const [loginForm, setLoginForm] = useState({ email: prefillEmail, password: "" });

  // If already logged in on event page, redirect
  useEffect(() => {
    if (authLoading || !user) return;
    if (!isEventPage) {
      navigate("/my-tickets", { replace: true });
      return;
    }
    if (isLoading || !event) return;

    const checkExisting = async () => {
      const { data: existing } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", event.id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate(`/event/${slug}/dashboard`, { replace: true });
      } else {
        navigate(`/event/${slug}/register`, { replace: true });
      }
    };

    checkExisting();
  }, [authLoading, isLoading, user, event, slug, navigate, isEventPage]);

  if (isEventPage && (isLoading || authLoading)) return <EventPageSkeleton />;
  if (isEventPage && (error || !event)) {
    return <EventNotFound slug={slug} errorMessage={error?.message} />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.first_name || !regForm.last_name || !regForm.email || !regForm.password) {
      toast({ title: "First name, last name, email and password are required", variant: "destructive" });
      return;
    }
    if (regForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error: authError } = await signUp(regForm.email, regForm.password, {
        first_name: regForm.first_name,
        last_name: regForm.last_name,
      });
      if (authError) throw authError;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Save extended profile data
        const phone = regForm.phoneNumber ? `${regForm.phoneCode} ${regForm.phoneNumber}` : null;
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: regForm.email,
          first_name: regForm.first_name,
          last_name: regForm.last_name,
          phone,
          address: regForm.address || null,
          city: regForm.city || null,
          postal_code: regForm.postal_code || null,
          country_code: regForm.country_code,
          country_name: regForm.country_name,
          date_of_birth: regForm.date_of_birth || null,
          gender: regForm.gender || null,
          role: "user",
        });

        if (isEventPage) {
          navigate(`/event/${slug}/register`);
        } else {
          navigate("/my-tickets");
        }
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account, then log in.",
        });
        setTab("login");
      }
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Login failed");

      if (!isEventPage) {
        navigate("/my-tickets");
        return;
      }

      const { data: attendee } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", event!.id)
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (attendee) {
        navigate(`/event/${slug}/dashboard`);
      } else {
        navigate(`/event/${slug}/register`);
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const updateReg = (field: string, value: string) => setRegForm(p => ({ ...p, [field]: value }));

  const content = (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto max-w-md">
        {/* Guest option for event pages */}
        {isEventPage && (
          <div className="mb-6 rounded-lg border border-border bg-card p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <UserCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Continue without an account</span>
            </div>
            <p className="text-xs text-muted-foreground">No registration required — provide your details at checkout</p>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/event/${slug}/register`)}>
              Continue as Guest →
            </Button>
          </div>
        )}

        <div className="relative mb-6 flex items-center">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-xs text-muted-foreground uppercase">or create an account</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Log In</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Your Account</CardTitle>
                <CardDescription>
                  {isEventPage ? `Sign up to register for ${event!.name}.` : "Create an account to manage your tickets."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="reg_first_name">First Name *</Label>
                      <Input id="reg_first_name" value={regForm.first_name} onChange={e => updateReg("first_name", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="reg_last_name">Last Name *</Label>
                      <Input id="reg_last_name" value={regForm.last_name} onChange={e => updateReg("last_name", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg_email">Email *</Label>
                    <Input id="reg_email" type="email" value={regForm.email} onChange={e => updateReg("email", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="reg_password">Password *</Label>
                    <Input id="reg_password" type="password" value={regForm.password} onChange={e => updateReg("password", e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>

                  {/* Phone with country code */}
                  <div>
                    <Label>Phone</Label>
                    <div className="flex gap-2">
                      <select
                        value={regForm.phoneCode}
                        onChange={e => updateReg("phoneCode", e.target.value)}
                        className="w-28 border border-input rounded-md px-2 py-2 text-sm bg-background text-foreground"
                      >
                        {PHONE_CODES.map(pc => (
                          <option key={pc.code} value={pc.code}>{pc.code} {pc.country}</option>
                        ))}
                      </select>
                      <Input
                        value={regForm.phoneNumber}
                        onChange={e => updateReg("phoneNumber", e.target.value)}
                        placeholder="91 234 5678"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Collapsible Additional Info */}
                  <Collapsible open={additionalOpen} onOpenChange={setAdditionalOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                      <ChevronDown className={`h-4 w-4 transition-transform ${additionalOpen ? "rotate-180" : ""}`} />
                      Additional Info (optional)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div>
                        <Label>Address</Label>
                        <Input value={regForm.address} onChange={e => updateReg("address", e.target.value)} placeholder="Street and number" />
                      </div>
                      <div className="grid gap-3 grid-cols-2">
                        <div>
                          <Label>City</Label>
                          <Input value={regForm.city} onChange={e => updateReg("city", e.target.value)} placeholder="City" />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input value={regForm.postal_code} onChange={e => updateReg("postal_code", e.target.value)} placeholder="ZIP" />
                        </div>
                      </div>
                      <div>
                        <Label>Country</Label>
                        <select
                          value={regForm.country_code}
                          onChange={e => {
                            const c = COUNTRIES_LIST.find(x => x.code === e.target.value);
                            updateReg("country_code", e.target.value);
                            updateReg("country_name", c?.name ?? e.target.value);
                          }}
                          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
                        >
                          {COUNTRIES_LIST.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <Input type="date" value={regForm.date_of_birth} onChange={e => updateReg("date_of_birth", e.target.value)} />
                      </div>
                      <div>
                        <Label>Gender</Label>
                        <select
                          value={regForm.gender}
                          onChange={e => updateReg("gender", e.target.value)}
                          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
                        >
                          {GENDER_OPTIONS.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {submitting ? "Creating Account..." : "Sign Up"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  {isEventPage ? `Log in to access your ticket for ${event!.name}.` : "Log in to view your tickets."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login_email">Email</Label>
                    <Input id="login_email" type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="login_password">Password</Label>
                    <Input id="login_password" type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
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
  );

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader showBackToEvents={isEventPage} />
      {content}
    </div>
  );
}
