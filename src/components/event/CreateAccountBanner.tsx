import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Bookmark, ShoppingBag } from "lucide-react";

interface CreateAccountBannerProps {
  attendeeId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function CreateAccountBanner({ attendeeId, email, firstName, lastName }: CreateAccountBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // Link the attendee to the new profile
      if (data.user) {
        await supabase
          .from("attendees")
          .update({ profile_id: data.user.id })
          .eq("id", attendeeId);
      }

      setDone(true);
      toast({
        title: "Account created!",
        description: "Check your email to confirm, then log in to access your dashboard.",
      });
    } catch (err: any) {
      toast({ title: "Failed to create account", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4 text-center">
          <p className="text-sm font-medium text-foreground">
            ✓ Account created! Check your email to confirm.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!expanded) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Save Your Ticket</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Create an account to access your ticket anytime, purchase additional services, and manage all your events in one place.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure access</span>
                <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> Saved tickets</span>
                <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Buy add-ons</span>
              </div>
              <Button size="sm" onClick={() => setExpanded(true)}>
                Create Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Create Your Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>
          <div>
            <Label htmlFor="create-password">Set a Password *</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {submitting ? "Creating..." : "Create Account"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
