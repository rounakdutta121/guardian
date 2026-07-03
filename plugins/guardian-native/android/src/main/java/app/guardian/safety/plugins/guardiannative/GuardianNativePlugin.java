package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.telephony.SmsManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import org.json.JSONArray;

@CapacitorPlugin(
    name = "GuardianNative",
    permissions = {
        @Permission(strings = { Manifest.permission.SEND_SMS }, alias = "sms"),
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "phone")
    }
)
public class GuardianNativePlugin extends Plugin {

    @PluginMethod
    public void requestEmergencyPermissions(PluginCall call) {
        boolean smsGranted = getPermissionState("sms") == PermissionState.GRANTED;
        boolean phoneGranted = getPermissionState("phone") == PermissionState.GRANTED;

        if (smsGranted && phoneGranted) {
            resolvePermissions(call);
            return;
        }

        if (!smsGranted) {
            requestPermissionForAlias("sms", call, "afterSmsPermission");
            return;
        }

        requestPermissionForAlias("phone", call, "afterPhonePermission");
    }

    @PermissionCallback
    private void afterSmsPermission(PluginCall call) {
        if (getPermissionState("phone") != PermissionState.GRANTED) {
            requestPermissionForAlias("phone", call, "afterPhonePermission");
        } else {
            resolvePermissions(call);
        }
    }

    @PermissionCallback
    private void afterPhonePermission(PluginCall call) {
        resolvePermissions(call);
    }

    private void resolvePermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("sms", getPermissionState("sms") == PermissionState.GRANTED);
        ret.put("phone", getPermissionState("phone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    /** Opens SMS app with recipients + body — no SEND_SMS permission required. */
    @PluginMethod
    public void openSmsComposer(PluginCall call) {
        JSArray numbersArray = call.getArray("numbers");
        String text = call.getString("text");

        if (numbersArray == null || numbersArray.length() == 0) {
            call.reject("numbers are required");
            return;
        }

        try {
            StringBuilder recipients = new StringBuilder();
            for (int i = 0; i < numbersArray.length(); i++) {
                String number = numbersArray.getString(i);
                if (number == null || number.isEmpty()) continue;
                if (recipients.length() > 0) recipients.append(";");
                recipients.append(number.replaceAll("[^\\d+]", ""));
            }

            if (recipients.length() == 0) {
                call.reject("No valid phone numbers");
                return;
            }

            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("smsto:" + recipients));
            if (text != null && !text.isEmpty()) {
                intent.putExtra("sms_body", text);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open SMS app: " + e.getMessage());
        }
    }

    /** Opens dialer with number pre-filled — no CALL_PHONE permission required. */
    @PluginMethod
    public void openDialer(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.isEmpty()) {
            call.reject("number is required");
            return;
        }

        try {
            String normalized = number.replaceAll("[^\\d+]", "");
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + normalized));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open dialer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendSmsAutomatic(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsSendCallback");
            return;
        }
        executeSendSms(call);
    }

