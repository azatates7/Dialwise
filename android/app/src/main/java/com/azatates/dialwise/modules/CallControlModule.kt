package com.azatates.dialwise.modules

import android.Manifest
import android.content.ComponentName
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.azatates.dialwise.specs.NativeCallControlSpec
import com.azatates.dialwise.telecom.AudioInfo
import com.azatates.dialwise.telecom.CallInfo
import com.azatates.dialwise.telecom.CallManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class CallControlModule(reactContext: ReactApplicationContext) :
    NativeCallControlSpec(reactContext), CallManager.Listener {

    init {
        CallManager.addListener(this)
    }

    override fun invalidate() {
        CallManager.removeListener(this)
        super.invalidate()
    }

    private val telecom: TelecomManager
        // Telefon özelliği olan her cihazda bulunur; uygulama yalnızca telefonlara kurulabiliyor.
        get() = reactApplicationContext.getSystemService(TelecomManager::class.java)!!

    /** Call nesnesi metotları ana thread'de çağrılır (callback'ler de ana thread'e kayıtlı). */
    private fun ui(block: () -> Unit) {
        UiThreadUtil.runOnUiThread { block() }
    }

    private fun hasPermission(permission: String): Boolean =
        ContextCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED

    // ---- Komutlar ----

    override fun placeCall(number: String, accountId: String?, promise: Promise) {
        if (!hasPermission(Manifest.permission.CALL_PHONE)) {
            promise.reject("E_PERMISSION", "CALL_PHONE permission is not granted")
            return
        }
        val extras = Bundle()
        accountId?.let { parseAccountId(it) }?.let {
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, it)
        }
        try {
            telecom.placeCall(Uri.fromParts("tel", number, null), extras)
            promise.resolve(null)
        } catch (e: SecurityException) {
            promise.reject("E_PERMISSION", e.message, e)
        }
    }

    override fun answer(callId: String) = ui { CallManager.answer(callId) }

    override fun reject(callId: String) = ui { CallManager.reject(callId) }

    override fun hangup(callId: String) = ui { CallManager.hangup(callId) }

    override fun hold(callId: String, on: Boolean) = ui { CallManager.hold(callId, on) }

    override fun selectPhoneAccount(callId: String, accountId: String) {
        val handle = parseAccountId(accountId) ?: return
        ui { CallManager.selectPhoneAccount(callId, handle) }
    }

    override fun setMuted(muted: Boolean) = ui { CallManager.setMuted(muted) }

    override fun setAudioRoute(route: String) = ui { CallManager.setAudioRoute(route) }

    override fun playDtmf(callId: String, digit: String) {
        val c = digit.firstOrNull() ?: return
        ui { CallManager.playDtmf(callId, c) }
    }

    override fun stopDtmf(callId: String) = ui { CallManager.stopDtmf(callId) }

    // ---- Okuma ----

    override fun getActiveCalls(): WritableArray =
        Arguments.createArray().apply { CallManager.activeCalls().forEach { pushMap(it.toMap()) } }

    override fun getAudioState(): WritableMap = CallManager.audioInfo().toMap()

    override fun getPhoneAccounts(promise: Promise) {
        if (!hasPermission(Manifest.permission.READ_PHONE_STATE)) {
            promise.resolve(Arguments.createArray())
            return
        }
        try {
            val result = Arguments.createArray()
            for (handle in telecom.callCapablePhoneAccounts) {
                val label = telecom.getPhoneAccount(handle)?.label?.toString().orEmpty()
                result.pushMap(
                    Arguments.createMap().apply {
                        putString("id", formatAccountId(handle))
                        putString("label", label)
                    },
                )
            }
            promise.resolve(result)
        } catch (e: SecurityException) {
            promise.reject("E_PERMISSION", e.message, e)
        }
    }

    // ---- CallManager.Listener → JS event'leri ----

    override fun onCallAdded(info: CallInfo) = emitOnCallAdded(info.toMap())

    override fun onCallStateChanged(info: CallInfo) = emitOnCallStateChanged(info.toMap())

    override fun onCallRemoved(id: String) = emitOnCallRemoved(id)

    override fun onAudioStateChanged(audio: AudioInfo) = emitOnAudioStateChanged(audio.toMap())

    // ---- Dönüşümler ----

    private fun CallInfo.toMap(): WritableMap = Arguments.createMap().apply {
        putString("id", id)
        putString("number", number)
        putString("state", state)
        putString("direction", direction)
        putDouble("connectTime", connectTime.toDouble())
        putBoolean("canHold", canHold)
    }

    private fun AudioInfo.toMap(): WritableMap = Arguments.createMap().apply {
        putBoolean("muted", muted)
        putString("route", route)
        putArray("supportedRoutes", Arguments.createArray().apply { supportedRoutes.forEach { pushString(it) } })
    }

    /** PhoneAccountHandle → "paket/sınıf|id" */
    private fun formatAccountId(handle: PhoneAccountHandle): String =
        "${handle.componentName.flattenToString()}|${handle.id}"

    private fun parseAccountId(value: String): PhoneAccountHandle? {
        val separator = value.indexOf('|')
        if (separator <= 0) return null
        val component = ComponentName.unflattenFromString(value.substring(0, separator)) ?: return null
        return PhoneAccountHandle(component, value.substring(separator + 1))
    }

    companion object {
        const val NAME = NativeCallControlSpec.NAME
    }
}