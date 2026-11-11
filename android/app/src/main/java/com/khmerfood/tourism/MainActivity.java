package com.khmerfood.tourism;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(NativeAbaLauncherPlugin.class);
        registerPlugin(NativeBiometricAuthPlugin.class);
        registerPlugin(NativeAppUpdatePlugin.class);
        registerPlugin(NativeAppIntegrityPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            // Anti-Debugging: Strictly disable WebView remote inspection (chrome://inspect) in release builds
            boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            if (!isDebuggable) {
                WebView.setWebContentsDebuggingEnabled(false);
            }

            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(false);
                settings.setSaveFormData(false);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);
            }
        } catch (Exception ignored) {
            // Safeguard against WebView initialization edge cases
        }
    }
}
