package com.azatates.dialwise.telecom

import android.content.Intent
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import com.azatates.dialwise.MainActivity

/**
 * Sistem, uygulama varsayılan telefon uygulamasıyken her çağrı için bu servise bağlanır.
 * Çağrıları CallManager'a iletir.
 */
class PhoneInCallService : InCallService() {

    override fun onCreate() {
        super.onCreate()
        CallManager.service = this
    }

    override fun onDestroy() {
        if (CallManager.service === this) {
            CallManager.service = null
        }
        super.onDestroy()
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        CallManager.onCallAdded(call)
        // GEÇİCİ (Faz 1 / Adım 3): uygulamayı öne getirir, böylece geliştirme panelinden
        // cevaplanabilir. Adım 4'te gelen arama bildirimi, Adım 5'te InCall ekranı ile değişecek.
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
        )
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
}