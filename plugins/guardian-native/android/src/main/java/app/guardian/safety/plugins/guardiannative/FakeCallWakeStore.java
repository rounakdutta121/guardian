package app.guardian.safety.plugins.guardiannative;

import android.content.Context;
import android.content.SharedPreferences;

final class FakeCallWakeStore {
    private static final String PREFS = "guardian_fake_call_wake";
    private static final String KEY_PENDING = "pending";

    private FakeCallWakeStore() {}

    static void save(
        Context context,
        String callId,
        String callerName,
        String callerNumber,
        String callerPhotoUrl
    ) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(
                KEY_PENDING,
                callId +
                "\u0000" +
                (callerName != null ? callerName : "") +
                "\u0000" +
                (callerNumber != null ? callerNumber : "") +
                "\u0000" +
                (callerPhotoUrl != null ? callerPhotoUrl : "")
            )
            .apply();
    }

    static String[] consume(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_PENDING, null);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        prefs.edit().remove(KEY_PENDING).apply();
        String[] parts = raw.split("\u0000", -1);
        if (parts.length < 2) {
            return null;
        }
        return parts;
    }
}
