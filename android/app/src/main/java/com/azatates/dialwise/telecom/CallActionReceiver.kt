package com.azatates.dialwise.telecom

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Bildirimdeki "Reddet" ve "Kapat" butonları. Ekran açmaları gerekmediği için broadcast kullanılır.
 * ("Cevapla" ekran açtığı için doğrudan InCallActivity'ye gider.)
 */
class CallActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: return
        when (intent.action) {
            ACTION_DECLINE -> CallManager.reject(callId)
            ACTION_HANG_UP -> CallManager.hangup(callId)
        }
    }

    companion object {
        const val ACTION_DECLINE = "com.azatates.dialwise.action.DECLINE"
        const val ACTION_HANG_UP = "com.azatates.dialwise.action.HANG_UP"
        const val EXTRA_CALL_ID = "com.azatates.dialwise.CALL_ID"

        fun intent(context: Context, action: String, callId: String): Intent =
            Intent(context, CallActionReceiver::class.java)
                .setAction(action)
                .putExtra(EXTRA_CALL_ID, callId)
    }
}