    @PermissionCallback
    private void smsSendCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            executeSendSms(call);
        } else {
            call.reject("SMS permission denied");
        }
    }

    private void executeSendSms(PluginCall call) {
        JSArray numbersArray = call.getArray("numbers");
        String text = call.getString("text");

        if (numbersArray == null || numbersArray.length() == 0 || text == null || text.isEmpty()) {
            call.reject("numbers and text are required");
            return;
        }

        SmsManager smsManager = SmsManager.getDefault();
        if (smsManager == null) {
            call.reject("SMS not available — check SIM card");
            return;
        }

        int sent = 0;
        try {
            for (int i = 0; i < numbersArray.length(); i++) {
                String number = numbersArray.getString(i);
                if (number == null || number.isEmpty()) continue;

                String normalized = number.replaceAll("[^\\d+]", "");
                ArrayList<String> parts = smsManager.divideMessage(text);
                if (parts.size() > 1) {
                    smsManager.sendMultipartTextMessage(normalized, null, parts, null, null);
                } else {
                    smsManager.sendTextMessage(normalized, null, text, null, null);
                }
                sent++;
            }

            JSObject ret = new JSObject();
            ret.put("sent", sent);
            ret.put("automatic", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void placeCallAutomatic(PluginCall call) {
        if (getPermissionState("phone") != PermissionState.GRANTED) {
            requestPermissionForAlias("phone", call, "phoneCallCallback");
            return;
        }
        executePlaceCall(call);
    }

    @PermissionCallback
    private void phoneCallCallback(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            executePlaceCall(call);
        } else {
            call.reject("Phone permission denied");
        }
    }

    private void executePlaceCall(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.isEmpty()) {
            call.reject("number is required");
            return;
        }

        try {
            String normalized = number.replaceAll("[^\\d+]", "");
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + normalized));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("placed", true);
            ret.put("automatic", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to place call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleFakeCallWake(PluginCall call) {
        Integer notificationId = call.getInt("notificationId");
        String callId = call.getString("callId");
        String callerName = call.getString("callerName");
        Long triggerAt = call.getLong("triggerAt");

        if (notificationId == null || callId == null || callerName == null || triggerAt == null) {
            call.reject("notificationId, callId, callerName and triggerAt are required");
            return;
        }

        try {
            Context context = getContext();
            Intent intent = new Intent(context, FakeCallAlarmReceiver.class);
            intent.putExtra("callId", callId);
            intent.putExtra("callerName", callerName);
            intent.putExtra("callerNumber", call.getString("callerNumber", ""));
            intent.putExtra("callerPhotoUrl", call.getString("callerPhotoUrl", ""));

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                flags
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager unavailable");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }

            JSObject ret = new JSObject();
            ret.put("scheduled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule fake call wake: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelFakeCallWake(PluginCall call) {
        Integer notificationId = call.getInt("notificationId");
        if (notificationId == null) {
            call.reject("notificationId is required");
            return;
        }

        try {
            Context context = getContext();
            Intent intent = new Intent(context, FakeCallAlarmReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                flags
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.cancel(pendingIntent);
            }
            pendingIntent.cancel();

            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to cancel fake call wake: " + e.getMessage());
        }
    }

    @PluginMethod
    public void consumePendingFakeCallWake(PluginCall call) {
        String[] parts = FakeCallWakeStore.consume(getContext());
        if (parts == null) {
            call.resolve(null);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("callId", parts[0]);
        ret.put("callerName", parts.length > 1 ? parts[1] : "");
        if (parts.length > 2 && parts[2] != null && !parts[2].isEmpty()) {
            ret.put("callerNumber", parts[2]);
        }
        if (parts.length > 3 && parts[3] != null && !parts[3].isEmpty()) {
            ret.put("callerPhotoUrl", parts[3]);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleCheckinEscalation(PluginCall call) {
        String checkinId = call.getString("checkinId");
        Integer notificationId = call.getInt("notificationId");
        Long triggerAt = call.getLong("triggerAt");
        String message = call.getString("message");
        JSArray contacts = call.getArray("contacts");

        if (
            checkinId == null ||
            notificationId == null ||
            triggerAt == null ||
            message == null ||
            contacts == null
        ) {
            call.reject("checkinId, notificationId, triggerAt, message and contacts are required");
            return;
        }

        try {
            JSONArray contactsJson = new JSONArray();
            for (int i = 0; i < contacts.length(); i++) {
                org.json.JSONObject obj = contacts.getJSONObject(i);
                JSONObject entry = new JSONObject();
                entry.put("name", obj.optString("name", ""));
                entry.put("phone", obj.optString("phone", ""));
                contactsJson.put(entry);
            }

            CheckinEscalationStore.savePlan(
                getContext(),
                checkinId,
                notificationId,
                triggerAt,
                message,
                contactsJson
            );

            Context context = getContext();
            Intent intent = new Intent(context, CheckinExpireReceiver.class);
            intent.putExtra("checkinId", checkinId);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                flags
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager unavailable");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }

            JSObject ret = new JSObject();
            ret.put("scheduled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule check-in escalation: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelCheckinEscalation(PluginCall call) {
        String checkinId = call.getString("checkinId");
        Integer notificationId = call.getInt("notificationId");

        if (checkinId == null || notificationId == null) {
            call.reject("checkinId and notificationId are required");
            return;
        }

        try {
            Context context = getContext();
            CheckinEscalationStore.clearPlan(context, checkinId);

            Intent intent = new Intent(context, CheckinExpireReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                flags
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.cancel(pendingIntent);
            }
            pendingIntent.cancel();

            for (int i = 0; i < 20; i++) {
                Intent callIntent = new Intent(context, CheckinCallReceiver.class);
                PendingIntent callPending = PendingIntent.getBroadcast(
                    context,
                    notificationId * 100 + i + 1,
                    callIntent,
                    flags
                );
                if (alarmManager != null) {
                    alarmManager.cancel(callPending);
                }
                callPending.cancel();
            }

            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to cancel check-in escalation: " + e.getMessage());
        }
    }

    @PluginMethod
    public void consumePendingCheckinExpire(PluginCall call) {
        String checkinId = CheckinEscalationStore.consumePendingSync(getContext());
        if (checkinId == null) {
            call.resolve(null);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("checkinId", checkinId);
        call.resolve(ret);
    }

    @PluginMethod
    public void wasCheckinEscalationExecuted(PluginCall call) {
        String checkinId = call.getString("checkinId");
        if (checkinId == null) {
            call.reject("checkinId is required");
            return;
        }
        JSObject ret = new JSObject();
        ret.put(
            "executed",
            CheckinEscalationStore.wasExecuted(getContext(), checkinId)
        );
        call.resolve(ret);
    }
}
