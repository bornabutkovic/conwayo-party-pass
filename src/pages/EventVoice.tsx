import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { ConvwayoHeader } from '@/components/ConvwayoHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headphones, Lock, CheckCircle2 } from 'lucide-react';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

type UiRequest = {
  type?: string;
  status?: string;
  request_id?: string;
  attempts_left?: number;
  total_eur?: number | string;
  payment_url?: string;
  payment_method?: string;
} | null;

export default function EventVoice() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [agentTalking, setAgentTalking] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [uiRequest, setUiRequest] = useState<UiRequest>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStatusRef = useRef<CallStatus>('connecting');
  const endedAtRef = useRef<number | null>(null);

  useEffect(() => {
    setCallStatus('connecting');
    run();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clientRef.current?.stopCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    callStatusRef.current = callStatus;
    if (callStatus === 'ended') {
      if (!endedAtRef.current) endedAtRef.current = Date.now();
    } else {
      endedAtRef.current = null;
    }
  }, [callStatus]);

  // Watch voice_session.ui_request: realtime subscription + 1.5s polling fallback.
  // Polling continues for 2 minutes after the call ends so late payment/confirmation
  // requests still show, then stops.
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`voice-ui-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voice_session', filter: `id=eq.${sessionId}` },
        (payload) => setUiRequest((payload.new as { ui_request?: UiRequest })?.ui_request ?? null),
      )
      .subscribe();

    const interval = setInterval(async () => {
      if (
        callStatusRef.current === 'ended' &&
        endedAtRef.current &&
        Date.now() - endedAtRef.current > 120000
      ) {
        clearInterval(interval);
        return;
      }
      const { data } = await supabase
        .from('voice_session')
        .select('ui_request')
        .eq('id', sessionId)
        .maybeSingle();
      const next = (data as { ui_request?: UiRequest } | null)?.ui_request ?? null;
      setUiRequest((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sessionId]);

  const requestId = uiRequest?.request_id ?? null;
  useEffect(() => {
    setCodeInput('');
    setCodeMsg(null);
    setCodeBusy(false);
  }, [requestId]);

  const run = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setCallStatus('idle');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('voice-init-session', {
        body: { event_slug: slug, profile_id: session.user.id, lang: lang === 'en' ? 'en' : 'hr' },
      });

      if (error || !data?.access_token) {
        setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
        setCallStatus('error');
        return;
      }

      setSessionId(data.session_id);

      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => {
        setCallStatus('active');
        setCallSeconds(0);
        timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
      });

      client.on('agent_start_talking', () => setAgentTalking(true));
      client.on('agent_stop_talking', () => setAgentTalking(false));

      client.on('call_ended', () => {
        setCallStatus('ended');
        setAgentTalking(false);
        if (timerRef.current) clearInterval(timerRef.current);
      });

      client.on('error', () => {
        setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
        setCallStatus('error');
        if (timerRef.current) clearInterval(timerRef.current);
      });

      await client.startCall({
        accessToken: data.access_token,
        callId: data.call_id,
        transport: data.transport,
        iceServers: data.ice_servers,
      });
    } catch {
      setErrorMsg(lang === 'en' ? 'Connection error. Please try again.' : 'Greška pri spajanju. Pokušajte ponovo.');
      setCallStatus('error');
    }
  };

  const endCall = () => {
    clientRef.current?.stopCall();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const genericCodeError =
    lang === 'en'
      ? 'Something went wrong, tell the agent the code instead.'
      : 'Nešto nije u redu, recite kod agentu.';

  const applyCode = async () => {
    if (!sessionId || !uiRequest?.request_id || !codeInput.trim() || codeBusy) return;
    setCodeBusy(true);
    setCodeMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('voice-enter-code', {
        body: { session_id: sessionId, request_id: uiRequest.request_id, code: codeInput.trim() },
      });

      let payload: { ok?: boolean; message?: string; final?: boolean; error?: string } | null = data;
      if (error) {
        payload = null;
        try {
          payload = await (error as { context?: Response }).context?.json() ?? null;
        } catch {
          payload = null;
        }
        if (!payload) {
          setCodeMsg({ text: genericCodeError, ok: false });
          return;
        }
      }

      if (payload.ok === true) {
        setCodeMsg({ text: payload.message ?? '', ok: true });
        setTimeout(() => setUiRequest(null), 2000);
      } else {
        setCodeMsg({ text: payload.message ?? genericCodeError, ok: false });
        if (payload.final === true || payload.error === 'closed') {
          setTimeout(() => setUiRequest(null), 2000);
        }
      }
    } catch {
      setCodeMsg({ text: genericCodeError, ok: false });
    } finally {
      setCodeBusy(false);
    }
  };

  const cancelCode = async () => {
    if (!sessionId || !uiRequest?.request_id) return;
    try {
      await supabase.functions.invoke('voice-enter-code', {
        body: { session_id: sessionId, request_id: uiRequest.request_id, action: 'cancel' },
      });
    } catch {
      // ignore — panel hides regardless
    }
    setUiRequest(null);
  };

  const formatTime = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  const getOrbStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: 180,
      height: 180,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #818cf8, #6366f1, #4f46e5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'box-shadow 0.3s ease',
    };
    if (callStatus === 'idle' || callStatus === 'connecting') {
      return { ...base, boxShadow: '0 0 40px rgba(99,102,241,0.35)', animation: 'orbPulse 1.8s ease-in-out infinite' };
    }
    if (callStatus === 'active' && agentTalking) {
      return { ...base, boxShadow: '0 0 70px rgba(99,102,241,0.65)', animation: 'orbTalk 0.6s ease-in-out infinite' };
    }
    if (callStatus === 'active' && !agentTalking) {
      return { ...base, boxShadow: '0 0 40px rgba(99,102,241,0.35)', animation: 'orbPulse 2.2s ease-in-out infinite' };
    }
    if (callStatus === 'ended') {
      return { ...base, opacity: 0.45, boxShadow: 'none', animation: 'none' };
    }
    if (callStatus === 'error') {
      return {
        ...base,
        background: 'radial-gradient(circle at 40% 40%, #f87171, #ef4444)',
        boxShadow: '0 0 40px rgba(239,68,68,0.3)',
        animation: 'none',
      };
    }
    return base;
  };

  const getStatusText = () => {
    if (callStatus === 'idle') return lang === 'en' ? 'Preparing call...' : 'Pripremam poziv...';
    if (callStatus === 'connecting') return lang === 'en' ? 'Connecting...' : 'Spajanje...';
    if (callStatus === 'active') return agentTalking ? (lang === 'en' ? 'Agent speaking...' : 'Agent govori...') : (lang === 'en' ? 'Listening...' : 'Slušam...');
    if (callStatus === 'ended') return lang === 'en' ? 'Call ended' : 'Poziv završen';
    if (callStatus === 'error') return errorMsg || (lang === 'en' ? 'Connection error.' : 'Greška pri spajanju.');
    return '';
  };

  const panelStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 20,
  };

  const renderPanel = () => {
    if (!uiRequest) return null;

    if (uiRequest.type === 'discount_code' && uiRequest.status === 'open') {
      return (
        <div style={panelStyle}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0 }}>
            {lang === 'en' ? 'Enter your discount code' : 'Upišite kod za popust'}
          </p>
          {typeof uiRequest.attempts_left === 'number' && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
              {lang === 'en' ? `Attempts left: ${uiRequest.attempts_left}` : `Preostalo pokušaja: ${uiRequest.attempts_left}`}
            </p>
          )}
          <input
            autoFocus
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCode();
            }}
            style={{
              width: '100%',
              marginTop: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '10px 12px',
              color: 'white',
              textTransform: 'uppercase',
              fontSize: 15,
              letterSpacing: 1,
              outline: 'none',
            }}
          />
          {codeMsg && (
            <p style={{ fontSize: 13, color: codeMsg.ok ? '#4ade80' : '#f87171', marginTop: 8 }}>
              {codeMsg.text}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button
              onClick={applyCode}
              disabled={codeBusy}
              style={{ flex: 1, background: '#6366f1', color: 'white', fontWeight: 600, borderRadius: 10 }}
            >
              {lang === 'en' ? 'Apply' : 'Primijeni'}
            </Button>
            <Button
              onClick={cancelCode}
              variant="ghost"
              style={{ flex: 1, border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 10 }}
            >
              {lang === 'en' ? 'Cancel' : 'Odustani'}
            </Button>
          </div>
        </div>
      );
    }

    if (uiRequest.type === 'payment' && uiRequest.status === 'open') {
      return (
        <div style={panelStyle}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0 }}>
            {lang === 'en' ? 'Complete your payment' : 'Dovršite plaćanje'}
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'white', marginTop: 8 }}>
            {Number(uiRequest.total_eur).toFixed(2)} EUR
          </p>
          <Button
            onClick={() => {
              if (uiRequest.payment_url) window.open(uiRequest.payment_url, '_blank', 'noopener');
            }}
            style={{
              width: '100%',
              marginTop: 12,
              background: '#6366f1',
              color: 'white',
              fontWeight: 600,
              borderRadius: 10,
              padding: '22px 12px',
              fontSize: 16,
            }}
          >
            {lang === 'en' ? 'Pay now' : 'Plati sada'}
          </Button>
        </div>
      );
    }

    if (uiRequest.type === 'completed') {
      const isFree = uiRequest.payment_method === 'free';
      const isInvoice = uiRequest.payment_method === 'invoice';
      const text = isFree
        ? lang === 'en'
          ? 'Registration confirmed. Your ticket is on its way to your email.'
          : 'Prijava je potvrđena. Ulaznica vam stiže na e-mail.'
        : isInvoice
          ? lang === 'en'
            ? 'Registration confirmed. You will receive a quote by email.'
            : 'Prijava je potvrđena. Ponudu ćete dobiti e-mailom.'
          : lang === 'en'
            ? 'Registration confirmed.'
            : 'Prijava je potvrđena.';
      return (
        <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle2 size={28} color="#4ade80" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: 'white', margin: 0 }}>{text}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <ConvwayoHeader />

      {/* Back button */}
      <div style={{ padding: '16px 24px' }}>
        <button
          onClick={() => navigate(`/event/${slug}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.5)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} />
          {lang === 'en' ? 'Back to event' : 'Natrag na event'}
        </button>
      </div>

      {/* Not logged in screen */}
      {callStatus === 'idle' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            gap: 0,
          }}
        >
          {/* Static orb */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 40%, #818cf8, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
            }}
          >
            <Headphones size={48} color="white" style={{ opacity: 0.9 }} />
          </div>

          <Lock size={24} color="white" style={{ opacity: 0.4, marginTop: 16 }} />

          <p style={{ fontSize: 20, fontWeight: 600, color: 'white', textAlign: 'center', marginTop: 24 }}>
            {lang === 'en' ? 'Voice Registration' : 'Glasovna registracija'}
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center',
              maxWidth: 280,
              marginTop: 8,
            }}
          >
            {lang === 'en' ? 'To use the voice agent, please sign in or create a Conwayo account.' : 'Za korištenje glasovnog agenta potrebna je prijava ili registracija u Conwayo.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, maxWidth: 280, width: '100%' }}>
            <Button
              onClick={() => navigate(`/event/${slug}/auth?tab=login&redirect=/event/${slug}/voice`)}
              style={{
                width: '100%',
                background: '#6366f1',
                color: 'white',
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {lang === 'en' ? 'Sign in' : 'Prijavi se'}
            </Button>
            <Button
              onClick={() => navigate(`/event/${slug}/auth?tab=register&redirect=/event/${slug}/voice`)}
              variant="ghost"
              style={{
                width: '100%',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: 12,
              }}
            >
              {lang === 'en' ? 'Create account' : 'Registriraj se'}
            </Button>
          </div>
        </div>
      )}

      {/* Main content (logged in) */}
      {callStatus !== 'idle' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            gap: 32,
            maxWidth: 320,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <style>{`
            @keyframes orbPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
            @keyframes orbTalk {
              0%, 100% { transform: scale(0.93); }
              50% { transform: scale(1.07); }
            }
          `}</style>

          {/* Orb */}
          <div style={getOrbStyle()}>
            <Headphones size={48} color="white" style={{ opacity: 0.9 }} />
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{getStatusText()}</p>
            {callStatus === 'active' && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{formatTime(callSeconds)}</p>
            )}
          </div>

          {/* Voice agent UI request panel */}
          {renderPanel()}

          {/* Active/connecting: end call button */}
          {(callStatus === 'active' || callStatus === 'connecting') && (
            <Button
              onClick={endCall}
              style={{ width: '100%', background: 'rgba(239,68,68,0.9)', color: 'white' }}
            >
              {lang === 'en' ? 'End call' : 'Završi poziv'}
            </Button>
          )}

          {/* Error: retry */}
          {callStatus === 'error' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button onClick={run} style={{ width: '100%', background: '#6366f1', color: 'white' }}>
                {lang === 'en' ? 'Try again' : 'Pokušaj ponovo'}
              </Button>
              <Button
                onClick={() => navigate(`/event/${slug}`)}
                variant="ghost"
                style={{ color: 'rgba(255,255,255,0.4)', width: '100%' }}
              >
                {lang === 'en' ? 'Back to event' : 'Natrag na event'}
              </Button>
            </div>
          )}

          {/* Ended */}
          {callStatus === 'ended' && (
            <Button
              onClick={() => navigate(`/event/${slug}`)}
              variant="ghost"
              style={{ color: 'rgba(255,255,255,0.4)', width: '100%', marginTop: 8 }}
            >
              {lang === 'en' ? 'Back to event' : 'Natrag na event'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
