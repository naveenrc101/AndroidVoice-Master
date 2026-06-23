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

    private var speechRecognizer: SpeechRecognizer? = null
    private lateinit var telecomManager: TelecomManager
    private lateinit var telephonyManager: TelephonyManager
    private var wakeLock: PowerManager.WakeLock? = null

    private var isPhoneRinging = false
    private var retryCount = 0
    private val MAX_RETRIES = 15 // ~15 seconds of retries — covers speech service wake-up from deep idle
    // Held as a member so the GC cannot collect it after setupTelephonyListener() returns.
    // A collected callback silently stops receiving CALL_STATE_RINGING after 30+ min idle.
    private var telephonyCallback: TelephonyCallback? = null

    // Detects silent failures: if onReadyForSpeech hasn't fired within 3s of startListening(),
    // the speech service didn't respond (common after 30+ min idle). Triggers a retry.
    private val timeoutHandler = Handler(Looper.getMainLooper())
    private val RECOGNITION_TIMEOUT_MS = 3000L

    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "VoxlyChannel"

    companion object {
        const val PREFS_NAME = "VoxlyPrefs"
        const val KEY_SERVICE_ENABLED = "service_enabled"
        var isRunning = false
    }

    private val recognitionIntent by lazy {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            // Use cloud recognition — significantly more accurate in noisy environments.
            // On-device is faster but struggles with background noise.
        }
    }

    private val recognitionListener = object : RecognitionListener {
        override fun onResults(results: Bundle?) {
            retryCount = 0
            results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.forEach { processCommand(it.lowercase()) }
            if (isPhoneRinging) startVoiceRecognition()
        }

        override fun onError(error: Int) {
            timeoutHandler.removeCallbacksAndMessages(null)
            Log.w("Voxly", "Recognition error: $error — retry $retryCount/$MAX_RETRIES")
            if (!isPhoneRinging || retryCount >= MAX_RETRIES) return
            retryCount++
            val delay = when (error) {
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> 300L
                SpeechRecognizer.ERROR_AUDIO -> 1200L
                else -> 800L
            }
            Handler(Looper.getMainLooper()).postDelayed({
                if (isPhoneRinging) startVoiceRecognition()
            }, delay)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            if (isPhoneRinging) {
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.forEach { processCommand(it.lowercase()) }
            }
        }

        override fun onReadyForSpeech(params: Bundle?) {
            retryCount = 0
            timeoutHandler.removeCallbacksAndMessages(null)
        }
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    override fun onCreate() {
        super.onCreate()
        telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Voxly::CallWakeLock")
        setupTelephonyListener()
    }

    private fun setupTelephonyListener() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("Voxly", "READ_PHONE_STATE not granted — call detection disabled")
            return
        }
        try {
            telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    when (state) {
                        TelephonyManager.CALL_STATE_RINGING -> {
                            if (isPhoneRinging) return
                            isPhoneRinging = true
                            retryCount = 0
                            if (wakeLock?.isHeld == false) wakeLock?.acquire(60_000L)
                            Log.d("Voxly", "Incoming call — starting voice recognition")
                            startVoiceRecognition()
                        }
                        else -> {
                            if (isPhoneRinging) {
                                isPhoneRinging = false
                                retryCount = 0
                                if (wakeLock?.isHeld == true) wakeLock?.release()
                                destroyRecognizer()
                                Log.d("Voxly", "Call ended — stopped voice recognition")
                            }
                        }
                    }
                }
            }
            telephonyManager.registerTelephonyCallback(mainExecutor, telephonyCallback!!)
        } catch (e: SecurityException) {
            Log.e("Voxly", "Failed to register telephony callback: ${e.message}")
        }
    }

    /** Creates a fresh SpeechRecognizer and starts listening.
     *  Always creates fresh — avoids ERROR_RECOGNIZER_BUSY on Android 14/15.
     *  Called on every incoming call and on every error retry. */
    private fun startVoiceRecognition() {
        if (!isPhoneRinging) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("Voxly", "RECORD_AUDIO not granted")
            return
        }
        destroyRecognizer()
        // Always use the default (cloud-capable) recognizer — on-device requires loading a large
        // ML model which is evicted from memory after 30+ min Doze and causes silent startup hangs.
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(recognitionListener)
        speechRecognizer?.startListening(recognitionIntent)

        // Guard against silent failure — if onReadyForSpeech doesn't fire within 3s,
        // the speech service didn't respond (common after extended Doze idle). Retry.
        timeoutHandler.removeCallbacksAndMessages(null)
        timeoutHandler.postDelayed({
            if (isPhoneRinging && retryCount < MAX_RETRIES) {
                Log.w("Voxly", "Recognition timeout — no response from service, retrying ($retryCount/$MAX_RETRIES)")
                retryCount++
                startVoiceRecognition()
            }
        }, RECOGNITION_TIMEOUT_MS)
    }

    private fun destroyRecognizer() {
        timeoutHandler.removeCallbacksAndMessages(null)
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            Log.w("Voxly", "Error destroying recognizer: ${e.message}")
        }
        speechRecognizer = null
    }

    private fun processCommand(command: String) {
        if (!isPhoneRinging) return
        try {
            when {
                command.contains("answer") || command.contains("accept") ||
                command.contains("pick up") || command.contains("pickup") ||
                command.contains("yeah") || command.contains("yes") -> {
                    isPhoneRinging = false
                    if (wakeLock?.isHeld == true) wakeLock?.release()
                    destroyRecognizer()
                    ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                        .startTone(ToneGenerator.TONE_PROP_ACK, 300)
                    telecomManager.acceptRingingCall()
                    Log.i("Voxly", "Call accepted via voice command: $command")
                }
                command.contains("reject") || command.contains("decline") ||
                command.contains("ignore") || command.contains("busy") ||
                command.contains("no") -> {
                    isPhoneRinging = false
                    if (wakeLock?.isHeld == true) wakeLock?.release()
                    destroyRecognizer()
                    ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                        .startTone(ToneGenerator.TONE_PROP_NACK, 300)
                    telecomManager.endCall()
                    Log.i("Voxly", "Call rejected via voice command: $command")
                }
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
        ).apply { description = "Provides status for Voxly." }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isRunning = false
        if (wakeLock?.isHeld == true) wakeLock?.release()
        destroyRecognizer()
        Log.i("Voxly", "Service shut down.")
        super.onDestroy()
    }
}
