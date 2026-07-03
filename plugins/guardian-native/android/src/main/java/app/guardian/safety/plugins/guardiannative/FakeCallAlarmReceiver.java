package app.guardian.safety.plugins.guardiannative;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class FakeCallAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String callId = intent.getStringExtra("callId");
        String callerName = intent.getStringExtra("callerName");
        if (callId == null || callerName == null) return;

        FakeCallWakeStore.save(
            context,
            callId,
            callerName,
            intent.getStringExtra("callerNumber"),
            intent.getStringExtra("callerPhotoUrl")
        );

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;

        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        context.startActivity(launch);
    }
}
