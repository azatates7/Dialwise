package com.azatates.dialwise.modules

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import com.azatates.dialwise.specs.NativeDialerRoleSpec
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class DialerRoleModule(reactContext: ReactApplicationContext) : NativeDialerRoleSpec(reactContext) {

    private var pendingPromise: Promise? = null

    private val activityListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != REQUEST_CODE) return
            // resultCode yerine rolün gerçek durumuna bakılır: kullanıcı aynı anda ayarlardan da değiştirmiş olabilir.
            pendingPromise?.resolve(isDefaultDialer())
            pendingPromise = null
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    private val roleManager: RoleManager?
        get() = reactApplicationContext.getSystemService(RoleManager::class.java)

    override fun isDefaultDialer(): Boolean {
        val rm = roleManager ?: return false
        return rm.isRoleAvailable(RoleManager.ROLE_DIALER) && rm.isRoleHeld(RoleManager.ROLE_DIALER)
    }

    override fun requestDefaultDialer(promise: Promise) {
        if (isDefaultDialer()) {
            promise.resolve(true)
            return
        }
        val rm = roleManager
        val activity = reactApplicationContext.currentActivity
        if (rm == null || !rm.isRoleAvailable(RoleManager.ROLE_DIALER) || activity == null) {
            promise.resolve(false)
            return
        }
        if (pendingPromise != null) {
            promise.reject("E_IN_PROGRESS", "Default dialer request is already in progress")
            return
        }
        pendingPromise = promise
        activity.startActivityForResult(rm.createRequestRoleIntent(RoleManager.ROLE_DIALER), REQUEST_CODE)
    }

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(activityListener)
        pendingPromise = null
        super.invalidate()
    }

    companion object {
        const val NAME = NativeDialerRoleSpec.NAME
        private const val REQUEST_CODE = 4101
    }
}