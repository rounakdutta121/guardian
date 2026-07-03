package app.guardian.safety.plugins.guardiannative;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class CheckinCallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String phone = intent.getStringExtra("phone");
        if (phone == null || phone.isEmpty()) return;

        Intent serviceIntent = new Intent(context, CheckinCallService.class);
        serviceIntent.putExtra("phone", phone);
        serviceIntent.putExtra("contactName", intent.getStringExtra("contactName"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
