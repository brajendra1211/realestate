package com.bayaestate.app

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyRingWindowFlagsIfNeeded(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        applyRingWindowFlagsIfNeeded(intent)
    }

    // flutter_local_notifications relaunches the app via this activity with
    // the notification's payload under the "payload" extra (its own
    // FlutterLocalNotificationsPlugin.PAYLOAD key) — both on a plain tap and
    // when a fullScreenIntent notification auto-launches it. Showing over
    // the lock screen only for that specific case (never for a normal app
    // open) is what makes the incoming-ring screen behave like a real call
    // without weakening the lock screen for anything else.
    private fun applyRingWindowFlagsIfNeeded(intent: Intent?) {
        val payload = intent?.getStringExtra("payload") ?: return
        if (!payload.contains("\"property-ring\"")) return

        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
    }
}
