package com.example.voicecallbouncer

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.PowerManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.telecom.TelecomManager
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class VoiceCommandService : Service() {

    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var telecomManager: TelecomManager
    private lateinit var telephonyManager: TelephonyManager
    private var wakeLock: PowerManager.WakeLock? = null

    private var isPhoneRinging = false
    private var recognitionIntent: Intent? = null
    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "VoxlyChannel"

    companion object {
        const val PREFS_NAME = "VoxlyPrefs"
        const val KEY_SERVICE_ENABLED = "service_enabled"
        var isRunning = false
    }

    override fun onCreate() {
        super.onCreate()
        telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Voxly::CallWakeLock"
        )
        setupTelephonyListener()
    }

    private fun setupTelephonyListener() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("Voxly", "READ_PHONE_STATE not granted — call detection disabled")
            return
        }
        try {
            val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    when (state) {
                        TelephonyManager.CALL_STATE_RINGING -> {
                            isPhoneRinging = true
                            // Acquire wake lock so CPU stays awake when screen is locked
                            if (wakeLock?.isHeld == false) {
                                wakeLock?.acquire(60_000L) // max 60s — enough for any ringing call
                            }
                            Log.d("Voxly", "Incoming call — starting voice recognition")
                            if (::speechRecognizer.isInitialized) {
                                recognitionIntent?.let { speechRecognizer.startListening(it) }
                            }
                        }
                        else -> {
                            if (isPhoneRinging) {
                                isPhoneRinging = false
                                if (wakeLock?.isHeld == true) wakeLock?.release()
                                if (::speechRecognizer.isInitialized) speechRecognizer.stopListening()
                                Log.d("Voxly", "Call ended — stopping voice recognition")
                            }
                        }
                    }
                }
            }
            telephonyManager.registerTelephonyCallback(mainExecutor, callback)
        } catch (e: SecurityException) {
            Log.e("Voxly", "Failed to register telephony callback: ${e.message}")
        }
    }

    private fun initializeOfflineSpeechRecognizer() {
        // Destroy any existing recognizer before creating a new one
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.destroy()
        }
        if (SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
            Log.i("Voxly", "On-Device Neural Engine initialized for speech processing")
        } else {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            Log.w("Voxly", "Standard Speech Engine initiated (On-Device sandbox unavailable)")
        }

        recognitionIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                matches?.forEach { command -> processCommand(command.lowercase()) }
                if (isPhoneRinging) speechRecognizer.startListening(recognitionIntent!!)
            }

            override fun onError(error: Int) {
                Log.w("Voxly", "Recognition error code: $error")
                if (isPhoneRinging) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isPhoneRinging) speechRecognizer.startListening(recognitionIntent!!)
                    }, 1000)
                }
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {
                if (isPhoneRinging) {
                    partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()?.let { processCommand(it.lowercase()) }
                }
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    private fun processCommand(command: String) {
        if (!isPhoneRinging) return

        try {
            if (command.contains("answer") || command.contains("accept")) {
                isPhoneRinging = false
                speechRecognizer.stopListening()
                if (wakeLock?.isHeld == true) wakeLock?.release()
                ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                    .startTone(ToneGenerator.TONE_PROP_ACK, 300)
                telecomManager.acceptRingingCall()
                Log.i("Voxly", "Call accepted via voice command: $command")
            } else if (command.contains("reject") || command.contains("decline")) {
                isPhoneRinging = false
                speechRecognizer.stopListening()
                if (wakeLock?.isHeld == true) wakeLock?.release()
                ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                    .startTone(ToneGenerator.TONE_PROP_NACK, 300)
                telecomManager.endCall()
                Log.i("Voxly", "Call rejected via voice command: $command")
            }
        } catch (e: SecurityException) {
            Log.e("Voxly", "Permission denied — ANSWER_PHONE_CALLS not granted: ${e.message}")
        } catch (e: Exception) {
            Log.e("Voxly", "Failed to handle call command: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Voxly")
            .setContentText("Ready — will listen when a call arrives")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        initializeOfflineSpeechRecognizer()
        isRunning = true
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_SERVICE_ENABLED, true).apply()
        return START_STICKY
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Voice Command Engine Channel",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Provides status for voice call bouncer."
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isRunning = false
        if (wakeLock?.isHeld == true) wakeLock?.release()
        if (::speechRecognizer.isInitialized) speechRecognizer.destroy()
        Log.i("Voxly", "Service shut down. Voice listening stopped.")
        super.onDestroy()
    }
}
