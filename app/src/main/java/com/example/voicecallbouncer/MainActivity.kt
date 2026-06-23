package com.example.voicecallbouncer

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * MainActivity - Entry Point for Jetpack Compose UI
 * Requests permission bundle specifically optimized for API 36 (Android 16) Sandbox.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Comprehensive Security Sandbox-compliant Permission array
        val requiredPermissions = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.ANSWER_PHONE_CALLS,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.FOREGROUND_SERVICE_MICROPHONE
        )

        setContent {
            VoiceBouncerDarkTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainWorkspaceScreen(requiredPermissions)
                }
            }
        }
    }
}

@Composable
fun MainWorkspaceScreen(permissions: Array<String>) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences(VoiceCommandService.PREFS_NAME, Context.MODE_PRIVATE)
    var isServiceRunning by remember {
        mutableStateOf(
            VoiceCommandService.isRunning ||
            prefs.getBoolean(VoiceCommandService.KEY_SERVICE_ENABLED, false)
        )
    }
    var permissionsGranted by remember { mutableStateOf(false) }

    // Modern API Activity Result Launcher
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grantResultMap ->
        permissionsGranted = grantResultMap.values.all { it }
    }

    // Trigger permission requests right on load or with manual action
    LaunchedEffect(Unit) {
        launcher.launch(permissions)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "VoiceCallBouncer",
            fontSize = 30.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF22D3EE) // Cyan accent
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "API 36 On-Device Speech Network Manager",
            fontSize = 11.sp,
            color = Color.LightGray,
            fontFamily = FontFamily.Monospace
        )

        Spacer(modifier = Modifier.height(40.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (isServiceRunning) Color(0xFF0F3E22) else Color(0xFF1E293B)
            )
        ) {
            Row(
                modifier = Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Voice Command Listener",
                        fontWeight = FontWeight.Bold,
                        color = Color.Unspecified
                    )
                    Text(
                        text = if (isServiceRunning) "Status: Listening for voice commands..." else "Status: Off",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                
                // Switch triggers Android 16 Scoped Foreground Startup
                Switch(
                    checked = isServiceRunning,
                    onCheckedChange = { checkState ->
                        if (permissionsGranted) {
                            toggleForegroundService(context, checkState)
                            isServiceRunning = checkState
                        } else {
                            launcher.launch(permissions)
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // System Monospace Feed console inside screen boundaries
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(12.dp)
        ) {
            Text(
                text = "System Console:\n" + 
                if (isServiceRunning) "> VoiceCommandService running...\n> Listening for incoming calls.\n> Say 'answer' to accept or 'reject' to decline.\n> Works with built-in mic and earphones."
                else "> Toggle the switch to enable voice commands.",
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                color = if (isServiceRunning) Color.Green else Color.Yellow
            )
        }
    }
}

private fun toggleForegroundService(context: Context, start: Boolean) {
    val prefs = context.getSharedPreferences(VoiceCommandService.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().putBoolean(VoiceCommandService.KEY_SERVICE_ENABLED, start).apply()
    val intent = Intent(context, VoiceCommandService::class.java)
    if (start) {
        context.startForegroundService(intent)
    } else {
        context.stopService(intent)
    }
}

@Composable
fun VoiceBouncerDarkTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF22D3EE),
            background = Color(0xFF0F172A),
            surface = Color(0xFF1E293B)
        ),
        content = content
    )
}