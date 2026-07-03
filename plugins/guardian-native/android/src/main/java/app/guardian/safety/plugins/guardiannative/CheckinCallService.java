package app.guardian.safety.plugins.guardiannative;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Short-lived foreground service so scheduled call alarms can start a call
 * when the main escalation service is no longer running.
 */
public class CheckinCallService extends Service {
    private static final String TAG = "GuardianCheckin";
    private static final String CHANNEL_ID = "guardian_checkin_call";
    private static final int NOTIFICATION_ID = 91002;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String phone = intent != null ? intent.getStringExtra("phone") : null;
        String contactName = intent != null ? intent.getStringExtra("contactName") : null;

        if (phone == null || phone.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        createChannel();
        String label = contactName != null && !contactName.isEmpty()
            ? "Calling " + contactName + "…"
            : "Calling emergency contact…";
        Notification notification = buildNotification(label);
        startForegroundWithType(notification);

        new Thread(() -> {
            try {
                boolean ok = EmergencyCallHelper.placeCall(this, phone);
                Log.i(TAG, "CheckinCallService placed=" + ok + " phone=" + phone);
            } catch (Exception e) {
                Log.e(TAG, "CheckinCallService error", e);
            } finally {
                stopForeground(STOP_FOREGROUND_REMOVE);
                stopSelf();
            }
        }).start();

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startForegroundWithType(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                type |= ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL;
            }
            startForeground(NOTIFICATION_ID, notification, type);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Check-in emergency calls",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Places calls when a safe check-in expires");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingLaunch = null;
        if (launch != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            pendingLaunch = PendingIntent.getActivity(this, 0, launch, flags);
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Check-in missed")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(pendingLaunch)
            .setOngoing(true)
            .build();
    }
}
