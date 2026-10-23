package com.khmerfood.tourism;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "NativeBiometricAuth")
public class NativeBiometricAuthPlugin extends Plugin {

    private static final String PREFS_NAME = "kft_admin_biometric_prefs";
    private static final String KEY_ALIAS = "KFT_ADMIN_KEYSTORE_KEY_V1";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES,
                    ANDROID_KEYSTORE
            );

            KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true);

            keyGenerator.init(builder.build());
            return keyGenerator.generateKey();
        }

        return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }

    private String encryptData(String plaintext, SharedPreferences.Editor editor) throws Exception {
        SecretKey secretKey = getOrCreateSecretKey();
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);

        byte[] iv = cipher.getIV();
        byte[] encryptedBytes = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        String ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP);
        String ciphertextBase64 = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP);

        editor.putString("cipher_iv", ivBase64);
        editor.putString("cipher_data", ciphertextBase64);
        return ciphertextBase64;
    }

    private String decryptData(String ivBase64, String ciphertextBase64) throws Exception {
        SecretKey secretKey = getOrCreateSecretKey();
        byte[] iv = Base64.decode(ivBase64, Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(ciphertextBase64, Base64.NO_WRAP);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

        byte[] decryptedBytes = cipher.doFinal(ciphertext);
        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            Context ctx = getContext();
            BiometricManager biometricManager = BiometricManager.from(ctx);
            int canAuth = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
            );

            boolean hasHardware = canAuth != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE;
            boolean isEnrolled = canAuth != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED;
            boolean isAvailable = canAuth == BiometricManager.BIOMETRIC_SUCCESS;

            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isAppEnrolled = prefs.getBoolean("is_enrolled", false);
            String savedUsername = prefs.getString("saved_username", "");

            JSObject ret = new JSObject();
            ret.put("isAvailable", isAvailable);
            ret.put("hasHardware", hasHardware);
            ret.put("isEnrolled", isEnrolled);
            ret.put("isAppEnrolled", isAppEnrolled);
            ret.put("savedUsername", savedUsername);
            ret.put("biometricType", "fingerprint");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isAvailable", false);
            ret.put("hasHardware", false);
            ret.put("isEnrolled", false);
            ret.put("isAppEnrolled", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void enrollBiometric(PluginCall call) {
        String username = call.getString("username", "admin");
        String token = call.getString("token", "");

        if (token == null || token.trim().isEmpty()) {
            call.reject("Cannot enroll: authentication token is empty");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                FragmentActivity activity = (FragmentActivity) getActivity();
                Executor executor = ContextCompat.getMainExecutor(activity);

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle("ចុះបញ្ជីស្នាមមេដៃរដ្ឋបាល")
                        .setSubtitle("ស្កេនស្នាមមេដៃដើម្បីបញ្ជាក់ការចុះបញ្ជី (Enroll Fingerprint)")
                        .setDescription("ផ្ទៀងផ្ទាត់ស្នាមមេដៃសម្រាប់រក្សាទុកសោរក្នុង Android Keystore")
                        .setNegativeButtonText("បោះបង់ (Cancel)")
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                        .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", errString.toString());
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        try {
                            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                            SharedPreferences.Editor editor = prefs.edit();

                            encryptData(token, editor);
                            editor.putString("saved_username", username);
                            editor.putBoolean("is_enrolled", true);
                            editor.apply();

                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("message", "Biometric enrolled successfully with Android Keystore");
                            call.resolve(ret);
                        } catch (Exception ex) {
                            call.reject("Keystore encryption error: " + ex.getMessage());
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                });

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                call.reject("Enrollment failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isEnrolled = prefs.getBoolean("is_enrolled", false);
        String savedUsername = prefs.getString("saved_username", "admin");
        String ivBase64 = prefs.getString("cipher_iv", null);
        String cipherDataBase64 = prefs.getString("cipher_data", null);

        if (!isEnrolled || ivBase64 == null || cipherDataBase64 == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("notEnrolled", true);
            ret.put("fallbackToPassword", true);
            ret.put("message", "Biometric not enrolled yet");
            call.resolve(ret);
            return;
        }

        String title = call.getString("title", "ច្រកចូលរដ្ឋបាលសុវត្ថិភាព");
        String subtitle = call.getString("subtitle", "ស្កេនស្នាមមេដៃដើម្បីចូល (Scan fingerprint)");
        String description = call.getString("description", "ផ្ទៀងផ្ទាត់អត្តសញ្ញាណរដ្ឋបាលប្រព័ន្ធ");
        String negativeText = call.getString("negativeButtonText", "ប្រើពាក្យសម្ងាត់ (Use Password)");

        getActivity().runOnUiThread(() -> {
            try {
                FragmentActivity activity = (FragmentActivity) getActivity();
                Executor executor = ContextCompat.getMainExecutor(activity);

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setDescription(description)
                        .setNegativeButtonText(negativeText)
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                        .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("fallbackToPassword", true);
                        ret.put("errorCode", errorCode);
                        ret.put("message", errString.toString());
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        try {
                            String decryptedToken = decryptData(ivBase64, cipherDataBase64);

                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("username", savedUsername);
                            ret.put("token", decryptedToken);
                            call.resolve(ret);
                        } catch (Exception ex) {
                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("fallbackToPassword", true);
                            ret.put("error", "Decryption failed: " + ex.getMessage());
                            call.resolve(ret);
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                });

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("fallbackToPassword", true);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void disableBiometric(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .remove("is_enrolled")
                    .remove("cipher_iv")
                    .remove("cipher_data")
                    .apply();

            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) {
                keyStore.deleteEntry(KEY_ALIAS);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to disable biometric: " + e.getMessage());
        }
    }

    @PluginMethod
    public void saveUsername(PluginCall call) {
        String username = call.getString("username", "");
        boolean remember = call.getBoolean("remember", true);

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (remember && username != null && !username.trim().isEmpty()) {
            prefs.edit().putString("saved_username", username.trim()).apply();
        } else {
            prefs.edit().remove("saved_username").apply();
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getSavedUsername(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String username = prefs.getString("saved_username", "");

        JSObject ret = new JSObject();
        ret.put("savedUsername", username);
        call.resolve(ret);
    }
}
