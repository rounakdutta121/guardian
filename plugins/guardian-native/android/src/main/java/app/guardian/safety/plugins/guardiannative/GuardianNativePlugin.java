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

        if (!smsGranted) {
            requestPermissionForAlias("sms", call, "emergencyPermsCallback");
            return;
        }
        if (!phoneGranted) {
            requestPermissionForAlias("phone", call, "emergencyPermsCallback");
            return;
        }

        resolvePermissions(call);
    }

    @PermissionCallback
    private void emergencyPermsCallback(PluginCall call) {
        boolean smsGranted = getPermissionState("sms") == PermissionState.GRANTED;
        boolean phoneGranted = getPermissionState("phone") == PermissionState.GRANTED;

        if (!smsGranted) {
            requestPermissionForAlias("sms", call, "emergencyPermsCallback");
            return;
        }
        if (!phoneGranted) {
            requestPermissionForAlias("phone", call, "emergencyPermsCallback");
            return;
        }

        resolvePermissions(call);
    }

    private void resolvePermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("sms", getPermissionState("sms") == PermissionState.GRANTED);
        ret.put("phone", getPermissionState("phone") == PermissionState.GRANTED);
        call.resolve(ret);
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
            call.reject("SMS permission denied — enable in Settings to send automatically");
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

                ArrayList<String> parts = smsManager.divideMessage(text);
                if (parts.size() > 1) {
                    smsManager.sendMultipartTextMessage(number, null, parts, null, null);
                } else {
                    smsManager.sendTextMessage(number, null, text, null, null);
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
            call.reject("Phone permission denied — enable in Settings to call automatically");
        }
    }

    private void executePlaceCall(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.isEmpty()) {
            call.reject("number is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + number));
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
