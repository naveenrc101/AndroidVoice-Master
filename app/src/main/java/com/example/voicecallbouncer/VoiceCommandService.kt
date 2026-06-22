package com.example.voicecallbouncer

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.telecom.TelecomManager
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * VoiceCommandService - Android 16 (API 36) Scoped Background Voice Control Service.
 * Leverages on-device hardware Speech Recognition and BLE audio routing context.
 */
class VoiceCommandService : Service() {

    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var audioManager: AudioManager
    private lateinit var telecomManager: TelecomManager
    private lateinit var telephonyManager: TelephonyManager
    
    private var isPhoneRinging = false
    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "VoiceBouncerChannel"

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        setupTelephonyListener()
    }

    private fun setupTelephonyListener() {
        val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
            override fun onCallStateChanged(state: Int) {
                isPhoneRinging = (state == TelephonyManager.CALL_STATE_RINGING)
                if (isPhoneRinging) {
                    Log.d("VoiceCallBouncer", "Ringing Event Detected - Listening for voice commands")
                    routeToBluetoothEarphones()
                }
            }
        }
        telephonyManager.registerTelephonyCallback(mainExecutor, callback)
    }

    private fun initializeOfflineSpeechRecognizer() {
        // API 36/Android 16: Safe creation of on-device recognition engine
        if (SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
            Log.i("VoiceCallBouncer", "On-Device Neural Engine initialized for speech processing")
        } else {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            Log.w("VoiceCallBouncer", "Standard Speech Engine initiated (On-Device sandbox unavailable)")
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true) // Force total hardware offline mode
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1000)
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                matches?.forEach { command ->
                    processCommand(command.lowercase())
                }
                // Restart listening for 24/7 background continuous capture
                speechRecognizer.startListening(intent)
            }

            override fun onError(error: Int) {
                // Recover from timeout or audio channel lock and restart speech analyzer
                Handler(Looper.getMainLooper()).postDelayed({
                    speechRecognizer.startListening(intent)
                }, 1000)
            }
            
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {
                // Immediate wake-word detection for rapid execution
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let {
                    processCommand(it.lowercase())
                }
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        speechRecognizer.startListening(intent)
    }

    private fun processCommand(command: String) {
        if (!isPhoneRinging) return

        try {
            // Evaluated dynamic triggers from Android Architect Configurator
            if (command.contains("answer") || command.contains("accept")) {
                telecomManager.acceptRingingCall()
                Log.i("VoiceCallBouncer", "SUCCESS: Ringing call accepted hands-free via spoken cue '$" + "command'")
                isPhoneRinging = false
            } else if (command.contains("reject") || command.contains("decline")) {
                telecomManager.endCall()
                Log.i("VoiceCallBouncer", "SUCCESS: Ringing call rejected/bounced hands-free via spoken cue '$" + "command'")
                isPhoneRinging = false
            }
        } catch (e: SecurityException) {
            Log.e("VoiceCallBouncer", "Android 16 Security Exception: Missing ANSWER_PHONE_CALLS: " + e.message)
        }
    }

    /**
     * Modern Audio Device Routing using AudioManager API
     * Routes background speech input hardware to connected Bluetooth BLE headgear.
     */
    private fun routeToBluetoothEarphones() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val devices = audioManager.availableCommunicationDevices
                val bleDevice = devices.find {
                    it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                    it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                }
                bleDevice?.let {
                    audioManager.setCommunicationDevice(it)
                    Log.d("VoiceCallBouncer", "Routed audio to BLE device: ${it.productName}")
                } ?: Log.w("VoiceCallBouncer", "No BLE/SCO device found. Using built-in mic.")
            } else {
                // API 30 fallback: use legacy Bluetooth SCO
                audioManager.startBluetoothSco()
                audioManager.isBluetoothScoOn = true
                Log.d("VoiceCallBouncer", "Started Bluetooth SCO (legacy API 30 path)")
            }
        } catch (e: Exception) {
            Log.e("VoiceCallBouncer", "AudioManager error: " + e.message)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VoiceCallBouncer Dynamic Active")
            .setContentText("Listening hands-free via Bluetooth Earphones...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()

        // Must declare service type on API 29+ before accessing microphone
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        initializeOfflineSpeechRecognizer()
        routeToBluetoothEarphones()
        return START_STICKY
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, 
            "Voice Command Engine Channel", 
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Provides status and activation state for continuous call-bouncer logic."
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        speechRecognizer.destroy()
        Log.i("VoiceCallBouncer", "Service shut down. Voice listening stopped.")
        super.onDestroy()
    }
}