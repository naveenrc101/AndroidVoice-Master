export interface CallState {
  isRinging: boolean;
  callerName: string;
  callerNumber: string;
  status: 'idle' | 'ringing' | 'active' | 'rejected' | 'accepted';
}

export interface DeviceInfo {
  id: string;
  name: string;
  isConnected: boolean;
  type: 'BLE_HEADSET' | 'BLUETOOTH_SCO' | 'BUILT_IN_SPEAKER' | 'WIRED_HEADPHONES';
}

export interface AppConfig {
  answerWords: string[];
  rejectWords: string[];
  isOfflineOnly: boolean;
  sensitivity: number; // 1-100
  ambientNoiseFilter: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string; // HH:mm:ss.SSS
  tag: 'App' | 'VoiceCommandService' | 'AudioManager' | 'TelecomManager' | 'SpeechRecognizer';
  level: 'D' | 'I' | 'W' | 'E'; // Debug, Info, Warn, Error
  message: string;
}
