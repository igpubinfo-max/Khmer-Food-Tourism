package com.khmerfood.tourism;

import android.accounts.AccountManager;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        try {
            // Android OS native Google account selector
            // Displays the official system dialog showing all Google/Gmail accounts on this phone
            Intent intent = AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    new String[]{"com.google"},
                    null,
                    null,
                    null,
                    null
            );
            startActivityForResult(call, intent, "handleAccountPickerResult");
        } catch (Exception e) {
            call.reject("Google account picker error: " + e.getMessage(), "ERROR", e);
        }
    }

    @ActivityCallback
    private void handleAccountPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == android.app.Activity.RESULT_CANCELED) {
            call.reject("Google sign in cancelled by user", "12501");
            return;
        }

        Intent data = result.getData();
        if (data != null) {
            String email = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
            if (email != null && !email.trim().isEmpty()) {
                String cleanEmail = email.trim().toLowerCase();
                String rawName = cleanEmail.split("@")[0];
                String displayName = formatDisplayName(rawName);

                JSObject ret = new JSObject();
                ret.put("id", "google-" + cleanEmail.replaceAll("[^a-zA-Z0-9]", "_"));
                ret.put("name", displayName);
                ret.put("email", cleanEmail);
                ret.put("avatar", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80");
                call.resolve(ret);
                return;
            }
        }
        call.reject("No Google account was selected", "12501");
    }

    private String formatDisplayName(String raw) {
        if (raw == null || raw.isEmpty()) return "Google User";
        String[] parts = raw.split("[._-]");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(Character.toUpperCase(part.charAt(0)));
                if (part.length() > 1) {
                    sb.append(part.substring(1));
                }
            }
        }
        return sb.length() > 0 ? sb.toString() : raw;
    }
}
