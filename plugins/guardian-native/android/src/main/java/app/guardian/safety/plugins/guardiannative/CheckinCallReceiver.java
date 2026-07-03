package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.ContextCompat;

public class CheckinCallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String phone = intent.getStringExtra("phone");
        if (phone == null || phone.isEmpty()) return;

        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            openDialer(context, phone);
            return;
        }

        try {
            String normalized = phone.replaceAll("[^\\d+]", "");
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + normalized));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(callIntent);
        } catch (Exception e) {
            openDialer(context, phone);
        }
    }

    private void openDialer(Context context, String phone) {
        try {
            String normalized = phone.replaceAll("[^\\d+]", "");
            Intent dialIntent = new Intent(Intent.ACTION_DIAL);
            dialIntent.setData(Uri.parse("tel:" + normalized));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dialIntent);
        } catch (Exception ignored) {
            // ignore
        }
    }
}
