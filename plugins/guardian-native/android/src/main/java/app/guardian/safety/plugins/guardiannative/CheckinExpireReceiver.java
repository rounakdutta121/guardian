package app.guardian.safety.plugins.guardiannative;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import org.json.JSONObject;

public class CheckinExpireReceiver extends BroadcastReceiver {
    private static final String TAG = "GuardianCheckin";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String checkinId = intent.getStringExtra("checkinId");
        if (checkinId == null) return;

        JSONObject plan = CheckinEscalationStore.loadPlan(context, checkinId);
        if (plan == null) {
            Log.w(TAG, "No plan for checkinId=" + checkinId);
            return;
        }

        Log.i(TAG, "Check-in expire alarm fired for " + checkinId);

        Intent serviceIntent = new Intent(context, CheckinEscalationService.class);
        serviceIntent.putExtra("checkinId", checkinId);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }

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
}
