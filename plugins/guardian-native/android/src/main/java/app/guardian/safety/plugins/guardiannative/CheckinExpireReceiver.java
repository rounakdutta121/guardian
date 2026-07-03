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

        final PendingResult pendingResult = goAsync();
        new Thread(() -> {
            try {
                startEscalation(context, checkinId);
            } catch (Exception e) {
                Log.e(TAG, "Expire receiver failed", e);
                runEscalationInline(context, checkinId);
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    private void startEscalation(Context context, String checkinId) {
        Intent serviceIntent = new Intent(context, CheckinEscalationService.class);
        serviceIntent.putExtra("checkinId", checkinId);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (IllegalStateException | SecurityException e) {
            Log.e(TAG, "Foreground service blocked, running inline", e);
            runEscalationInline(context, checkinId);
        }
    }

    private void runEscalationInline(Context context, String checkinId) {
        if (CheckinEscalationStore.wasExecuted(context, checkinId)) {
            Log.i(TAG, "Escalation already executed for " + checkinId);
            return;
        }
        JSONObject plan = CheckinEscalationStore.loadPlan(context, checkinId);
        if (plan == null) return;
        boolean ok = CheckinEscalationExecutor.execute(context, plan);
        Log.i(TAG, "Inline escalation done checkinId=" + checkinId + " ok=" + ok);
    }
}
