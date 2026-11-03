package com.khmerfood.tourism;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "NativeAppUpdate")
public class NativeAppUpdatePlugin extends Plugin {

    private static final String OFFICIAL_PLAY_PACKAGE = "com.khmerfood.tourism";
    private static final int UPDATE_REQUEST_CODE = 1905;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateListener;
    private boolean autoCompleteWhenDownloaded = true;

    private synchronized AppUpdateManager getOrCreateManager(Context context) {
        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(context.getApplicationContext());
        }
        return appUpdateManager;
    }

    private synchronized void ensureInstallListenerRegistered(Context context) {
        AppUpdateManager manager = getOrCreateManager(context);
        if (installStateListener == null) {
            installStateListener = (InstallState state) -> {
                try {
                    int status = state.installStatus();
                    long downloaded = state.bytesDownloaded();
                    long total = state.totalBytesToDownload();

                    JSObject event = new JSObject();
                    event.put("installStatus", status);
                    event.put("bytesDownloaded", downloaded);
                    event.put("totalBytesToDownload", total);
                    event.put("isDownloaded", status == InstallStatus.DOWNLOADED);
                    event.put("isDownloading", status == InstallStatus.DOWNLOADING);
                    event.put("isInstalling", status == InstallStatus.INSTALLING);
                    notifyListeners("installStateChange", event);

                    if (status == InstallStatus.DOWNLOADED && autoCompleteWhenDownloaded) {
                        manager.completeUpdate();
                    }
                } catch (Exception ignored) {
                }
            };
            manager.registerListener(installStateListener);
        }
    }

    private long readCurrentVersionCode(Context context) {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return pInfo.getLongVersionCode();
            } else {
                return pInfo.versionCode;
            }
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private String readCurrentVersionName(Context context) {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return pInfo.versionName != null ? pInfo.versionName : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    private void launchPlayStoreFallback(Context context, String customPlayUrl) {
        String targetPkg = OFFICIAL_PLAY_PACKAGE;
        try {
            Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + targetPkg));
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(marketIntent);
        } catch (Exception eMarket) {
            String webUrl = (customPlayUrl != null && !customPlayUrl.trim().isEmpty())
                    ? customPlayUrl.trim()
                    : ("https://play.google.com/store/apps/details?id=" + targetPkg);
            Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(webUrl));
            webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(webIntent);
        }
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        final long currentVc = readCurrentVersionCode(context);
        final String currentVn = readCurrentVersionName(context);
        final String pkgName = context.getPackageName();

        try {
            AppUpdateManager manager = getOrCreateManager(context);
            manager.getAppUpdateInfo()
                    .addOnSuccessListener((AppUpdateInfo info) -> {
                        int availability = info.updateAvailability();
                        int installStatus = info.installStatus();
                        boolean isAvailable = availability == UpdateAvailability.UPDATE_AVAILABLE
                                || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                        boolean isDownloaded = installStatus == InstallStatus.DOWNLOADED;
                        boolean immediateAllowed = info.isUpdateTypeAllowed(
                                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
                        );
                        boolean flexibleAllowed = info.isUpdateTypeAllowed(
                                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()
                        );

                        JSObject ret = new JSObject();
                        ret.put("playStoreSupported", true);
                        ret.put("updateAvailable", isAvailable || isDownloaded);
                        ret.put("updateDownloaded", isDownloaded);
                        ret.put("updateInProgress", availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
                        ret.put("availableVersionCode", info.availableVersionCode());
                        ret.put("immediateAllowed", immediateAllowed);
                        ret.put("flexibleAllowed", flexibleAllowed);
                        ret.put("currentVersionCode", currentVc);
                        ret.put("currentVersionName", currentVn);
                        ret.put("packageName", pkgName);
                        call.resolve(ret);
                    })
                    .addOnFailureListener((Exception err) -> {
                        JSObject ret = new JSObject();
                        ret.put("playStoreSupported", false);
                        ret.put("updateAvailable", false);
                        ret.put("updateDownloaded", false);
                        ret.put("updateInProgress", false);
                        ret.put("availableVersionCode", 0);
                        ret.put("immediateAllowed", false);
                        ret.put("flexibleAllowed", false);
                        ret.put("currentVersionCode", currentVc);
                        ret.put("currentVersionName", currentVn);
                        ret.put("packageName", pkgName);
                        ret.put("reason", err != null ? err.getMessage() : "play_store_unavailable");
                        call.resolve(ret);
                    });
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("playStoreSupported", false);
            ret.put("updateAvailable", false);
            ret.put("updateDownloaded", false);
            ret.put("currentVersionCode", currentVc);
            ret.put("currentVersionName", currentVn);
            ret.put("packageName", pkgName);
            ret.put("reason", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void startInAppUpdate(PluginCall call) {
        final Context context = getContext();
        final Activity activity = getActivity();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        final String preferredMode = call.getString("mode", "immediate");
        final String fallbackPlayUrl = call.getString("playStoreUrl", "");
        this.autoCompleteWhenDownloaded = call.getBoolean("autoComplete", true);

        try {
            final AppUpdateManager manager = getOrCreateManager(context);
            ensureInstallListenerRegistered(context);

            manager.getAppUpdateInfo()
                    .addOnSuccessListener((AppUpdateInfo info) -> {
                        try {
                            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                                manager.completeUpdate();
                                JSObject ret = new JSObject();
                                ret.put("started", true);
                                ret.put("method", "complete_downloaded_update");
                                call.resolve(ret);
                                return;
                            }

                            int availability = info.updateAvailability();
                            boolean canUpdate = availability == UpdateAvailability.UPDATE_AVAILABLE
                                    || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;

                            if (canUpdate && activity != null) {
                                int desiredType = "flexible".equalsIgnoreCase(preferredMode)
                                        ? AppUpdateType.FLEXIBLE
                                        : AppUpdateType.IMMEDIATE;
                                AppUpdateOptions desiredOptions = AppUpdateOptions.newBuilder(desiredType).build();
                                AppUpdateOptions altOptions = AppUpdateOptions.newBuilder(
                                        desiredType == AppUpdateType.IMMEDIATE ? AppUpdateType.FLEXIBLE : AppUpdateType.IMMEDIATE
                                ).build();

                                AppUpdateOptions chosenOptions = null;
                                String chosenModeName = "";
                                if (info.isUpdateTypeAllowed(desiredOptions)) {
                                    chosenOptions = desiredOptions;
                                    chosenModeName = desiredType == AppUpdateType.IMMEDIATE ? "in_app_immediate" : "in_app_flexible";
                                } else if (info.isUpdateTypeAllowed(altOptions)) {
                                    chosenOptions = altOptions;
                                    chosenModeName = desiredType == AppUpdateType.IMMEDIATE ? "in_app_flexible" : "in_app_immediate";
                                }

                                if (chosenOptions != null) {
                                    final AppUpdateOptions finalOpts = chosenOptions;
                                    final String finalModeName = chosenModeName;
                                    activity.runOnUiThread(() -> {
                                        try {
                                            boolean started = manager.startUpdateFlowForResult(
                                                    info,
                                                    activity,
                                                    finalOpts,
                                                    UPDATE_REQUEST_CODE
                                            );
                                            if (started) {
                                                JSObject ret = new JSObject();
                                                ret.put("started", true);
                                                ret.put("method", finalModeName);
                                                call.resolve(ret);
                                            } else {
                                                launchPlayStoreFallback(context, fallbackPlayUrl);
                                                JSObject ret = new JSObject();
                                                ret.put("started", true);
                                                ret.put("method", "play_store_fallback");
                                                call.resolve(ret);
                                            }
                                        } catch (IntentSender.SendIntentException sendErr) {
                                            launchPlayStoreFallback(context, fallbackPlayUrl);
                                            JSObject ret = new JSObject();
                                            ret.put("started", true);
                                            ret.put("method", "play_store_fallback");
                                            call.resolve(ret);
                                        }
                                    });
                                    return;
                                }
                            }

                            launchPlayStoreFallback(context, fallbackPlayUrl);
                            JSObject ret = new JSObject();
                            ret.put("started", true);
                            ret.put("method", "play_store_listing");
                            call.resolve(ret);
                        } catch (Exception innerErr) {
                            launchPlayStoreFallback(context, fallbackPlayUrl);
                            JSObject ret = new JSObject();
                            ret.put("started", true);
                            ret.put("method", "play_store_fallback");
                            call.resolve(ret);
                        }
                    })
                    .addOnFailureListener((Exception err) -> {
                        launchPlayStoreFallback(context, fallbackPlayUrl);
                        JSObject ret = new JSObject();
                        ret.put("started", true);
                        ret.put("method", "play_store_fallback");
                        call.resolve(ret);
                    });
        } catch (Exception e) {
            launchPlayStoreFallback(context, fallbackPlayUrl);
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("method", "play_store_fallback");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void completeUpdate(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }
        try {
            AppUpdateManager manager = getOrCreateManager(context);
            manager.completeUpdate();
            JSObject ret = new JSObject();
            ret.put("completed", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("completed", false);
            ret.put("reason", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openPlayStore(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }
        String customUrl = call.getString("playStoreUrl", "");
        launchPlayStoreFallback(context, customUrl);
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        Context context = getContext();
        Activity activity = getActivity();
        if (context == null || appUpdateManager == null) {
            return;
        }
        try {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener((AppUpdateInfo info) -> {
                try {
                    if (info.installStatus() == InstallStatus.DOWNLOADED && autoCompleteWhenDownloaded) {
                        appUpdateManager.completeUpdate();
                    } else if (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS && activity != null) {
                        AppUpdateOptions opts = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build();
                        if (info.isUpdateTypeAllowed(opts)) {
                            appUpdateManager.startUpdateFlowForResult(info, activity, opts, UPDATE_REQUEST_CODE);
                        }
                    }
                } catch (Exception ignored) {
                }
            });
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (appUpdateManager != null && installStateListener != null) {
                appUpdateManager.unregisterListener(installStateListener);
                installStateListener = null;
            }
        } catch (Exception ignored) {
        }
        super.handleOnDestroy();
    }
}
