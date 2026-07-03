package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SmsManager;
import android.util.Log;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;

final class CheckinEscalationExecutor {
    private static final String TAG = "GuardianCheckin";
    private static final int SMS_DELAY_MS = 2000;
    private static final int CALL_DELAY_MS = 35000;

    private CheckinEscalationExecutor() {}

    static boolean execute(Context context, JSONObject plan) {
        if (plan == null) return false;

        try {
            String checkinId = plan.optString("checkinId", "");
            String message = plan.getString("message");
            JSONArray contacts = plan.getJSONArray("contacts");
            int notificationId = plan.getInt("notificationId");

            if (!checkinId.isEmpty()) {
                CheckinEscalationStore.markExecuted(context, checkinId);
            }

            long baseTime = System.currentTimeMillis();

            for (int i = 0; i < contacts.length(); i++) {
                JSONObject contact = contacts.getJSONObject(i);
                String phone = contact.optString("phone", "");
                if (!phone.isEmpty()) {
                    boolean sent = sendSms(context, phone, message);
                    Log.i(TAG, "SMS to " + phone + " sent=" + sent);
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

            scheduleCalls(context, contacts, notificationId, baseTime);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Escalation failed", e);
            return false;
        }
    }

    private static void scheduleCalls(
        Context context,
        JSONArray contacts,
        int notificationId,
        long baseTime
    ) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        for (int i = 0; i < contacts.length(); i++) {
            try {
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
                Log.i(TAG, "Scheduled call " + (i + 1) + " at " + triggerAt);
            } catch (Exception e) {
                Log.e(TAG, "Failed to schedule call " + i, e);
            }
        }
    }

    private static boolean sendSms(Context context, String phone, String message) {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "SEND_SMS permission missing");
            return false;
        }

        try {
            String normalized = phone.replaceAll("[^\\d+]", "");
            SmsManager smsManager = SmsManager.getDefault();
            if (smsManager == null) return false;

            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(normalized, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(normalized, null, message, null, null);
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "SMS send error for " + phone, e);
            return false;
        }
    }
}
