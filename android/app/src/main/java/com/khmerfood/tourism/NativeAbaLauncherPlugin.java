package com.khmerfood.tourism;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "NativeAbaLauncher")
public class NativeAbaLauncherPlugin extends Plugin {

    private static final String OFFICIAL_ABA_PACKAGE = "com.paygo24.ibank";
    private static final String[] ABA_PACKAGES = {
        "com.paygo24.ibank",
        "com.ababank.mobile"
    };
    private static final String ABA_SCHEME_URI = "abamobilebank://";

    private long lastSaveTimestampMs = 0;
    private String lastSavedFileName = "";

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
            for (String pkg : ABA_PACKAGES) {
                try {
                    Intent launchIntent = pm.getLaunchIntentForPackage(pkg);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        context.startActivity(launchIntent);
                        ret.put("success", true);
                        ret.put("method", "package_launch");
                        ret.put("package", pkg);
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception ignored) {
                }
            }

            try {
                Intent uriIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(ABA_SCHEME_URI));
                uriIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (uriIntent.resolveActivity(pm) != null) {
                    context.startActivity(uriIntent);
                    ret.put("success", true);
                    ret.put("method", "scheme_uri");
                    call.resolve(ret);
                    return;
                }
            } catch (Exception ignored) {
            }

            try {
                Intent parsedIntent = Intent.parseUri("intent://#Intent;scheme=abamobilebank;package=" + OFFICIAL_ABA_PACKAGE + ";end", Intent.URI_INTENT_SCHEME);
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

            try {
                Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + OFFICIAL_ABA_PACKAGE));
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(marketIntent);
                ret.put("success", false);
                ret.put("reason", "not_installed_opened_market");
                call.resolve(ret);
                return;
            } catch (Exception eMarket) {
                Intent webStoreIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + OFFICIAL_ABA_PACKAGE));
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

    /**
     * Saves a Base64 PNG/JPEG image directly to the Android device's Gallery / Photos (MediaStore)
     * Compatible with Android 10+ Scoped Storage (API 29-35) and Android 9 and below.
     */
    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        String base64Data = call.getString("base64Data", "");
        String fileName = call.getString("fileName", "ABA_KHQR_" + System.currentTimeMillis() + ".png");
        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Missing base64Data");
            return;
        }

        // Prevent duplicate rapid saves within 2.5 seconds
        long now = System.currentTimeMillis();
        if (now - lastSaveTimestampMs < 2500 && fileName.equals(lastSavedFileName)) {
            JSObject dupRet = new JSObject();
            dupRet.put("success", true);
            dupRet.put("duplicatePrevented", true);
            dupRet.put("fileName", fileName);
            call.resolve(dupRet);
            return;
        }

        try {
            String cleanBase64 = base64Data;
            int commaIdx = cleanBase64.indexOf(',');
            if (commaIdx != -1) {
                cleanBase64 = cleanBase64.substring(commaIdx + 1);
            }

            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            if (bitmap == null) {
                call.reject("Could not decode QR image bytes");
                return;
            }

            ContentResolver resolver = context.getContentResolver();
            Uri savedUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KhmerFoodTourism");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                savedUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (savedUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }

                try (OutputStream out = resolver.openOutputStream(savedUri)) {
                    if (out == null || !bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
                        call.reject("Failed to write PNG stream to Gallery");
                        return;
                    }
                }

                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(savedUri, values, null, null);
            } else {
                File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                File appDir = new File(picturesDir, "KhmerFoodTourism");
                if (!appDir.exists()) {
                    appDir.mkdirs();
                }
                File imageFile = new File(appDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
                    fos.flush();
                }
                MediaScannerConnection.scanFile(
                    context,
                    new String[]{ imageFile.getAbsolutePath() },
                    new String[]{ "image/png" },
                    null
                );
                savedUri = Uri.fromFile(imageFile);
            }

            lastSaveTimestampMs = now;
            lastSavedFileName = fileName;

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fileName", fileName);
            ret.put("uri", savedUri != null ? savedUri.toString() : "");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save QR image to Gallery: " + e.getMessage(), "SAVE_ERROR", e);
        }
    }

    /**
     * Opens the native Android Photo Picker / Gallery to select an existing image (such as a saved QR code or food photo)
     * and returns its Base64 data URL safely.
     */
    @PluginMethod
    public void pickImageFromGallery(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp"});
            startActivityForResult(call, Intent.createChooser(intent, "Select Image"), "handleGalleryPickResult");
        } catch (Exception e) {
            call.reject("Could not launch gallery picker: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleGalleryPickResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject cancelledRet = new JSObject();
            cancelledRet.put("success", false);
            cancelledRet.put("cancelled", true);
            call.resolve(cancelledRet);
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        Uri uri = result.getData().getData();
        ContentResolver resolver = context.getContentResolver();

        try {
            String mimeType = resolver.getType(uri);
            if (mimeType == null || !mimeType.startsWith("image/")) {
                mimeType = "image/png";
            }

            String fileName = "selected_image_" + System.currentTimeMillis() + ".png";
            try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIdx >= 0) {
                        String foundName = cursor.getString(nameIdx);
                        if (foundName != null && !foundName.isEmpty()) {
                            fileName = foundName;
                        }
                    }
                }
            } catch (Exception ignored) {
            }

            Bitmap bitmap;
            try (InputStream is = resolver.openInputStream(uri)) {
                if (is == null) {
                    call.reject("Cannot open selected image stream");
                    return;
                }
                bitmap = BitmapFactory.decodeStream(is);
            }

            if (bitmap == null) {
                call.reject("Selected file is not a valid image");
                return;
            }

            // Keep crisp resolution up to 1400px for accurate QR decoding and sharp photo previews
            int maxDim = 1400;
            int w = bitmap.getWidth();
            int h = bitmap.getHeight();
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((float) h * maxDim / w);
                    w = maxDim;
                } else {
                    w = Math.round((float) w * maxDim / h);
                    h = maxDim;
                }
                bitmap = Bitmap.createScaledBitmap(bitmap, w, h, true);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            boolean isPng = mimeType.contains("png") || fileName.toLowerCase().endsWith(".png");
            if (isPng) {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
                mimeType = "image/png";
            } else {
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, baos);
                mimeType = "image/jpeg";
            }

            String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            String dataUrl = "data:" + mimeType + ";base64," + base64;

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("cancelled", false);
            ret.put("dataUrl", dataUrl);
            ret.put("fileName", fileName);
            ret.put("mimeType", mimeType);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error reading selected image: " + e.getMessage());
        }
    }
}
