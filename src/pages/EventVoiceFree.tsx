import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '@/integrations/supabase/client';
import { ConvwayoHeader } from '@/components/ConvwayoHeader';
import { Button } from '@/components/ui/button';
import { Headphones } from 'lucide-react';

// AZ mNSCLC MasterClass - besplatan event, BEZ logina. IZOLIRANA stranica -
// NAMJERNO ne dijeli logiku s EventVoice.tsx (koji je za placene evente i zahtijeva login).
// Poziva voice-init-session-az (edge funkcija hardkodirana na AZ event, ne treba event_slug param).

type CallStatus = 'connecting' | 'active' | 'ended' | 'error';

const AZ_SLUG = 'az-ususret-novoj-eri-testiranja-biomarkera-u-mnsclc';

export default function EventVoiceFree() {
  const navigate = useNavigate();

  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [agentTalking, setAgentTalking] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientRef = useRef<RetellWebClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCallStatus('connecting');
    run();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clientRef.current?.stopCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-init-session-az', {
        body: {},
      });

      if (error || !data?.access_token) {
        setErrorMsg('Greška pri spajanju. Pokušajte ponovo.');
        setCallStatus('error');
        return;
      }

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
        setErrorMsg('Greška pri spajanju. Pokušajte ponovo.');
        setCallStatus('error');
        if (timerRef.current) clearInterval(timerRef.current);
      });

      await client.startCall({ accessToken: data.access_token });
    } catch {
      setErrorMsg('Greška pri spajanju. Pokušajte ponovo.');
      setCallStatus('error');
    }
  };

  const endCall = () => {
    clientRef.current?.stopCall();
    if (timerRef.current) clearInterval(timerRef.current);
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
    if (callStatus === 'connecting') {
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
    if (callStatus === 'connecting') return 'Spajanje...';
    if (callStatus === 'active') return agentTalking ? 'Agent govori...' : 'Slušam...';
    if (callStatus === 'ended') return 'Poziv završen';
    if (callStatus === 'error') return errorMsg || 'Greška pri spajanju.';
    return '';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <ConvwayoHeader />

      <div style={{ padding: '16px 24px' }}>
        <button
          onClick={() => navigate(`/event/${AZ_SLUG}`)}
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
          ← Natrag na event
        </button>
      </div>

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

        <div style={getOrbStyle()}>
          <Headphones size={48} color="white" style={{ opacity: 0.9 }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{getStatusText()}</p>
          {callStatus === 'active' && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{formatTime(callSeconds)}</p>
          )}
        </div>

        {(callStatus === 'active' || callStatus === 'connecting') && (
          <Button onClick={endCall} style={{ width: '100%', background: 'rgba(239,68,68,0.9)', color: 'white' }}>
            Završi poziv
          </Button>
        )}

        {callStatus === 'error' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button onClick={run} style={{ width: '100%', background: '#6366f1', color: 'white' }}>
              Pokušaj ponovo
            </Button>
            <Button
              onClick={() => navigate(`/event/${AZ_SLUG}`)}
              variant="ghost"
              style={{ color: 'rgba(255,255,255,0.4)', width: '100%' }}
            >
              Natrag na event
            </Button>
          </div>
        )}

        {callStatus === 'ended' && (
          <Button
            onClick={() => navigate(`/event/${AZ_SLUG}`)}
            variant="ghost"
            style={{ color: 'rgba(255,255,255,0.4)', width: '100%', marginTop: 8 }}
          >
            Natrag na event
          </Button>
        )}
      </div>
    </div>
  );
}
