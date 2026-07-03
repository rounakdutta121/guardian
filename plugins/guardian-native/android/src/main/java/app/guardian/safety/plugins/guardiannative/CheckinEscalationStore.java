package app.guardian.safety.plugins.guardiannative;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

final class CheckinEscalationStore {
    private static final String PREFS = "guardian_checkin_escalation";
    private static final String KEY_PENDING_SYNC = "pending_sync_checkin_id";
    private static final String KEY_EXECUTED_PREFIX = "executed_";
    private static final String KEY_CALLS_PREFIX = "calls_";

    private CheckinEscalationStore() {}

    static void savePlan(
        Context context,
        String checkinId,
        int notificationId,
        long triggerAt,
        String message,
        JSONArray contacts
    ) throws Exception {
        JSONObject plan = new JSONObject();
        plan.put("checkinId", checkinId);
        plan.put("notificationId", notificationId);
        plan.put("triggerAt", triggerAt);
        plan.put("message", message);
        plan.put("contacts", contacts);

        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(planKey(checkinId), plan.toString())
            .apply();
    }

    static JSONObject loadPlan(Context context, String checkinId) {
        try {
            String raw =
                context
                    .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(planKey(checkinId), null);
            if (raw == null || raw.isEmpty()) return null;
            return new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static void clearPlan(Context context, String checkinId) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(planKey(checkinId))
            .remove(KEY_EXECUTED_PREFIX + checkinId)
            .remove(KEY_CALLS_PREFIX + checkinId)
            .apply();
    }

    static void markExecuted(Context context, String checkinId) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_EXECUTED_PREFIX + checkinId, true)
            .putString(KEY_PENDING_SYNC, checkinId)
            .apply();
    }

    static boolean wasExecuted(Context context, String checkinId) {
        return context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_EXECUTED_PREFIX + checkinId, false);
    }

    static void markCallsCompleted(Context context, String checkinId) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_CALLS_PREFIX + checkinId, true)
            .apply();
    }

    static boolean wereCallsCompleted(Context context, String checkinId) {
        return context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_CALLS_PREFIX + checkinId, false);
    }

    static String consumePendingSync(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String id = prefs.getString(KEY_PENDING_SYNC, null);
        if (id != null) {
            prefs.edit().remove(KEY_PENDING_SYNC).apply();
        }
        return id;
    }

    private static String planKey(String checkinId) {
        return "plan_" + checkinId;
    }
}
