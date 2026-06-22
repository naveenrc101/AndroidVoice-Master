import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneCall, PhoneOff, Smartphone, Bluetooth, Wifi, Battery, 
  Sparkles, ShieldCheck, Activity, Terminal, AlertCircle, Info, Mic, MicOff 
} from 'lucide-react';
import { CallState, DeviceInfo, SystemLog, AppConfig } from '../types';

interface PhoneEmulatorProps {
  isServiceRunning: boolean;
  onToggleService: (running: boolean) => void;
  callState: CallState;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  devices: DeviceInfo[];
  logs: SystemLog[];
  config: AppConfig;
  isListeningRealMic: boolean;
  onToggleRealMic: () => void;
  speechSupport: boolean;
}

export const PhoneEmulator: React.FC<PhoneEmulatorProps> = ({
  isServiceRunning,
  onToggleService,
  callState,
  onAcceptCall,
  onRejectCall,
  devices,
  logs,
  config,
  isListeningRealMic,
  onToggleRealMic,
  speechSupport,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const activeDevice = devices.find(d => d.isConnected && d.type === 'BLE_HEADSET' || d.type === 'BLUETOOTH_SCO');

  // Auto scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Determine tag badges
  const getTagColor = (tag: string, level: string) => {
    if (level === 'E') return 'text-red-400 bg-red-950/40 border border-red-800/30';
    if (level === 'W') return 'text-amber-400 bg-amber-950/40 border border-amber-800/30';
    switch (tag) {
      case 'AudioManager': return 'text-blue-400 bg-blue-950/40 border border-blue-900/30';
      case 'SpeechRecognizer': return 'text-purple-400 bg-purple-950/40 border border-purple-900/30';
      case 'TelecomManager': return 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30';
      default: return 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/30';
    }
  };

  return (
    <div id="phone-emulator-container" className="flex flex-col items-center">
      {/* Smartphone Outer Shield */}
      <div className="relative w-[345px] h-[700px] bg-[#16191E] rounded-[48px] border-8 border-[#2D3139] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ring-1 ring-[#2D3139]">
        
        {/* Dynamic Island / Hardware Punchhole */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center px-4">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-auto"></div>
          {isServiceRunning && (
            <div className="flex gap-1 items-center animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-tight uppercase">M-SVC</span>
            </div>
          )}
        </div>

        {/* Smartphone Status Bar */}
        <div className="bg-black pt-9 px-6 pb-2 flex justify-between items-center text-xs text-neutral-400 font-mono select-none z-40 shrink-0">
          <span className="font-semibold text-[11px] leading-none">12:30</span>
          
          <div className="flex items-center gap-2">
            {activeDevice ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-0.5 text-cyan-400"
                title={`${activeDevice.name} Connected`}
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase">BLE</span>
              </motion.div>
            ) : (
              <Bluetooth className="w-3.5 h-3.5 text-neutral-600" />
            )}
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Interactive Screen Area */}
        <div className="flex-1 bg-[#0F1115] p-5 flex flex-col relative overflow-hidden select-none">
          
          {/* Header Title & App Name */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">API LEVEL 36</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans mt-0.5">VoiceCallBouncer</h1>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 bg-[#16191E] border border-[#2D3139] rounded-full px-2.5 py-1">
              <div className={`w-2 h-2 rounded-full ${isServiceRunning ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-mono text-neutral-300 uppercase">
                {isServiceRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          {/* Jetpack Compose UI Simulation Mock Container */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-16">
            
            {/* Card Widget: Service Control Switch */}
            <div className="bg-[#16191E] rounded-2xl p-4 border border-[#2D3139] shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <h3 className="text-sm font-semibold text-white tracking-wide">Assistant Service</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {isServiceRunning 
                      ? 'Actively routing audio to Bluetooth/BLE headset' 
                      : 'Idle. Background triggers locked.'}
                  </p>
                </div>
                
                {/* Switch Button */}
                <button
                  id="compose-switch-button"
                  onClick={() => onToggleService(!isServiceRunning)}
                  className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ring-1 ${isServiceRunning ? 'bg-cyan-500 ring-cyan-400/30' : 'bg-[#2D3139] ring-transparent'}`}
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center"
                    style={{ left: isServiceRunning ? '24px' : '4px' }}
                  />
                </button>
              </div>

              {/* Offline Voice Engine Details */}
              {isServiceRunning && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-[#2D3139] text-[10.5px] text-cyan-400/90 font-mono flex items-center justify-between"
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>State: OFFLINE LOCK</span>
                  </div>
                  <div>Sensitivity: {config.sensitivity}%</div>
                </motion.div>
              )}
            </div>

            {/* Earphone Hookup Overlay Display */}
            <div className="bg-[#16191E]/60 rounded-2xl p-3 border border-[#2D3139]/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                  <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
                  Headset Input
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/30">
                  {activeDevice ? 'BLE Active' : 'No Headset'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                {activeDevice 
                  ? `[DEVICE] ${activeDevice.name} (${activeDevice.type})` 
                  : 'System fallbacks to phone speaker. Plug headset below to route.'}
              </p>
            </div>

            {/* Real Web Sound Interaction & Waveform */}
            {isServiceRunning && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#16191E]/40 rounded-2xl p-3.5 border border-purple-900/30 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span className="text-xs font-semibold text-purple-300">Live Speech Wave</span>
                  </div>
                  
                  {speechSupport && (
                    <button
                      id="real-speech-toggle"
                      onClick={onToggleRealMic}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                        isListeningRealMic 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-purple-950/40 text-purple-400 border border-purple-800/30 hover:bg-purple-900/20'
                      }`}
                      title={isListeningRealMic ? "Stop browser microphone" : "Talk using browser microphone"}
                    >
                      {isListeningRealMic ? <Mic className="w-3 h-3 animate-pulse" /> : <MicOff className="w-3 h-3" />}
                      {isListeningRealMic ? 'MIC ON' : 'TEST MIC'}
                    </button>
                  )}
                </div>

                {isListeningRealMic && (
                  <p className="text-[9.5px] text-rose-300 mb-1 leading-normal">
                    🔥 Browser mic listening! Please speak standard commands: <strong>"answer"</strong> or <strong>"reject"</strong> now!
                  </p>
                )}

                {/* Simulated Audio Bars */}
                <div className="h-6 flex items-end justify-center gap-1 w-full bg-black/40 rounded-lg p-1 overflow-hidden">
                  {[...Array(15)].map((_, i) => {
                    // Random amplitude factor for sound visualization
                    const randomDelay = Math.random() * 0.4;
                    const randomDuration = 0.5 + Math.random() * 0.7;
                    return (
                      <motion.div
                        key={i}
                        animate={isServiceRunning ? {
                          height: isListeningRealMic ? ['20%', '85%', '30%', '98%', '15%', '60%', '20%'] : ['10%', '40%', '15%', '55%', '10%']
                        } : { height: '10%' }}
                        transition={{
                          repeat: Infinity,
                          repeatType: 'reverse',
                          duration: randomDuration,
                          delay: randomDelay,
                          ease: 'easeInOut'
                        }}
                        className={`w-1 rounded-full ${isListeningRealMic ? 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]' : 'bg-cyan-500/60'}`}
                      />
                    );
                  })}
                </div>
                
                <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                  <span>FREQ: 8-16kHz</span>
                  <span>ENCODER: SPEEX/AMR</span>
                  <span>PREFER_OFFLINE=ON</span>
                </div>
              </motion.div>
            )}

            {/* Android Monospace Terminal Console Logs Inside Jetpack Compose */}
            <div className="bg-[#0A0B0E]/90 rounded-2xl p-3 border border-[#2D3139] flex flex-col flex-1 min-h-[140px] shadow-inner">
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#2D3139]">
                <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Jetpack UI Logs</span>
                <span className="ml-auto text-[8px] px-1 bg-[#2D3139] rounded text-neutral-500">API 36</span>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[9px] leading-tight space-y-1.5 max-h-[180px]">
                {logs.length === 0 ? (
                  <div className="text-neutral-600 italic">No phone logs captured yet. Toggle the switch or request a call.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-1 items-start">
                      <span className="text-[8px] text-neutral-600 shrink-0">{log.timestamp}</span>
                      <span className={`px-0.5 rounded font-bold text-[7px] leading-none py-0.5 uppercase shrink-0 ${getTagColor(log.tag, log.level)}`}>
                        {log.tag}
                      </span>
                      <span className={`break-all ${log.level === 'E' ? 'text-red-400' : log.level === 'W' ? 'text-amber-400' : 'text-neutral-300'}`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

          </div>

          {/* TELEPHONE RINGING FULL-SCREEN INTERACTIVE OVERLAY */}
          <AnimatePresence>
            {callState.isRinging && (
              <motion.div
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 200 }}
                className="absolute inset-x-0 bottom-0 top-[60px] bg-[#0F1115]/95 backdrop-blur-md rounded-t-[36px] p-6 flex flex-col justify-between border-t border-[#2D3139] z-50 text-white shadow-[0_-20px_50px_rgba(0,0,0,0.9)]"
              >
                {/* Simulated Notification / Banner */}
                <div className="flex flex-col items-center mt-10 text-center">
                  <div className="w-20 h-20 bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 rounded-full flex items-center justify-center mt-6 animate-pulse shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <PhoneCall className="w-10 h-10" />
                  </div>
                  
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mt-6 font-mono">
                    🚨 INCOMING TELECOM SIGNAL
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1 select-text">
                    {callState.callerName}
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 select-text">
                    {callState.callerNumber}
                  </p>
                  
                  {isServiceRunning && (
                    <motion.div 
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="mt-8 bg-[#16191E] border border-[#2D3139] rounded-full px-4 py-2 flex items-center gap-2 max-w-xs"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="text-[9.5px] font-semibold text-cyan-300 text-left font-mono leading-tight">
                        Hands-Free Voice Lock On. Say {config.answerWords.map(w => `"${w}"`).join(' / ')} to Answer or {config.rejectWords.map(w => `"${w}"`).join(' / ')} to Reject.
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Control Action Buttons (Manual override + Simulated Speak prompt) */}
                <div className="flex flex-col gap-3 mb-8">
                  {/* Speech command helper buttons */}
                  {isServiceRunning && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        id="btn-speak-answer"
                        onClick={onAcceptCall}
                        className="py-1.5 px-3 bg-cyan-900/30 border border-cyan-800/40 text-cyan-300 font-bold font-mono text-[10px] rounded-xl hover:bg-cyan-900/60 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <Mic className="w-3 h-3" /> Speak "{config.answerWords[0].toUpperCase()}"
                      </button>
                      <button
                        id="btn-speak-reject"
                        onClick={onRejectCall}
                        className="py-1.5 px-3 bg-red-950/30 border border-red-900/40 text-red-300 font-bold font-mono text-[10px] rounded-xl hover:bg-red-950/60 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <Mic className="w-3 h-3" /> Speak "{config.rejectWords[0].toUpperCase()}"
                      </button>
                    </div>
                  )}

                  <div className="h-px bg-[#2D3139] my-1"></div>

                  <div className="flex justify-around items-center">
                    {/* Rejection trigger */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        id="btn-manual-reject"
                        onClick={onRejectCall}
                        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 shadow-lg shadow-red-900/40 transition-all flex items-center justify-center text-white"
                        title="Manual Decline (Red button)"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </button>
                      <span className="text-[10px] font-semibold text-neutral-400">Decline</span>
                    </div>

                    {/* Accept trigger */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        id="btn-manual-accept"
                        onClick={onAcceptCall}
                        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center text-white animate-bounce"
                        title="Manual Accept (Green button)"
                      >
                        <PhoneCall className="w-6 h-6" />
                      </button>
                      <span className="text-[10px] font-semibold text-neutral-400">Accept</span>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Connected Call State overlay screen */}
          <AnimatePresence>
            {!callState.isRinging && (callState.status === 'accepted' || callState.status === 'active') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-0 top-[60px] bg-[#0F1115] rounded-t-[36px] p-6 flex flex-col justify-between border-t border-[#2D3139] z-50 text-white text-center"
              >
                <div className="flex flex-col items-center mt-12">
                  <div className="ring-4 ring-emerald-500/30 p-1 rounded-full">
                    <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <PhoneCall className="w-9 h-9" />
                    </div>
                  </div>
                  
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mt-6 font-mono">
                    ☎️ ACTIVE CONNECTED CALL
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">
                    {callState.callerName}
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 mb-10">
                    Routing: {activeDevice ? activeDevice.name : "Device Speaker Phone"}
                  </p>

                  {/* Audio Call Duration timer mock */}
                  <div className="bg-[#16191E]/80 border border-[#2D3139] rounded-2xl py-3 px-6 text-sm font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span>Elapsed: 00:04</span>
                  </div>
                </div>

                <div className="flex flex-col items-center mb-12">
                  <button
                    id="btn-active-hangup"
                    onClick={onRejectCall} // Same as calling endCall/reject
                    className="w-[180px] py-3 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-bold rounded-full shadow-lg flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" /> Hang Up
                  </button>
                  <span className="text-[9px] text-neutral-500 font-mono mt-2">Ends telecom audio hardware channel</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Android Navigation Pill on the very bottom */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#2D3139] rounded-full z-45"></div>

        </div>
      </div>
    </div>
  );
};
