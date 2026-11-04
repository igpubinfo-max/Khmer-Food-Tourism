package com.khmerfood.tourism;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(NativeAbaLauncherPlugin.class);
        registerPlugin(NativeBiometricAuthPlugin.class);
        registerPlugin(NativeAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
