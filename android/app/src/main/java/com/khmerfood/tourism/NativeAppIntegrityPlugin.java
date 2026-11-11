package com.khmerfood.tourism;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import android.os.Debug;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "NativeAppIntegrity")
public class NativeAppIntegrityPlugin extends Plugin {

    private static final String OFFICIAL_PACKAGE = "com.khmerfood.tourism";
    private static final String OFFICIAL_CERT_SHA256 = "09d17b383e644867035a726843592b63579c0055ac59f339e686034cfe5a1a9e";

    @PluginMethod
    public void getIntegrityInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            String pkg = context.getPackageName();
            String certSha256 = extractCertSha256(pm, pkg);
            String installer = extractInstallerPackage(pm, pkg);

            boolean isOfficialPkg = OFFICIAL_PACKAGE.equals(pkg);
            boolean isOfficialSig = OFFICIAL_CERT_SHA256.equalsIgnoreCase(certSha256);
            boolean isPlayStore = "com.android.vending".equals(installer);
            boolean isDebugged = detectDebuggerAttached(context);
            boolean isClonedContainer = detectClonedMultiSpaceContainer(context, pkg);
            boolean isHookDetected = detectHookFrameworks();

            boolean isGenuine = isOfficialPkg && isOfficialSig && !isDebugged && !isClonedContainer && !isHookDetected;

            long bucket = System.currentTimeMillis() / 300000L; // 5-minute window
            String rawAttest = pkg + ":" + certSha256.toLowerCase(Locale.US) + ":" + bucket + ":kft_native_v1";
            String attestSig = sha256Hex(rawAttest.getBytes(StandardCharsets.UTF_8));

            JSObject ret = new JSObject();
            ret.put("packageName", pkg);
            ret.put("certSha256", certSha256);
            ret.put("installerPackage", installer != null ? installer : "");
            ret.put("isOfficialPackage", isOfficialPkg);
            ret.put("isOfficialSignature", isOfficialSig);
            ret.put("isPlayStoreInstall", isPlayStore);
            ret.put("isDebugged", isDebugged);
            ret.put("isClonedContainer", isClonedContainer);
            ret.put("isHookDetected", isHookDetected);
            ret.put("isGenuine", isGenuine);
            ret.put("timestampBucket", bucket);
            ret.put("attestationSig", attestSig);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Integrity check failed: " + e.getMessage(), e);
        }
    }

    private boolean detectDebuggerAttached(Context context) {
        try {
            if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
                return true;
            }
            boolean isDebuggableFlag = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            // Only flag release-signed builds that somehow have JDWP debugger attached
            if (!isDebuggableFlag && Debug.isDebuggerConnected()) {
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private boolean detectClonedMultiSpaceContainer(Context context, String expectedPackage) {
        try {
            File filesDir = context.getFilesDir();
            if (filesDir == null) return false;
            String path = filesDir.getAbsolutePath().toLowerCase(Locale.US);
            // Must contain the official package name inside its private data directory
            if (!path.contains(expectedPackage.toLowerCase(Locale.US))) {
                return true;
            }
            // Known Android App Cloner / Parallel Space / Dual App virtual container markers
            String[] clonerMarkers = new String[] {
                "parallel_intl",
                "com.lbe.parallel",
                "com.excelliance.dualaid",
                "com.ludashi.dualspace",
                "io.va.exposed",
                "virtualapp",
                "multiapp",
                "com.polestar.super.clone",
                "com.applisto.appcloner"
            };
            for (String marker : clonerMarkers) {
                if (path.contains(marker)) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private boolean detectHookFrameworks() {
        try {
            String[] suspiciousClasses = new String[] {
                "de.robv.android.xposed.XposedBridge",
                "de.robv.android.xposed.XC_MethodHook",
                "com.saurik.substrate.MS$2"
            };
            for (String cls : suspiciousClasses) {
                try {
                    Class.forName(cls);
                    return true;
                } catch (ClassNotFoundException ignored) {
                }
            }
            throw new Exception("kft_stack_probe");
        } catch (Exception e) {
            for (StackTraceElement frame : e.getStackTrace()) {
                String cn = frame.getClassName().toLowerCase(Locale.US);
                if (cn.contains("xposed") || cn.contains("frida") || cn.contains("substrate")) {
                    return true;
                }
            }
        }
        return false;
    }

    @SuppressWarnings("deprecation")
    private String extractCertSha256(PackageManager pm, String packageName) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo pkgInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo signingInfo = pkgInfo.signingInfo;
                if (signingInfo != null) {
                    Signature[] sigs = signingInfo.hasMultipleSigners()
                            ? signingInfo.getApkContentsSigners()
                            : signingInfo.getSigningCertificateHistory();
                    if (sigs != null && sigs.length > 0 && sigs[0] != null) {
                        return sha256Hex(sigs[0].toByteArray());
                    }
                }
            }
            PackageInfo legacyInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
            if (legacyInfo.signatures != null && legacyInfo.signatures.length > 0 && legacyInfo.signatures[0] != null) {
                return sha256Hex(legacyInfo.signatures[0].toByteArray());
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    @SuppressWarnings("deprecation")
    private String extractInstallerPackage(PackageManager pm, String packageName) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo info = pm.getInstallSourceInfo(packageName);
                if (info != null && info.getInstallingPackageName() != null) {
                    return info.getInstallingPackageName();
                }
            }
            return pm.getInstallerPackageName(packageName);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String sha256Hex(byte[] input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input);
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
