import React, { useState } from 'react';
import { 
  PhoneCall, PhoneOff, Bluetooth, Mic, Plus, HelpCircle, 
  Sparkles, Radio, Check, Volume2, HardDrive, Smartphone, RefreshCw
} from 'lucide-react';
import { CallState, DeviceInfo, AppConfig } from '../types';

interface SimulationControlsProps {
  isServiceRunning: boolean;
  callState: CallState;
  onTriggerCall: (callerName: string, callerNumber: string) => void;
  onHangupCall: () => void;
  devices: DeviceInfo[];
  onToggleDevice: (deviceId: string) => void;
  config: AppConfig;
  onChangeConfig: (newConfig: AppConfig) => void;
  onSimulateVoiceCommand: (spokenText: string) => void;
  isListeningRealMic: boolean;
  onToggleRealMic: () => void;
  speechSupport: boolean;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isServiceRunning,
  callState,
  onTriggerCall,
  onHangupCall,
  devices,
  onToggleDevice,
  config,
  onChangeConfig,
  onSimulateVoiceCommand,
  isListeningRealMic,
  onToggleRealMic,
  speechSupport,
}) => {
  const [callerName, setCallerName] = useState('Dave (Recruiter)');
  const [callerNumber, setCallerNumber] = useState('+1 (555) 304-1629');

  const activeDevice = devices.find(d => d.isConnected && d.type === 'BLE_HEADSET' || d.type === 'BLUETOOTH_SCO');

  const presetCallers = [
    { name: 'Dave (Recruiter)', num: '+1 (555) 304-1629' },
    { name: 'Spam Likely', num: '+1 (800) 902-8344' },
    { name: 'Mom 👵', num: '+1 (201) 489-0122' },
  ];

  return (
    <div id="simulation-controls-panel" className="bg-[#16191E] rounded-3xl border border-[#2D3139] p-6 flex flex-col gap-6 shadow-xl text-white">
      
      {/* Simulation Controls Title */}
      <div className="flex items-center gap-3 border-b border-[#2D3139] pb-4">
        <div className="p-2.5 bg-[#0F1115] rounded-xl border border-[#2D3139] text-purple-400">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Interactive Simulation Laboratory</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Test real-time call answering logic and BLE device routing.</p>
        </div>
      </div>

      {/* Step 1: Simulated Telecom Signal Rigging */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider flex items-center justify-between">
          <span>STEP 1: Telecom Call Rigging</span>
          {callState.isRinging && <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded text-[8px] animate-pulse">INC_RNG</span>}
        </span>

        {callState.isRinging ? (
          <div className="p-4 bg-[#0F1115] rounded-2xl border border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <h4 className="text-sm font-bold">{callState.callerName}</h4>
                <p className="text-xs text-neutral-500 font-mono">{callState.callerNumber}</p>
              </div>
            </div>
            <button
              id="simulate-hangup-btn"
              onClick={onHangupCall}
              className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-xs text-white rounded-xl font-bold transition-all text-center flex items-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" /> Force Hangup
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono">Quick Ring:</span>
              <div className="flex flex-wrap gap-2">
                {presetCallers.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                       setCallerName(preset.name);
                       setCallerNumber(preset.num);
                    }}
                    className={`px-3 py-1 bg-[#0F1115] rounded-lg text-xs font-medium font-mono hover:bg-neutral-800 border transition-all ${
                      callerName === preset.name ? 'text-cyan-400 border-cyan-900 bg-cyan-950/20' : 'text-neutral-400 border-[#2D3139]'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Forms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold font-mono">Caller Name</label>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#2D3139] rounded-xl px-3 py-2 text-xs mt-1 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold font-mono">Telephone Number</label>
                <input
                  type="text"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#2D3139] rounded-xl px-3 py-2 text-xs mt-1 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>
            </div>

            <button
              id="simulate-ring-btn"
              onClick={() => onTriggerCall(callerName, callerNumber)}
              className="w-full mt-1.5 py-2.5 bg-cyan-950 border border-cyan-800 text-cyan-400 hover:bg-cyan-900 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-cyan-400 animate-bounce" /> Simulate Telecom Call Ringing
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Simulated Bluetooth Earphone Accessories */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider flex items-center justify-between">
          <span>STEP 2: Connect Bluetooth / BLE Earphones</span>
          <span className="text-[9px] text-neutral-500 font-mono">AudioManager Simulation</span>
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => onToggleDevice(device.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                device.isConnected 
                  ? 'bg-cyan-950/40 border-cyan-500/50 hover:bg-cyan-950/65' 
                  : 'bg-[#0F1115]/40 border-[#2D3139] hover:bg-[#0F1115]/80'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <BitcoinHeadsetTheme type={device.type} isConnected={device.isConnected} />
                  <div>
                    <h4 className="text-xs font-bold leading-snug">{device.name}</h4>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase mt-0.5">{device.type}</p>
                  </div>
                </div>
                
                {device.isConnected && (
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping absolute top-3 right-3 shrink-0" />
                )}
              </div>
              
              {/* Connected active tag on button background */}
              {device.isConnected && (
                <div className="absolute bottom-0 right-0 py-0.5 px-1 bg-cyan-900 border-l border-t border-cyan-800 text-[8px] font-mono font-black uppercase text-cyan-200">
                  ACTIVE ROUTING
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Simulated Spoken Trigger Commands */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">
          <span>STEP 3: Voice Command Simulator</span>
          <span className="text-[9px] text-neutral-500 font-mono">Speech Recognition Engine</span>
        </div>

        {isServiceRunning ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-400 leading-normal">
              Click preset triggers to simulate speaking to the Bluetooth microphone. The engine analyzes results in real-time.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Answer trigger presets */}
              {config.answerWords.map((word) => (
                <button
                  key={word}
                  onClick={() => onSimulateVoiceCommand(word)}
                  className="p-3.5 bg-[#0F1115] border border-[#2D3139] hover:border-emerald-500/30 hover:bg-emerald-950/10 rounded-xl transition-all font-mono text-center flex flex-col items-center gap-1 group active:scale-95"
                  title={`Simulate speaking "${word}"`}
                >
                  <Mic className="w-4 h-4 text-emerald-400 group-hover:animate-pulse" />
                  <span className="text-[10.5px] font-bold text-emerald-300">"{word}"</span>
                  <span className="text-[8px] text-neutral-500 uppercase mt-0.5">Answer Cue</span>
                </button>
              ))}

              {/* Reject trigger presets */}
              {config.rejectWords.map((word) => (
                <button
                  key={word}
                  onClick={() => onSimulateVoiceCommand(word)}
                  className="p-3.5 bg-[#0F1115] border border-[#2D3139] hover:border-red-500/30 hover:bg-red-950/10 rounded-xl transition-all font-mono text-center flex flex-col items-center gap-1 group active:scale-95"
                  title={`Simulate speaking "${word}"`}
                >
                  <Mic className="w-4 h-4 text-red-400 group-hover:animate-pulse" />
                  <span className="text-[10.5px] font-bold text-red-300 font-bold">"{word}"</span>
                  <span className="text-[8px] text-neutral-500 uppercase mt-0.5 font-bold">Reject Cue</span>
                </button>
              ))}

              {/* Random Noise Trigger */}
              <button
                onClick={() => onSimulateVoiceCommand('unrelated word like bananas')}
                className="p-3.5 bg-[#0F1115] border border-[#2D3139] hover:border-amber-500/20 hover:bg-amber-950/10 rounded-xl transition-all font-mono text-center flex flex-col items-center justify-center gap-1 active:scale-95"
                title="Simulate speaking unrelated words"
              >
                <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-[10.5px] font-bold text-amber-300">"bananas"</span>
                <span className="text-[8px] text-neutral-500 uppercase mt-0.5">Gibberish/Ignore</span>
              </button>
            </div>
            
            {/* Interactive speech support details */}
            <div className="p-3 bg-[#0A0B0E]/60 rounded-xl border border-[#2D3139] text-[10px] text-neutral-400 leading-normal flex items-center justify-between">
              <span>Speech recognition engine status: <strong className="text-emerald-400">Continuous Monitoring</strong></span>
              <span>Prefer Offline Mode: <strong className="text-cyan-400">Yes</strong></span>
            </div>
          </div>
        ) : (
          <div className="bg-[#0F1115] rounded-2xl p-6 border border-[#2D3139] text-center flex flex-col items-center gap-3">
            <Volume2 className="w-8 h-8 text-rose-500" />
            <div>
              <h4 className="text-sm font-bold text-white">Voice Command Service Offline</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto leading-normal">
                Due to Android 16 safety protections, background voice capture requires starting the Foreground service first.
              </p>
            </div>
            
            <p className="text-[11px] text-cyan-400 font-mono">
              💡 Please turn on the "Assistant Service" switch inside the phone emulator.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

// Sub-component wrapper for Bluetooth icons
const BitcoinHeadsetTheme: React.FC<{ type: string; isConnected: boolean }> = ({ type, isConnected }) => {
  const getStyle = () => {
    if (isConnected) return 'bg-cyan-950 text-cyan-400 border-cyan-800/60';
    return 'bg-[#0F1115] text-neutral-500 border border-[#2D3139]';
  };

  switch (type) {
    case 'BLE_HEADSET':
      return (
        <span className={`p-2 rounded-xl border text-center flex items-center justify-center ${getStyle()}`}>
          <Bluetooth className="w-4 h-4" />
        </span>
      );
    case 'BLUETOOTH_SCO':
      return (
        <span className={`p-2 rounded-xl border text-center flex items-center justify-center ${getStyle()}`}>
          <Bluetooth className="w-4 h-4" />
        </span>
      );
    default:
      return (
        <span className={`p-2 rounded-xl border text-center flex items-center justify-center ${getStyle()}`}>
          <Volume2 className="w-4 h-4" />
        </span>
      );
  }
};
