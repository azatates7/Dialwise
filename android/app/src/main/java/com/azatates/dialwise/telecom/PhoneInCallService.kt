package com.azatates.dialwise.telecom

import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService

/**
 * Sistem, uygulama varsayılan telefon uygulamasıyken her çağrı için bu servise bağlanır.
 * Çağrıları CallManager'a iletir, bildirimleri ve görüşme ekranını yönetir.
 */
class PhoneInCallService : InCallService() {

    private val listener = object : CallManager.Listener {
        override fun onCallAdded(info: CallInfo) {
            // Giden aramada görüşme ekranı hemen açılır. Gelen aramada yalnızca bildirim gösterilir:
            // kilit ekranında/ekran kapalıyken full-screen intent görüşme ekranını açar,
            // telefon kullanılıyorsa üstten bildirim çıkar.
            if (info.direction == "outgoing" || info.state == "select_account") {
                startActivity(InCallActivity.intent(this@PhoneInCallService))
            }
            updateNotification()
        }

        override fun onCallStateChanged(info: CallInfo) = updateNotification()

        override fun onCallRemoved(id: String) = updateNotification()

        override fun onAudioStateChanged(audio: AudioInfo) = Unit
    }

    override fun onCreate() {
        super.onCreate()
        CallManager.service = this
        CallNotificationHelper.ensureChannels(this)
        CallManager.addListener(listener)
    }

    override fun onDestroy() {
        CallManager.removeListener(listener)
        CallNotificationHelper.cancel(this)
        if (CallManager.service === this) {
            CallManager.service = null
        }
        super.onDestroy()
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        CallManager.onCallAdded(call)
    }

    override fun onCallRemoved(call: Call) {
        CallManager.onCallRemoved(call)
        super.onCallRemoved(call)
    }

    @Deprecated("Android 14+ onCallEndpointChanged önerir; Android 10–13 desteği için bu kullanılıyor.")
    @Suppress("DEPRECATION")
    override fun onCallAudioStateChanged(audioState: CallAudioState?) {
        super.onCallAudioStateChanged(audioState)
        CallManager.onAudioStateChanged(audioState)
    }

    /** Çalan arama varsa "gelen arama", yoksa ilk canlı çağrı için "devam eden arama" bildirimi. */
    private fun updateNotification() {
        val calls = CallManager.activeCalls()
        val ringing = calls.firstOrNull { it.state == "ringing" }
        val live = calls.firstOrNull { it.state != "disconnected" && it.state != "disconnecting" }
        when {
            ringing != null -> CallNotificationHelper.showIncoming(this, ringing)
            live != null -> CallNotificationHelper.showOngoing(this, live)
            else -> CallNotificationHelper.cancel(this)
        }
    }
}