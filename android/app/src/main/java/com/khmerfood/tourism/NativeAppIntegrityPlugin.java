package com.khmerfood.tourism;

import android.content.Context;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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
            boolean isGenuine = isOfficialPkg && isOfficialSig;

            long bucket = System.currentTimeMillis() / 300000L; // 5-minute window
            String rawAttest = pkg + ":" + certSha256.toLowerCase() + ":" + bucket + ":kft_native_v1";
            String attestSig = sha256Hex(rawAttest.getBytes(StandardCharsets.UTF_8));

            JSObject ret = new JSObject();
            ret.put("packageName", pkg);
            ret.put("certSha256", certSha256);
            ret.put("installerPackage", installer != null ? installer : "");
            ret.put("isOfficialPackage", isOfficialPkg);
            ret.put("isOfficialSignature", isOfficialSig);
            ret.put("isPlayStoreInstall", isPlayStore);
            ret.put("isGenuine", isGenuine);
            ret.put("timestampBucket", bucket);
            ret.put("attestationSig", attestSig);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Integrity check failed: " + e.getMessage(), e);
        }
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
