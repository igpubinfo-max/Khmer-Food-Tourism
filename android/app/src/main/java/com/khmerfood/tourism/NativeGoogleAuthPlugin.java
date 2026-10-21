package com.khmerfood.tourism;

import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {

    private GoogleSignInClient googleSignInClient;

    @Override
    public void load() {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken("834153814844-po5bjnuts0urg1imef38617kgpol1dq2.apps.googleusercontent.com")
                .requestEmail()
                .requestProfile()
                .build();
        googleSignInClient = GoogleSignIn.getClient(getActivity(), gso);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        // Sign out first so the Android Google account picker dialog is always displayed for the user
        googleSignInClient.signOut().addOnCompleteListener(getActivity(), task -> {
            Intent signInIntent = googleSignInClient.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleSignInResult");
        });
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (account != null) {
                JSObject ret = new JSObject();
                String email = account.getEmail();
                String name = account.getDisplayName();
                if (name == null || name.isEmpty()) {
                    name = email != null ? email.split("@")[0] : "Google User";
                }
                ret.put("id", account.getId() != null ? account.getId() : (email != null ? email : "google-user"));
                ret.put("name", name);
                ret.put("email", email != null ? email : "");
                Uri photoUrl = account.getPhotoUrl();
                ret.put("avatar", photoUrl != null ? photoUrl.toString() : "");
                call.resolve(ret);
            } else {
                call.reject("Google account is null");
            }
        } catch (ApiException e) {
            call.reject("Google sign in failed: " + e.getStatusCode() + " (" + e.getMessage() + ")", e);
        }
    }
}
