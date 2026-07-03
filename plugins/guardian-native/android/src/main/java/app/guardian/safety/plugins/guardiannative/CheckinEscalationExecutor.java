package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
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

    interface ProgressListener {
        void onProgress(String message);
    }

    private CheckinEscalationExecutor() {}

    static boolean execute(Context context, JSONObject plan) {
        return execute(context, plan, null);
    }

    static boolean execute(Context context, JSONObject plan, ProgressListener listener) {
        if (plan == null) return false;

        try {
            String checkinId = plan.optString("checkinId", "");
            String message = plan.getString("message");
            JSONArray contacts = plan.getJSONArray("contacts");

            if (!checkinId.isEmpty()) {
                CheckinEscalationStore.markExecuted(context, checkinId);
            }

            listener?.onProgress("Sending SMS to emergency contacts…");

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

            executeCalls(context, contacts, listener);

            if (!checkinId.isEmpty()) {
                CheckinEscalationStore.markCallsCompleted(context, checkinId);
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Escalation failed", e);
            return false;
        }
    }

    /**
     * Place calls from the foreground service thread (Android blocks background call UI).
     * Additional contacts are also scheduled via alarm as a fallback if the service is killed.
     */
    private static void executeCalls(
        Context context,
        JSONArray contacts,
        ProgressListener listener
    ) {
        for (int i = 0; i < contacts.length(); i++) {
            try {
                JSONObject contact = contacts.getJSONObject(i);
                String phone = contact.optString("phone", "");
                String name = contact.optString("name", "");
                if (phone.isEmpty()) continue;

                if (i > 0) {
                    listener?.onProgress(
                        "Waiting before calling next contact (" + (i + 1) + "/" + contacts.length() + ")…"
                    );
                    try {
                        Thread.sleep(CALL_DELAY_MS);
                    } catch (InterruptedException ignored) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }

                listener?.onProgress(
                    "Calling " + (name.isEmpty() ? phone : name) +
                    " (" + (i + 1) + "/" + contacts.length() + ")…"
                );

                boolean placed = EmergencyCallHelper.placeCall(context, phone);
                Log.i(TAG, "Call " + (i + 1) + " to " + phone + " placed=" + placed);
            } catch (Exception e) {
                Log.e(TAG, "Call phase failed at index " + i, e);
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
