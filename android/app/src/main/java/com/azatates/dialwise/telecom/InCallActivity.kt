package com.azatates.dialwise.telecom

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Görüşme ekranı. JS tarafında "InCall" bileşenini gösterir.
 * Kilit ekranının üstünde açılır (manifest: showWhenLocked, turnScreenOn).
 * Aktif çağrı kalmayınca kendini kapatır.
 */
class InCallActivity : ReactActivity() {

    private val listener = object : CallManager.Listener {
        override fun onCallAdded(info: CallInfo) = Unit
        override fun onCallStateChanged(info: CallInfo) = Unit
        override fun onAudioStateChanged(audio: AudioInfo) = Unit
        override fun onCallRemoved(id: String) {
            if (CallManager.activeCalls().isEmpty()) {
                finish()
            }
        }
    }

    override fun getMainComponentName(): String = COMPONENT_NAME

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, COMPONENT_NAME)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        CallManager.addListener(listener)
        handleIntent(intent)
        if (CallManager.activeCalls().isEmpty()) {
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onDestroy() {
        CallManager.removeListener(listener)
        super.onDestroy()
    }

    /** Bildirimdeki "Cevapla" butonu bu activity'yi EXTRA_ANSWER_CALL_ID ile açar. */
    private fun handleIntent(intent: Intent?) {
        val callId = intent?.getStringExtra(EXTRA_ANSWER_CALL_ID) ?: return
        intent.removeExtra(EXTRA_ANSWER_CALL_ID)
        CallManager.answer(callId)
    }

    companion object {
        const val COMPONENT_NAME = "InCall"
        private const val EXTRA_ANSWER_CALL_ID = "com.azatates.dialwise.ANSWER_CALL_ID"

        fun intent(context: Context, answerCallId: String? = null): Intent =
            Intent(context, InCallActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .apply { answerCallId?.let { putExtra(EXTRA_ANSWER_CALL_ID, it) } }
    }
}