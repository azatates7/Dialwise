package com.azatates.dialwise.telecom

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.content.ContextCompat
import com.azatates.dialwise.R

/**
 * Gelen ve devam eden arama bildirimleri (CallStyle).
 * İkisi de aynı bildirim id'sini kullanır: gelen arama cevaplanınca bildirim yerinde güncellenir.
 *
 * Android 12+ CallStyle bildirimlerinin ya bir foreground service'e bağlı olmasını ya da
 * full-screen intent taşımasını istiyor; burada full-screen intent kullanılıyor.
 */
object CallNotificationHelper {

    private const val CHANNEL_INCOMING = "incoming_calls"
    private const val CHANNEL_ONGOING = "ongoing_calls"
    private const val NOTIFICATION_ID = 1001

    private const val REQUEST_CONTENT = 1
    private const val REQUEST_ANSWER = 2
    private const val REQUEST_DECLINE = 3
    private const val REQUEST_HANG_UP = 4

    fun ensureChannels(context: Context) {
        val manager = NotificationManagerCompat.from(context)
        // Zil sesini sistem çalıyor (IN_CALL_SERVICE_RINGING=false), kanallar sessiz.
        manager.createNotificationChannel(
            NotificationChannelCompat.Builder(CHANNEL_INCOMING, NotificationManagerCompat.IMPORTANCE_HIGH)
                .setName(context.getString(R.string.channel_incoming_calls))
                .setSound(null, null)
                .setVibrationEnabled(false)
                .build(),
        )
        manager.createNotificationChannel(
            NotificationChannelCompat.Builder(CHANNEL_ONGOING, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                .setName(context.getString(R.string.channel_ongoing_calls))
                .setSound(null, null)
                .setVibrationEnabled(false)
                .build(),
        )
    }

    fun showIncoming(context: Context, call: CallInfo) {
        val builder = NotificationCompat.Builder(context, CHANNEL_INCOMING)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setContentIntent(contentIntent(context))
            .setFullScreenIntent(contentIntent(context), true)
            .setStyle(
                NotificationCompat.CallStyle.forIncomingCall(
                    caller(context, call),
                    broadcast(context, CallActionReceiver.ACTION_DECLINE, call.id, REQUEST_DECLINE),
                    PendingIntent.getActivity(
                        context,
                        REQUEST_ANSWER,
                        InCallActivity.intent(context, answerCallId = call.id),
                        FLAGS,
                    ),
                ),
            )
        post(context, builder)
    }

    fun showOngoing(context: Context, call: CallInfo) {
        val builder = NotificationCompat.Builder(context, CHANNEL_ONGOING)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent(context))
            .setFullScreenIntent(contentIntent(context), false)
            .setStyle(
                NotificationCompat.CallStyle.forOngoingCall(
                    caller(context, call),
                    broadcast(context, CallActionReceiver.ACTION_HANG_UP, call.id, REQUEST_HANG_UP),
                ),
            )
        if (call.connectTime > 0) {
            builder.setUsesChronometer(true).setWhen(call.connectTime).setShowWhen(true)
        }
        post(context, builder)
    }

    fun cancel(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    // ---- yardımcılar ----

    private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    private fun post(context: Context, builder: NotificationCompat.Builder) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
    }

    // Kişi adı Faz 3'te rehberden gelecek; şimdilik numara gösteriliyor.
    private fun caller(context: Context, call: CallInfo): Person =
        Person.Builder()
            .setName(call.number.ifEmpty { context.getString(R.string.unknown_caller) })
            .setImportant(true)
            .build()

    private fun contentIntent(context: Context): PendingIntent =
        PendingIntent.getActivity(context, REQUEST_CONTENT, InCallActivity.intent(context), FLAGS)

    private fun broadcast(context: Context, action: String, callId: String, requestCode: Int): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            requestCode,
            CallActionReceiver.intent(context, action, callId),
            FLAGS,
        )
}