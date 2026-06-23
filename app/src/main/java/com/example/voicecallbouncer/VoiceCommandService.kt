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

    private var isPhoneRinging = false
    private var recognitionIntent: Intent? = null
    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "VoiceBouncerChannel"

    companion object {
        const val PREFS_NAME = "VoiceBouncerPrefs"
        const val KEY_SERVICE_ENABLED = "service_enabled"
        var isRunning = false
    }

    override fun onCreate() {
        super.onCreate()
        telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        setupTelephonyListener()
    }

    private fun setupTelephonyListener() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("VoiceCallBouncer", "READ_PHONE_STATE not granted — call detection disabled")
            return
        }
        try {
            val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    when (state) {
                        TelephonyManager.CALL_STATE_RINGING -> {
                            isPhoneRinging = true
                            Log.d("VoiceCallBouncer", "Incoming call — starting voice recognition")
                            if (::speechRecognizer.isInitialized) {
                                recognitionIntent?.let { speechRecognizer.startListening(it) }
                            }
                        }
                        else -> {
                            if (isPhoneRinging) {
                                isPhoneRinging = false
                                if (::speechRecognizer.isInitialized) speechRecognizer.stopListening()
                                Log.d("VoiceCallBouncer", "Call ended — stopping voice recognition")
                            }
                        }
                    }
                }
            }
            telephonyManager.registerTelephonyCallback(mainExecutor, callback)
        } catch (e: SecurityException) {
            Log.e("VoiceCallBouncer", "Failed to register telephony callback: ${e.message}")
        }
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

        recognitionIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            // No minimum length — short words like "answer" must not be dropped
            // No EXTRA_PREFER_OFFLINE — allow cloud recognition for better accuracy
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                matches?.forEach { command -> processCommand(command.lowercase()) }
                // Keep listening only while the call is still ringing
                if (isPhoneRinging) speechRecognizer.startListening(recognitionIntent!!)
            }

            override fun onError(error: Int) {
                Log.w("VoiceCallBouncer", "Recognition error code: $error")
                if (isPhoneRinging) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        // Re-check isPhoneRinging — call may have ended during the delay
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
        // Do NOT startListening here — wait for an incoming call
    }

    private fun processCommand(command: String) {
        if (!isPhoneRinging) return

        try {
            // Evaluated dynamic triggers from Android Architect Configurator
            if (command.contains("answer") || command.contains("accept")) {
                isPhoneRinging = false
                speechRecognizer.stopListening()
                telecomManager.acceptRingingCall()
                Log.i("VoiceCallBouncer", "Call accepted via voice command: $command")
            } else if (command.contains("reject") || command.contains("decline")) {
                isPhoneRinging = false
                speechRecognizer.stopListening()
                telecomManager.endCall()
                Log.i("VoiceCallBouncer", "Call rejected via voice command: $command")
            }
        } catch (e: SecurityException) {
            Log.e("VoiceCallBouncer", "Permission denied — ANSWER_PHONE_CALLS not granted: ${e.message}")
        } catch (e: Exception) {
            Log.e("VoiceCallBouncer", "Failed to handle call command: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VoiceCallBouncer Dynamic Active")
            .setContentText("Ready — will listen when a call arrives")
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
        isRunning = true
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_SERVICE_ENABLED, true).apply()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // App was swiped from recents — restart service silently
        val restartIntent = Intent(applicationContext, VoiceCommandService::class.java)
        val pendingIntent = android.app.PendingIntent.getService(
            applicationContext, 1, restartIntent,
            android.app.PendingIntent.FLAG_ONE_SHOT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        alarmManager.set(
            android.app.AlarmManager.ELAPSED_REALTIME,
            android.os.SystemClock.elapsedRealtime() + 1000,
            pendingIntent
        )
        super.onTaskRemoved(rootIntent)
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
        isRunning = false
        if (::speechRecognizer.isInitialized) speechRecognizer.destroy()
        Log.i("VoiceCallBouncer", "Service shut down. Voice listening stopped.")
        super.onDestroy()
    }
}