package com.azatates.dialwise.telecom

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.PhoneAccountHandle
import android.telecom.VideoProfile
import java.util.concurrent.CopyOnWriteArraySet

/** JS'e gönderilen çağrı bilgisi. */
data class CallInfo(
    val id: String,
    val number: String,
    val state: String,
    val direction: String,
    val connectTime: Long,
    val canHold: Boolean,
)

data class AudioInfo(
    val muted: Boolean,
    val route: String,
    val supportedRoutes: List<String>,
)

/**
 * Aktif çağrıların tek doğru kaynağı. PhoneInCallService çağrıları buraya bildirir,
 * CallControlModule buradan okur ve komut gönderir. JS çalışmıyorken de durumu tutar.
 */
object CallManager {

    interface Listener {
        fun onCallAdded(info: CallInfo)
        fun onCallStateChanged(info: CallInfo)
        fun onCallRemoved(id: String)
        fun onAudioStateChanged(audio: AudioInfo)
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val listeners = CopyOnWriteArraySet<Listener>()
    private val calls = LinkedHashMap<String, Call>()
    private val callbacks = HashMap<String, Call.Callback>()
    private var nextId = 1

    /** Bağlı InCallService. Mute ve ses yönlendirme için gerekli. */
    var service: PhoneInCallService? = null
        internal set

    private var lastAudio: CallAudioState? = null

    fun addListener(listener: Listener) {
        listeners.add(listener)
    }

    fun removeListener(listener: Listener) {
        listeners.remove(listener)
    }

    // ---- PhoneInCallService'ten gelenler (ana thread) ----

    @Synchronized
    internal fun onCallAdded(call: Call) {
        val id = "call-${nextId++}"
        calls[id] = call
        val callback = object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                val info = toInfo(id, call)
                listeners.forEach { it.onCallStateChanged(info) }
            }

            override fun onDetailsChanged(call: Call, details: Call.Details) {
                val info = toInfo(id, call)
                listeners.forEach { it.onCallStateChanged(info) }
            }
        }
        callbacks[id] = callback
        call.registerCallback(callback, mainHandler)
        val info = toInfo(id, call)
        listeners.forEach { it.onCallAdded(info) }
    }

    @Synchronized
    internal fun onCallRemoved(call: Call) {
        val id = idOf(call) ?: return
        callbacks.remove(id)?.let { call.unregisterCallback(it) }
        calls.remove(id)
        listeners.forEach { it.onCallRemoved(id) }
    }

    internal fun onAudioStateChanged(state: CallAudioState?) {
        lastAudio = state
        val audio = audioInfo()
        listeners.forEach { it.onAudioStateChanged(audio) }
    }

    // ---- CallControlModule'den gelenler ----

    @Synchronized
    fun activeCalls(): List<CallInfo> = calls.map { (id, call) -> toInfo(id, call) }

    fun answer(id: String) {
        calls[id]?.answer(VideoProfile.STATE_AUDIO_ONLY)
    }

    fun reject(id: String) {
        calls[id]?.reject(false, null)
    }

    fun hangup(id: String) {
        calls[id]?.disconnect()
    }

    fun hold(id: String, on: Boolean) {
        val call = calls[id] ?: return
        if (on) call.hold() else call.unhold()
    }

    fun selectPhoneAccount(id: String, handle: PhoneAccountHandle) {
        calls[id]?.phoneAccountSelected(handle, false)
    }

    fun playDtmf(id: String, digit: Char) {
        calls[id]?.playDtmfTone(digit)
    }

    fun stopDtmf(id: String) {
        calls[id]?.stopDtmfTone()
    }

    fun setMuted(muted: Boolean) {
        service?.setMuted(muted)
    }

    @Suppress("DEPRECATION")
    fun setAudioRoute(route: String) {
        val value = when (route) {
            "speaker" -> CallAudioState.ROUTE_SPEAKER
            "bluetooth" -> CallAudioState.ROUTE_BLUETOOTH
            "wired" -> CallAudioState.ROUTE_WIRED_HEADSET
            else -> CallAudioState.ROUTE_EARPIECE
        }
        service?.setAudioRoute(value)
    }

    fun audioInfo(): AudioInfo {
        val state = lastAudio ?: return AudioInfo(false, "earpiece", emptyList())
        return AudioInfo(
            muted = state.isMuted,
            route = routeName(state.route),
            supportedRoutes = ROUTES.filter { (mask, _) -> state.supportedRouteMask and mask != 0 }.map { it.second },
        )
    }

    // ---- yardımcılar ----

    private fun idOf(call: Call): String? = calls.entries.firstOrNull { it.value == call }?.key

    @Suppress("DEPRECATION")
    private fun stateOf(call: Call): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) call.details.state else call.state

    private fun toInfo(id: String, call: Call): CallInfo {
        val details = call.details
        return CallInfo(
            id = id,
            number = details.handle?.schemeSpecificPart.orEmpty(),
            state = stateName(stateOf(call)),
            direction = when (details.callDirection) {
                Call.Details.DIRECTION_INCOMING -> "incoming"
                Call.Details.DIRECTION_OUTGOING -> "outgoing"
                else -> "unknown"
            },
            connectTime = details.connectTimeMillis,
            canHold = details.can(Call.Details.CAPABILITY_HOLD),
        )
    }

    private fun stateName(state: Int): String = when (state) {
        Call.STATE_NEW -> "new"
        Call.STATE_RINGING -> "ringing"
        Call.STATE_DIALING -> "dialing"
        Call.STATE_CONNECTING -> "connecting"
        Call.STATE_ACTIVE -> "active"
        Call.STATE_HOLDING -> "holding"
        Call.STATE_DISCONNECTING -> "disconnecting"
        Call.STATE_DISCONNECTED -> "disconnected"
        Call.STATE_SELECT_PHONE_ACCOUNT -> "select_account"
        else -> "other"
    }

    private val ROUTES = listOf(
        CallAudioState.ROUTE_EARPIECE to "earpiece",
        CallAudioState.ROUTE_SPEAKER to "speaker",
        CallAudioState.ROUTE_BLUETOOTH to "bluetooth",
        CallAudioState.ROUTE_WIRED_HEADSET to "wired",
    )

    private fun routeName(route: Int): String =
        ROUTES.firstOrNull { it.first == route }?.second ?: "earpiece"
}