package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SmsManager;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;

public class CheckinExpireReceiver extends BroadcastReceiver {
    private static final int SMS_DELAY_MS = 2000;
    private static final int CALL_DELAY_MS = 35000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String checkinId = intent.getStringExtra("checkinId");
        if (checkinId == null) return;

        JSONObject plan = CheckinEscalationStore.loadPlan(context, checkinId);
        if (plan == null) return;

        CheckinEscalationStore.markExecuted(context, checkinId);

        final PendingResult async = goAsync();
        new Thread(() -> {
            try {
                executeEscalation(context, plan);
            } finally {
                async.finish();
            }
        }).start();

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            context.startActivity(launch);
        }
    }

    private void executeEscalation(Context context, JSONObject plan) {
        try {
            String message = plan.getString("message");
            JSONArray contacts = plan.getJSONArray("contacts");
            int notificationId = plan.getInt("notificationId");
            long baseTime = System.currentTimeMillis();

            for (int i = 0; i < contacts.length(); i++) {
                JSONObject contact = contacts.getJSONObject(i);
                String phone = contact.optString("phone", "");
                if (!phone.isEmpty()) {
                    sendSms(context, phone, message);
                }
                if (i < contacts.length() - 1) {
                    try {
                        Thread.sleep(SMS_DELAY_MS);
                    } catch (InterruptedException ignored) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            for (int i = 0; i < contacts.length(); i++) {
                JSONObject contact = contacts.getJSONObject(i);
                String phone = contact.optString("phone", "");
                if (phone.isEmpty()) continue;

                Intent callIntent = new Intent(context, CheckinCallReceiver.class);
                callIntent.putExtra("phone", phone);
                callIntent.putExtra("contactName", contact.optString("name", ""));

                int requestCode = notificationId * 100 + i + 1;
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    callIntent,
                    flags
                );

                long triggerAt = baseTime + (long) i * CALL_DELAY_MS;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                    );
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                }
            }
        } catch (Exception ignored) {
            // Best-effort native escalation
        }
    }

    private void sendSms(Context context, String phone, String message) {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return;
        }

        try {
            String normalized = phone.replaceAll("[^\\d+]", "");
            SmsManager smsManager = SmsManager.getDefault();
            if (smsManager == null) return;

            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(normalized, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(normalized, null, message, null, null);
            }
        } catch (Exception ignored) {
            // continue chain
        }
    }
}
