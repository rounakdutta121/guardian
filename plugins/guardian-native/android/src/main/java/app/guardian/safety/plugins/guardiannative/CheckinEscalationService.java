package app.guardian.safety.plugins.guardiannative;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

public class CheckinEscalationService extends Service {
    private static final String TAG = "GuardianCheckin";
    private static final String CHANNEL_ID = "guardian_checkin_escalation";
    private static final int NOTIFICATION_ID = 91001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String checkinId = intent != null ? intent.getStringExtra("checkinId") : null;
        if (checkinId == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        createChannel();
        Notification notification = buildNotification("Alerting your emergency contacts…");
        if (!GuardianForegroundHelper.startForegroundSafe(this, NOTIFICATION_ID, notification)) {
            Log.e(TAG, "Could not enter foreground — running escalation without FGS");
            runEscalationWork(checkinId, null);
            return START_NOT_STICKY;
        }

        final NotificationManager notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        new Thread(() -> {
            try {
                runEscalationWork(
                    checkinId,
                    message -> notificationManager.notify(
                        NOTIFICATION_ID,
                        buildNotification(message)
                    )
                );
            } finally {
                stopForeground(STOP_FOREGROUND_REMOVE);
                stopSelf();
            }
        }).start();

        return START_NOT_STICKY;
    }

    private void runEscalationWork(String checkinId, CheckinEscalationExecutor.ProgressListener listener) {
        try {
            JSONObject plan = CheckinEscalationStore.loadPlan(this, checkinId);
            if (plan != null && !CheckinEscalationStore.wasExecuted(this, checkinId)) {
                boolean ok = CheckinEscalationExecutor.execute(this, plan, listener);
                Log.i(TAG, "Foreground escalation done checkinId=" + checkinId + " ok=" + ok);
            }
        } catch (Exception e) {
            Log.e(TAG, "Foreground escalation error", e);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Check-in emergency alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Runs when a safe check-in expires");
        channel.enableVibration(true);
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
            .setSmallIcon(GuardianForegroundHelper.notificationIcon(this))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingLaunch)
            .setOngoing(true)
            .build();
    }
}
