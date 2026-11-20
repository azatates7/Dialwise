package com.azatates.dialwise.modules

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Uygulamanın tüm Turbo Module'leri burada kaydedilir. */
class DialwisePackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            DialerRoleModule.NAME -> DialerRoleModule(reactContext)
            CallControlModule.NAME -> CallControlModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        listOf(DialerRoleModule.NAME, CallControlModule.NAME).associateWith { name ->
            ReactModuleInfo(
                name,
                name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true, // isTurboModule
            )
        }
    }
}