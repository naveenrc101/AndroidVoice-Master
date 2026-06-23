package com.example.voicecallbouncer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            val prefs = context.getSharedPreferences(
                VoiceCommandService.PREFS_NAME, Context.MODE_PRIVATE
            )
            if (prefs.getBoolean(VoiceCommandService.KEY_SERVICE_ENABLED, false)) {
                context.startForegroundService(
                    Intent(context, VoiceCommandService::class.java)
                )
            }
        }
    }
}
