package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;
import androidx.core.content.ContextCompat;

/** Places emergency calls from a foreground context (service or activity). */
final class EmergencyCallHelper {
    private static final String TAG = "GuardianCall";

    private EmergencyCallHelper() {}

    static boolean placeCall(Context context, String phone) {
        if (phone == null || phone.isEmpty()) return false;

        String normalized = phone.replaceAll("[^\\d+]", "");
        if (normalized.isEmpty()) return false;

        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "CALL_PHONE permission missing — opening dialer for " + normalized);
            return openDialer(context, normalized);
        }

        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + normalized));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(callIntent);
            Log.i(TAG, "Placed call to " + normalized);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "ACTION_CALL failed for " + normalized, e);
            return openDialer(context, normalized);
        }
    }

    private static boolean openDialer(Context context, String normalized) {
        try {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL);
            dialIntent.setData(Uri.parse("tel:" + normalized));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dialIntent);
            Log.i(TAG, "Opened dialer for " + normalized);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Dialer failed for " + normalized, e);
            return false;
        }
    }
}
