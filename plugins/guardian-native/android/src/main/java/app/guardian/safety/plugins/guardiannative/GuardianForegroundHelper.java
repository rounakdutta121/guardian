package app.guardian.safety.plugins.guardiannative;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.util.Log;

/** Safe foreground-service helpers for emergency escalation on Android 14+. */
final class GuardianForegroundHelper {
    private static final String TAG = "GuardianForeground";

    private GuardianForegroundHelper() {}

    static int notificationIcon(Context context) {
        int icon = context.getApplicationInfo().icon;
        return icon != 0 ? icon : android.R.drawable.stat_sys_warning;
    }

    static int foregroundServiceType() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Short-lived critical work (SMS + calls). phoneCall type requires an active call session.
            return ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
        }
        return 0;
    }

    static boolean startForegroundSafe(Service service, int notificationId, Notification notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                service.startForeground(notificationId, notification, foregroundServiceType());
            } else {
                service.startForeground(notificationId, notification);
            }
            return true;
        } catch (Exception primary) {
            Log.e(TAG, "startForeground failed, retrying with dataSync only", primary);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    service.startForeground(
                        notificationId,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    );
                } else {
                    service.startForeground(notificationId, notification);
                }
                return true;
            } catch (Exception fallback) {
                Log.e(TAG, "startForeground fallback failed", fallback);
                return false;
            }
        }
    }
}
