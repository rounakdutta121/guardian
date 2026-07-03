package app.guardian.safety.plugins.guardiannative;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
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
}
