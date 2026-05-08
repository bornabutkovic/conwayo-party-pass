import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ConvwayoHeader } from '@/components/ConvwayoHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headphones, PhoneOff } from 'lucide-react';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended';

const orbStyle: React.CSSProperties = {
  width: 180,
  height: 180,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 30% 30%, #6366f1 0%, #8b5cf6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function EventVoice() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [agentTalking, setAgentTalking] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const formatTime = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/event/${slug}`);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      setCallStatus('connecting');
      try {
        const { data, error } = await supabase.functions.invoke('voice-init-session', {
          body: { event_slug: slug, profile_id: user.id, lang },
        });
        if (error || !data?.access_token) {
          setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
          setCallStatus('ended');
          return;
        }
        const sessionId = data.session_id as string | undefined;

        const client = new RetellWebClient();
        clientRef.current = client;

        client.on('call_started', () => {
          setCallStatus('active');
          setCallSeconds(0);
          timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
        });
        client.on('agent_start_talking', () => setAgentTalking(true));
        client.on('agent_stop_talking', () => setAgentTalking(false));
        client.on('call_ended', async () => {
          setCallStatus('ended');
          setAgentTalking(false);
          if (timerRef.current) clearInterval(timerRef.current);
          await new Promise((r) => setTimeout(r, 2000));
          if (sessionId) {
            const { data: sd } = await (supabase as any)
              .from('voice_session')
              .select('payment_url')
              .eq('id', sessionId)
              .single();
            if (sd?.payment_url) setPaymentUrl(sd.payment_url);
          }
        });
        client.on('error', () => {
          setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
          setCallStatus('ended');
          if (timerRef.current) clearInterval(timerRef.current);
        });

        await client.startCall({ accessToken: data.access_token });
      } catch {
        setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
        setCallStatus('ended');
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        clientRef.current?.stopCall();
      } catch {
        // noop
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, slug, lang]);

  const endCall = () => {
    try {
      clientRef.current?.stopCall();
    } catch {
      // noop
    }
  };

  const statusText = (() => {
    if (errorMsg) return errorMsg;
    if (callStatus === 'idle') return lang === 'en' ? 'Preparing call...' : 'Pripremam poziv...';
    if (callStatus === 'connecting') return lang === 'en' ? 'Connecting...' : 'Spajanje...';
    if (callStatus === 'active') {
      if (agentTalking) return lang === 'en' ? 'Agent is speaking...' : 'Agent govori...';
      return lang === 'en' ? 'Listening...' : 'Slušam...';
    }
    return lang === 'en' ? 'Call ended' : 'Poziv završen';
  })();

  // Orb dynamic styles
  const orbAnimation = (() => {
    if (callStatus === 'connecting') return 'voiceOrbSlow 1.5s ease-in-out infinite';
    if (callStatus === 'active' && agentTalking) return 'voiceOrbFast 0.6s ease-in-out infinite';
    if (callStatus === 'active') return 'voiceOrbCalm 2s ease-in-out infinite';
    return 'none';
  })();
  const orbShadow = (() => {
    if (callStatus === 'active' && agentTalking) return '0 0 60px rgba(99,102,241,0.6)';
    if (callStatus === 'ended') return '0 0 20px rgba(99,102,241,0.15)';
    return '0 0 40px rgba(99,102,241,0.3)';
  })();
  const orbOpacity = callStatus === 'ended' ? 0.5 : 1;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      <style>{`
        @keyframes voiceOrbSlow { 0%,100% { transform: scale(0.95); } 50% { transform: scale(1.05); } }
        @keyframes voiceOrbFast { 0%,100% { transform: scale(0.92); } 50% { transform: scale(1.08); } }
        @keyframes voiceOrbCalm { 0%,100% { transform: scale(0.97); } 50% { transform: scale(1.03); } }
      `}</style>

      <ConvwayoHeader />

      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(`/event/${slug}`)}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          aria-label={lang === 'en' ? 'Back' : 'Natrag'}
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === 'en' ? 'Back' : 'Natrag'}
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div
          style={{
            ...orbStyle,
            boxShadow: orbShadow,
            opacity: orbOpacity,
            animation: orbAnimation,
          }}
        >
          <Headphones size={48} color="#ffffff" />
        </div>

        <p className="mt-10 text-base text-white/60 text-center min-h-[1.5rem]">
          {statusText}
        </p>

        {callStatus === 'active' && (
          <p className="mt-2 text-2xl font-mono text-white tabular-nums">{formatTime(callSeconds)}</p>
        )}

        {(callStatus === 'connecting' || callStatus === 'active') && (
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="mt-8 rounded-full gap-2 px-8"
          >
            <PhoneOff className="h-4 w-4" />
            {lang === 'en' ? 'End call' : 'Završi poziv'}
          </Button>
        )}

        {callStatus === 'ended' && (
          <div className="mt-10 w-full max-w-[320px] flex flex-col items-center gap-4">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {lang === 'en' ? 'Pay by card' : 'Plati karticom'}
              </a>
            ) : (
              !errorMsg && (
                <p className="text-sm text-white/60 text-center">
                  {lang === 'en'
                    ? 'Registration complete. Confirmation and payment instructions will arrive by email.'
                    : 'Registracija završena. Potvrda i uputa za plaćanje stižu na email.'}
                </p>
              )
            )}
            <Button
              variant="outline"
              className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate(`/event/${slug}`)}
            >
              {lang === 'en' ? 'Back to event' : 'Natrag na event'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
