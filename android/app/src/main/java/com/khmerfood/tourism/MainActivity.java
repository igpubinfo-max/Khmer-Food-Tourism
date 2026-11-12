package com.khmerfood.tourism;

import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
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

            configureResponsiveWebView();
        } catch (Exception ignored) {
            // Safeguard against WebView initialization edge cases
        }
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                final WebView webView = getBridge().getWebView();
                webView.requestLayout();
                webView.postDelayed(() -> {
                    try {
                        webView.requestLayout();
                        webView.evaluateJavascript(
                            "(function(){try{window.scrollTo(0,0);window.dispatchEvent(new Event('resize'));window.dispatchEvent(new CustomEvent('kft:viewport-change'));}catch(e){}})();",
                            null
                        );
                    } catch (Exception ignored) {}
                }, 60);
            }
        } catch (Exception ignored) {}
    }

    private void configureResponsiveWebView() {
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

            // Responsive viewport & foldable screen continuity (Samsung Galaxy Z Fold5 / multi-window)
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setTextZoom(100);

            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }
    }
}