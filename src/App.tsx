import { useState, useEffect, useRef } from 'react';
import { PhoneEmulator } from './components/PhoneEmulator';
import { SimulationControls } from './components/SimulationControls';
import { ArchitectDashboard } from './components/ArchitectDashboard';
import { CallState, DeviceInfo, SystemLog, AppConfig } from './types';
import { 
  Heart, Bluetooth, ShieldAlert, Cpu, Sparkles, BookOpen, AlertTriangle, Check, Github, PhoneCall
} from 'lucide-react';

export default function App() {
  // Service Active State
  const [isServiceRunning, setIsServiceRunning] = useState<boolean>(true);
  
  // Call state machine
  const [callState, setCallState] = useState<CallState>({
    isRinging: false,
    callerName: 'Dave (Recruiter)',
    callerNumber: '+1 (555) 304-1629',
    status: 'idle',
  });

  // Master config
  const [config, setConfig] = useState<AppConfig>({
    answerWords: ['answer', 'accept'],
    rejectWords: ['reject', 'decline'],
    isOfflineOnly: true,
    sensitivity: 85,
    ambientNoiseFilter: true,
  });

  // Simulated hardware endpoints
  const [devices, setDevices] = useState<DeviceInfo[]>([
    { id: 'dev1', name: 'Sony LinkBuds S', isConnected: true, type: 'BLE_HEADSET' },
    { id: 'dev2', name: 'Galaxy Buds Pro', isConnected: false, type: 'BLUETOOTH_SCO' },
    { id: 'dev3', name: 'Internal Audio Speaker', isConnected: false, type: 'BUILT_IN_SPEAKER' },
  ]);

  // Scrolling logs
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Browser-based real microphone voice processing state
  const [isListeningRealMic, setIsListeningRealMic] = useState<boolean>(false);
  const [speechSupport, setSpeechSupport] = useState<boolean>(false);
  const speechRecognizerRef = useRef<any>(null);

  // Helper: Append formatted log line
  const addLog = (tag: SystemLog['tag'], level: SystemLog['level'], message: string) => {
    const now = new Date();
    const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
    const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
    
    setLogs((prev) => [
      ...prev,
      {
        id: `${now.getTime()}-${Math.random()}`,
        timestamp,
        tag,
        level,
        message,
      },
    ]);
  };

  // Seed initial architect startup logs
  useEffect(() => {
    addLog('App', 'I', 'VoiceCallBouncer dashboard initialized');
    addLog('App', 'I', 'Android 16 API Level 36 security policies loaded');
    addLog('VoiceCommandService', 'D', 'Service compiled with targetSdk=36. Handset ready.');
    
    if (isServiceRunning) {
      triggerServiceStartupLogs();
    } else {
      addLog('App', 'W', 'Foreground Service starting triggers are paused.');
    }

    // Check window speech support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupport(true);
      addLog('SpeechRecognizer', 'I', 'Web Speech API detected. Real speech testing is supported.');
    } else {
      addLog('SpeechRecognizer', 'W', 'Web Speech API is missing in this browser sandbox. Speech inputs will be mock only.');
    }
  }, []);

  // Handle automatic logs on Service toggle
  useEffect(() => {
    if (isServiceRunning) {
      triggerServiceStartupLogs();
    } else {
      addLog('VoiceCommandService', 'I', 'Service onDestroy() triggered. Halting audio loops.');
      addLog('AudioManager', 'I', 'Reverting communication routing back to system default speaker phone.');
      // turn off real mic if service turned off
      if (isListeningRealMic) {
        stopRealMicSpeech();
      }
    }
  }, [isServiceRunning]);

  const triggerServiceStartupLogs = () => {
    addLog('VoiceCommandService', 'I', 'startForegroundService() received. Raising prioritised thread.');
    addLog('VoiceCommandService', 'I', 'Promoting task stream to Foreground with category: MICROPHONE');
    addLog('VoiceCommandService', 'D', 'Created continuous notification channel ID: VoiceBouncerChannel');
    
    // Check connected headsets
    const connectedBLE = devices.find(d => d.isConnected && (d.type === 'BLE_HEADSET' || d.type === 'BLUETOOTH_SCO'));
    if (connectedBLE) {
      addLog('AudioManager', 'I', `Searching TYPE_BLE_HEADSET: Match found on product "${connectedBLE.name}"`);
      addLog('AudioManager', 'D', `Invoking audioManager.setCommunicationDevice(TYPE_BLE_HEADSET)`);
      addLog('AudioManager', 'I', `SUCCESS: Dynamic speech signal forced through ${connectedBLE.name} earphone hardware`);
    } else {
      addLog('AudioManager', 'W', 'WARNING: No BLE headset linked. Defaulting to internal primary speaker.');
    }

    addLog('SpeechRecognizer', 'I', 'Setting parameter: RECOGNITION_MODEL_OFFLINE = TRUE');
    addLog('SpeechRecognizer', 'I', 'SpeechRecognizer.createOnDeviceSpeechRecognizer() deployed safely.');
    addLog('SpeechRecognizer', 'D', 'Voice command wake words compiled: ' + config.answerWords.join(', ') + ' / ' + config.rejectWords.join(', '));
  };

  // Device connectors
  const handleToggleDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === deviceId) {
          const newState = !dev.isConnected;
          if (newState) {
            addLog('AudioManager', 'I', `Bluetooth earphone physically coupled: [${dev.name}]`);
            if (isServiceRunning) {
              addLog('AudioManager', 'D', `AudioManager routing update: Forcing setCommunicationDevice(${dev.type})`);
              addLog('AudioManager', 'I', `Voice audio streams successfully redirected to ${dev.name}`);
            }
          } else {
            addLog('AudioManager', 'W', `Bluetooth component unlinked: [${dev.name}]`);
            if (isServiceRunning) {
              addLog('AudioManager', 'W', 'WARNING: Communication device lost. Defaulting back to phone speaker.');
            }
          }
          return { ...dev, isConnected: newState };
        }
        // Unlink others if this is connected
        return { ...dev, isConnected: false };
      })
    );
  };

  // Incoming Call Handler
  const handleTriggerCall = (name: string, number: string) => {
    setCallState({
      isRinging: true,
      callerName: name,
      callerNumber: number,
      status: 'ringing',
    });

    addLog('TelecomManager', 'I', `Telephony broadcasts ACTION_PHONE_STATE_CHANGED -> CALL_STATE_RINGING`);
    addLog('TelecomManager', 'D', `Ringing stream: IDLE -> RINGING [Caller: ${name}]`);
    
    if (isServiceRunning) {
      addLog('SpeechRecognizer', 'I', 'Speech engine audio capture enabled. Continuous microphone queue bound.');
    } else {
      addLog('SpeechRecognizer', 'W', 'Mic service is dormant. Speech triggers will not answer call.');
    }
  };

  const handleHangupCall = () => {
    setCallState((prev) => ({
      ...prev,
      isRinging: false,
      status: 'idle',
    }));
    addLog('TelecomManager', 'I', `Telephony channel state transitioned -> IDLE`);
  };

  // Hands free execution controllers
  const acceptCall = () => {
    setCallState((prev) => ({
      ...prev,
      isRinging: false,
      status: 'accepted',
    }));
    addLog('TelecomManager', 'I', `SUCCESS: Speech Command processed: ACCEPTED`);
    addLog('TelecomManager', 'D', `TelecomManager.acceptRingingCall() invoked programmatically`);
    addLog('AudioManager', 'I', `Audio transmission established between VoIP caller and connected BLE earphones`);
  };

  const rejectCall = () => {
    setCallState((prev) => ({
      ...prev,
      isRinging: false,
      status: 'rejected',
    }));
    addLog('TelecomManager', 'I', `SUCCESS: Speech Command processed: REJECTED`);
    addLog('TelecomManager', 'D', `TelecomManager.endCall() bouncer signal processed`);
    addLog('TelecomManager', 'I', `Telephony channel dismissed back to IDLE`);
  };

  // Simulated Voice triggers from click actions in dashboard
  const handleSimulateVoiceCommand = (spokenText: string) => {
    if (!isServiceRunning) return;

    addLog('SpeechRecognizer', 'I', `Speech signal received: "${spokenText}"`);

    // Match keywords
    const isAnswer = config.answerWords.some(word => spokenText.toLowerCase().includes(word.toLowerCase()));
    const isReject = config.rejectWords.some(word => spokenText.toLowerCase().includes(word.toLowerCase()));

    if (callState.isRinging) {
      if (isAnswer) {
        addLog('SpeechRecognizer', 'I', `Match found on answer list. Passing intent to TelecomManager.`);
        acceptCall();
      } else if (isReject) {
        addLog('SpeechRecognizer', 'I', `Match found on reject list. Passing dismiss intent to TelecomManager.`);
        rejectCall();
      } else {
        addLog('SpeechRecognizer', 'W', `Spoken word "${spokenText}" matches no compiled wake-word triggers. Still listening.`);
      }
    } else {
      addLog('SpeechRecognizer', 'D', `Analyzed "${spokenText}" but call state is not ringing. Trigger action blocked.`);
    }
  };

  // Actual Browser Voice Controls
  const startRealMicSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onstart = () => {
        setIsListeningRealMic(true);
        addLog('SpeechRecognizer', 'I', 'REAL MICROPHONE DEPLOYED: Speak "answer" or "reject" aloud near computer!');
      };

      recognizer.onerror = (e: any) => {
        addLog('SpeechRecognizer', 'E', `Web Speech API error: ${e.error}`);
        setIsListeningRealMic(false);
      };

      recognizer.onend = () => {
        setIsListeningRealMic(false);
        addLog('SpeechRecognizer', 'I', 'Real speech capture ended.');
      };

      recognizer.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const candidateText = (finalTranscript || interimTranscript).trim().toLowerCase();
        if (candidateText) {
          // Log partial transcripts to make the feedback loop look spectacular
          addLog('SpeechRecognizer', 'D', `Real voice parsed: "${candidateText}"`);
          
          const isAnswer = config.answerWords.some(word => candidateText.includes(word));
          const isReject = config.rejectWords.some(word => candidateText.includes(word));

          if (isAnswer && callState.isRinging) {
            addLog('SpeechRecognizer', 'I', `Speech match trigger matched: ANSWER!`);
            acceptCall();
            recognizer.stop();
          } else if (isReject && callState.isRinging) {
            addLog('SpeechRecognizer', 'I', `Speech match trigger matched: REJECT!`);
            rejectCall();
            recognizer.stop();
          }
        }
      };

      speechRecognizerRef.current = recognizer;
      recognizer.start();
    } catch (e: any) {
      addLog('SpeechRecognizer', 'E', `Speech engine failed to boot: ${e.message}`);
    }
  };

  const stopRealMicSpeech = () => {
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (err) {}
      speechRecognizerRef.current = null;
    }
    setIsListeningRealMic(false);
    addLog('SpeechRecognizer', 'I', 'Real microphone stream cancelled.');
  };

  const handleToggleRealMic = () => {
    if (isListeningRealMic) {
      stopRealMicSpeech();
    } else {
      startRealMicSpeech();
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E5E7EB] flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation Bar from Elegant Dark Template */}
      <nav className="h-16 border-b border-[#2D3139] flex items-center justify-between px-6 sm:px-8 bg-[#16191E] shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <PhoneCall className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VoiceCallBouncer</span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">API 36 LAB</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">System Secure</span>
          </div>
          <div className="h-4 w-px bg-[#2D3139]"></div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Android 16 Build</span>
        </div>
      </nav>

      {/* Main Workspaces Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Highly-polished Phone Simulator View (Span 4) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center">
          <div className="sticky top-[80px] w-full max-w-[345px]">
            <PhoneEmulator
              isServiceRunning={isServiceRunning}
              onToggleService={setIsServiceRunning}
              callState={callState}
              onAcceptCall={acceptCall}
              onRejectCall={rejectCall}
              devices={devices}
              logs={logs}
              config={config}
              isListeningRealMic={isListeningRealMic}
              onToggleRealMic={handleToggleRealMic}
              speechSupport={speechSupport}
            />
            
            <div className="text-center mt-3 text-[10px] text-neutral-500 font-mono select-none">
              ℹ️ Use simulated calls or configure offline phrases to test hands-free actions.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Code Generator Dashboard + Simulation Control lab (Span 8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Simulation controller layout */}
          <SimulationControls
            isServiceRunning={isServiceRunning}
            callState={callState}
            onTriggerCall={handleTriggerCall}
            onHangupCall={handleHangupCall}
            devices={devices}
            onToggleDevice={handleToggleDevice}
            config={config}
            onChangeConfig={setConfig}
            onSimulateVoiceCommand={handleSimulateVoiceCommand}
            isListeningRealMic={isListeningRealMic}
            onToggleRealMic={handleToggleRealMic}
            speechSupport={speechSupport}
          />

          {/* Code workspace and Kotlin class creator tab */}
          <ArchitectDashboard
            config={config}
            onChangeConfig={setConfig}
            isServiceRunning={isServiceRunning}
          />

        </div>

      </main>

      {/* Bottom Legal Credits Footer */}
      <footer className="border-t border-[#2D3139] bg-[#08090C] py-6 text-center text-xs text-neutral-500 font-mono select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 justify-center">
            <span>Architected with dedicated</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
            <span>for targetSdk = 36 Sandbox</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-neutral-500">v1.1.2 Production Build</span>
            <span className="text-[#2D3139]">|</span>
            <span className="text-emerald-500 flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse"></span>
              CONTAINER PORT: 3000 HEALTHY
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
