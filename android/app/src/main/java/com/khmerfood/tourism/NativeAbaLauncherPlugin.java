package com.khmerfood.tourism;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAbaLauncher")
public class NativeAbaLauncherPlugin extends Plugin {

    private static final String ABA_PACKAGE = "com.ababank.mobile";
    private static final String ABA_SCHEME_URI = "abamobilebank://";

    @PluginMethod
    public void openAbaMobile(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        PackageManager pm = context.getPackageManager();
        JSObject ret = new JSObject();

        try {
            // 1. First priority: Direct launch intent by package name
            Intent launchIntent = pm.getLaunchIntentForPackage(ABA_PACKAGE);
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(launchIntent);
                ret.put("success", true);
                ret.put("method", "package_launch");
                call.resolve(ret);
                return;
            }

            // 2. Second priority: Launch via deep link URI
            Intent uriIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(ABA_SCHEME_URI));
            uriIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (uriIntent.resolveActivity(pm) != null) {
                context.startActivity(uriIntent);
                ret.put("success", true);
                ret.put("method", "scheme_uri");
                call.resolve(ret);
                return;
            }

            // 3. Third priority: Try explicit Intent URI format
            try {
                Intent parsedIntent = Intent.parseUri("intent://#Intent;scheme=abamobilebank;package=com.ababank.mobile;end", Intent.URI_INTENT_SCHEME);
                parsedIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (parsedIntent.resolveActivity(pm) != null) {
                    context.startActivity(parsedIntent);
                    ret.put("success", true);
                    ret.put("method", "intent_parsed");
                    call.resolve(ret);
                    return;
                }
            } catch (Exception ignored) {
            }

            // 4. Fallback: ABA Mobile is not installed on the device -> Open Google Play Store
            try {
                Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + ABA_PACKAGE));
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(marketIntent);
                ret.put("success", false);
                ret.put("reason", "not_installed_opened_market");
                call.resolve(ret);
                return;
            } catch (Exception eMarket) {
                Intent webStoreIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + ABA_PACKAGE));
                webStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(webStoreIntent);
                ret.put("success", false);
                ret.put("reason", "not_installed_opened_web");
                call.resolve(ret);
                return;
            }

        } catch (Exception e) {
            call.reject("Error launching ABA Mobile: " + e.getMessage(), "LAUNCH_ERROR", e);
        }
    }
}
