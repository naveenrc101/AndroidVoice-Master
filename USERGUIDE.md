# Voxly — User Guide

---

## What is Voxly?

Voxly lets you answer or reject incoming phone calls using your voice — no need to touch your phone. Just say **"answer"** or **"reject"** when your phone rings.

Works with your built-in microphone or any connected earphones/headset.

---

## Setup

### 1. Install the app
Install the APK on your Android device (Android 11 or later required).

### 2. Grant permissions
When you open Voxly for the first time, it will ask for the following permissions. All are required for the app to work:

| Permission | Why it's needed |
|------------|----------------|
| Microphone | To hear your voice commands |
| Phone State | To detect when a call is incoming |
| Answer Phone Calls | To accept or reject calls via voice |
| Bluetooth Connect | To work with wireless earphones |

Tap **Allow** on each prompt.

### 3. Disable battery optimization
If a red warning card appears saying **"Battery Optimization is ON"**, tap **Fix Now** and select **Allow** in the system dialog.

This is important — without it, the app may stop working after you close it.

### 4. Enable the service
Toggle the switch ON. The status will change to:
> *Listening for voice commands...*

You will also see a persistent **Voxly** notification in your status bar — this means the service is running.

---

## Using Voxly

Once the switch is ON, Voxly runs silently in the background. You do not need to keep the app open.

### Answering a call
When your phone rings, say any of:
> **"Answer"**, **"Accept"**, **"Pick up"**, **"Yes"**, **"Yeah"**

You will hear a short confirmation beep and the call will connect.

### Rejecting a call
When your phone rings, say any of:
> **"Reject"**, **"Decline"**, **"Ignore"**, **"Busy"**, **"No"**

The call will be rejected.

### Ending an active call
Once a call is connected, say:
> **"Voxly end"**

You will hear a short beep and the call will end.

The phrase requires the "Voxly" prefix so that saying "end" naturally during conversation does not accidentally hang up your call.

---

## Turning Voxly off
Open the app and toggle the switch OFF. The service will stop and the notification will disappear.

---

## Troubleshooting

**Voice commands not working on the first try**
Speak clearly after the phone starts ringing. The mic activates the moment a call comes in — there may be a half-second delay before it is ready.

**App stopped working after closing from recent apps**
Open the app — it will restart the service automatically. To prevent this from happening, make sure battery optimization is disabled (tap **Fix Now** on the warning card if it appears).

**App stopped working after phone restart**
Voxly auto-starts after a reboot if the switch was ON before the restart. If it does not, open the app once to trigger the restart.

**Commands not being recognized**
- Speak naturally and clearly
- Make sure you said the word after the phone started ringing
- Check that the Microphone permission is granted in your phone's Settings > Apps > Voxly > Permissions

**Works with earphones?**
Yes. Voxly automatically uses whichever audio device is active — built-in mic, wired earphones, or Bluetooth headset.

---

## Permissions explained

Voxly does not collect, store, or transmit any data. All voice processing happens on your device. The microphone is only active while your phone is ringing — it is off at all other times.

---

## Requirements

- Android 11 or later
- Google app or any speech recognition service installed (standard on most Android devices)
- Microphone (built-in or external)
