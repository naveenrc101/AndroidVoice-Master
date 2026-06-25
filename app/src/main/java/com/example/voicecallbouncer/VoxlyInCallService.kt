package com.example.voicecallbouncer

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.telecom.Call
import android.telecom.InCallService
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * VoxlyInCallService — registered as a companion calling app.
 *
 * Unlike SpeechRecognizer launched from a regular service, an InCallService
 * receives shared microphone access from the OS during active calls, which is
 * why voice commands work here but failed with ERROR_AUDIO from VoiceCommandService.
 *
 * Handles: "end call" / "hang up" / "voxly end" during a connected call.
 * Ringing-state commands (answer/reject) are still handled by VoiceCommandService.
 */
class VoxlyInCallService : InCallService() {

    private var speechRecognizer: SpeechRecognizer? = null
    private var activeCall: Call? = null
    private lateinit var audioManager: AudioManager

    private var retryCount = 0
    private val MAX_RETRIES = 5
    private val timeoutHandler = Handler(Looper.getMainLooper())
    private val RECOGNITION_TIMEOUT_MS = 3000L

    // Wait for audio routing to fully settle after the call connects before opening mic.
    private val CALL_SETTLE_DELAY_MS = 2000L

    private val recognitionIntent by lazy {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
    }

    // Tracks call state changes on the active call object.
    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            when (state) {
                Call.STATE_ACTIVE -> {
                    Log.d("VoxlyInCall", "Call active — mic opens in ${CALL_SETTLE_DELAY_MS}ms")
                    timeoutHandler.postDelayed({ startListening() }, CALL_SETTLE_DELAY_MS)
                }
                Call.STATE_HOLDING,
                Call.STATE_DISCONNECTING,
                Call.STATE_DISCONNECTED -> stopRecognition()
            }
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        activeCall = call
        call.registerCallback(callCallback)
        // Edge case: InCallService bound after call already went active (e.g. service restart).
        if (call.state == Call.STATE_ACTIVE) {
            timeoutHandler.postDelayed({ startListening() }, CALL_SETTLE_DELAY_MS)
        }
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        call.unregisterCallback(callCallback)
        if (activeCall == call) {
            activeCall = null
            stopRecognition()
        }
    }

    private fun startListening() {
        if (activeCall?.state != Call.STATE_ACTIVE) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("VoxlyInCall", "RECORD_AUDIO not granted")
            return
        }
        stopListening()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(recognitionListener)
        audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_MUTE, 0)
        speechRecognizer?.startListening(recognitionIntent)

        timeoutHandler.removeCallbacksAndMessages(null)
        timeoutHandler.postDelayed({
            if (activeCall?.state == Call.STATE_ACTIVE && retryCount < MAX_RETRIES) {
                Log.w("VoxlyInCall", "Recognition timeout — retrying ($retryCount/$MAX_RETRIES)")
                retryCount++
                startListening()
            }
        }, RECOGNITION_TIMEOUT_MS)
    }

    private fun stopListening() {
        timeoutHandler.removeCallbacksAndMessages(null)
        audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0)
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            Log.w("VoxlyInCall", "Error stopping recognizer: ${e.message}")
        }
        speechRecognizer = null
    }

    private fun stopRecognition() {
        retryCount = 0
        stopListening()
    }

    private val recognitionListener = object : RecognitionListener {
        override fun onResults(results: Bundle?) {
            retryCount = 0
            results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.forEach { processCommand(it.lowercase()) }
            if (activeCall?.state == Call.STATE_ACTIVE) startListening()
        }

        override fun onError(error: Int) {
            timeoutHandler.removeCallbacksAndMessages(null)
            audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0)
            Log.w("VoxlyInCall", "Recognition error: $error — retry $retryCount/$MAX_RETRIES")
            if (activeCall?.state != Call.STATE_ACTIVE || retryCount >= MAX_RETRIES) return
            retryCount++
            val delay = when (error) {
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> 500L
                SpeechRecognizer.ERROR_AUDIO -> 4000L  // mic may need time to be shared after call connects
                else -> 2000L
            }
            Handler(Looper.getMainLooper()).postDelayed({
                if (activeCall?.state == Call.STATE_ACTIVE) startListening()
            }, delay)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.forEach { processCommand(it.lowercase()) }
        }

        override fun onReadyForSpeech(params: Bundle?) {
            retryCount = 0
            timeoutHandler.removeCallbacksAndMessages(null)
            audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0)
            Log.d("VoxlyInCall", "Mic ready during active call")
        }

        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    private fun processCommand(command: String) {
        if (activeCall?.state != Call.STATE_ACTIVE) return
        if ((command.contains("voxly") && command.contains("end")) ||
            command.contains("end call") || command.contains("hang up")) {
            Log.i("VoxlyInCall", "Ending call via voice: $command")
            stopRecognition()
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                .startTone(ToneGenerator.TONE_PROP_NACK, 300)
            activeCall?.disconnect()
        }
    }

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    override fun onDestroy() {
        stopRecognition()
        super.onDestroy()
    }
}
