package com.khmerfood.tourism;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
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
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
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
import java.net.HttpURLConnection;
import java.net.URL;

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
            dupRet.put("saved", true);
            dupRet.put("success", true);
            dupRet.put("duplicate", true);
            dupRet.put("duplicatePrevented", true);
            dupRet.put("fileName", fileName);
            call.resolve(dupRet);
            return;
        }

        try {
            String headerPart = "";
            String cleanBase64 = base64Data;
            int commaIdx = cleanBase64.indexOf(',');
            if (commaIdx != -1) {
                headerPart = cleanBase64.substring(0, commaIdx).toLowerCase();
                cleanBase64 = cleanBase64.substring(commaIdx + 1);
            }

            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
            if (decodedBytes == null || decodedBytes.length < 32) {
                call.reject("Could not decode QR image bytes");
                return;
            }

            // Detect original MIME type (PNG vs JPEG) and write raw bytes 100% losslessly without recompression
            boolean isPng = headerPart.contains("image/png") ||
                (decodedBytes.length > 8 &&
                 (decodedBytes[0] & 0xFF) == 0x89 &&
                 (decodedBytes[1] & 0xFF) == 0x50 &&
                 (decodedBytes[2] & 0xFF) == 0x4E &&
                 (decodedBytes[3] & 0xFF) == 0x47);
            String mimeType = isPng ? "image/png" : "image/jpeg";
            String finalFileName = fileName;
            if (isPng && !finalFileName.toLowerCase().endsWith(".png")) {
                finalFileName = finalFileName + ".png";
            } else if (!isPng && !finalFileName.toLowerCase().endsWith(".jpg") && !finalFileName.toLowerCase().endsWith(".jpeg")) {
                finalFileName = finalFileName + ".jpg";
            }

            ContentResolver resolver = context.getContentResolver();
            Uri savedUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, finalFileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KhmerFoodTourism");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                savedUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (savedUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }

                try (OutputStream out = resolver.openOutputStream(savedUri)) {
                    if (out == null) {
                        call.reject("Failed to open Gallery output stream");
                        return;
                    }
                    out.write(decodedBytes);
                    out.flush();
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
                File imageFile = new File(appDir, finalFileName);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(decodedBytes);
                    fos.flush();
                }
                MediaScannerConnection.scanFile(
                    context,
                    new String[]{ imageFile.getAbsolutePath() },
                    new String[]{ mimeType },
                    null
                );
                savedUri = Uri.fromFile(imageFile);
            }

            lastSaveTimestampMs = now;
            lastSavedFileName = fileName;

            JSObject ret = new JSObject();
            ret.put("saved", true);
            ret.put("success", true);
            ret.put("fileName", finalFileName);
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
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelledRet = new JSObject();
            cancelledRet.put("success", false);
            cancelledRet.put("cancelled", true);
            call.resolve(cancelledRet);
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null && result.getData().getClipData() != null && result.getData().getClipData().getItemCount() > 0) {
            uri = result.getData().getClipData().getItemAt(0).getUri();
        }
        if (uri == null) {
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

            String dataUrl = processUriToDataUrl(getContext(), uri, 1080);
            if (dataUrl == null) {
                call.reject("Selected file is not a valid image");
                return;
            }
            mimeType = "image/jpeg";

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

    /**
     * Helper method to convert an image Uri into an optimized Base64 data URL.
     * Uses inSampleSize scaling to prevent OutOfMemoryError when reading high-resolution camera photos.
     */
    private String processUriToDataUrl(Context context, Uri uri, int maxDim) {
        ContentResolver resolver = context.getContentResolver();
        try {
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inJustDecodeBounds = true;
            try (InputStream is = resolver.openInputStream(uri)) {
                if (is != null) {
                    BitmapFactory.decodeStream(is, null, opts);
                }
            }
            if (opts.outWidth <= 0 || opts.outHeight <= 0) {
                return null;
            }

            int origW = opts.outWidth;
            int origH = opts.outHeight;
            int sampleSize = 1;
            while ((origW / sampleSize) > (maxDim * 1.5) || (origH / sampleSize) > (maxDim * 1.5)) {
                sampleSize *= 2;
            }

            opts.inJustDecodeBounds = false;
            opts.inSampleSize = sampleSize;

            Bitmap bitmap;
            try (InputStream is = resolver.openInputStream(uri)) {
                if (is == null) return null;
                bitmap = BitmapFactory.decodeStream(is, null, opts);
            }
            if (bitmap == null) return null;

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
                Bitmap scaled = Bitmap.createScaledBitmap(bitmap, w, h, true);
                if (scaled != bitmap) {
                    bitmap.recycle();
                    bitmap = scaled;
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, baos);
            bitmap.recycle();

            String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            return "data:image/jpeg;base64," + base64;
        } catch (Throwable t) {
            return null;
        }
    }

    /**
     * Opens native Android Gallery with MULTI-SELECT enabled (Intent.EXTRA_ALLOW_MULTIPLE).
     * Users can select several photos in one step, returned as an array of Data URLs.
     */
    @PluginMethod
    public void pickMultipleImagesFromGallery(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp"});
            startActivityForResult(call, Intent.createChooser(intent, "Select Photos (Multiple)"), "handleMultipleGalleryPickResult");
        } catch (Exception e) {
            call.reject("Could not launch multi-gallery picker: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleMultipleGalleryPickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelledRet = new JSObject();
            cancelledRet.put("success", false);
            cancelledRet.put("cancelled", true);
            cancelledRet.put("dataUrls", new JSArray());
            cancelledRet.put("count", 0);
            call.resolve(cancelledRet);
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        JSArray dataUrls = new JSArray();
        int maxImages = call.getInt("maxCount", 12);
        int maxDim = call.getInt("maxDimension", 1200);

        Intent data = result.getData();
        ClipData clipData = data.getClipData();
        if (clipData != null) {
            int count = Math.min(clipData.getItemCount(), maxImages);
            for (int i = 0; i < count; i++) {
                Uri uri = clipData.getItemAt(i).getUri();
                if (uri != null) {
                    String dataUrl = processUriToDataUrl(context, uri, maxDim);
                    if (dataUrl != null) {
                        dataUrls.put(dataUrl);
                    }
                }
            }
        } else if (data.getData() != null) {
            String dataUrl = processUriToDataUrl(context, data.getData(), maxDim);
            if (dataUrl != null) {
                dataUrls.put(dataUrl);
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", dataUrls.length() > 0);
        ret.put("cancelled", false);
        ret.put("dataUrls", dataUrls);
        ret.put("count", dataUrls.length());
        call.resolve(ret);
    }

    /**
     * Copies text directly to the Android system clipboard.
     */
    @PluginMethod
    public void copyToClipboard(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }
        String text = call.getString("text", "");
        String label = call.getString("label", "Discover Cambodia Food & Tourism");
        try {
            ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard != null) {
                ClipData clip = ClipData.newPlainText(label, text);
                clipboard.setPrimaryClip(clip);
            }
            JSObject ret = new JSObject();
            ret.put("copied", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Clipboard error: " + e.getMessage());
        }
    }

    /**
     * Opens any HTTPS URL (such as an APK or ZIP download link) directly in the system's external browser
     * so Capacitor WebView does not swallow or block file downloads.
     */
    @PluginMethod
    public void openExternalUrl(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }
        String url = call.getString("url", "");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Missing url");
            return;
        }
        try {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(browserIntent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open external URL: " + e.getMessage());
        }
    }

    /**
     * Resolves a photoUrl (bundled APK asset, Base64 data URL, or remote HTTP/HTTPS URL)
     * into a temporary file in cache/shared_images so it can be shared via FileProvider.
     */
    private File resolveShareImageFile(Context context, String photoUrl) {
        if (photoUrl == null || photoUrl.trim().isEmpty()) {
            return null;
        }
        try {
            File shareDir = new File(context.getCacheDir(), "shared_images");
            if (!shareDir.exists()) {
                shareDir.mkdirs();
            }
            // Clean up old cached share files (> 1 hour old)
            File[] existing = shareDir.listFiles();
            long now = System.currentTimeMillis();
            if (existing != null) {
                for (File f : existing) {
                    if (now - f.lastModified() > 3600_000L) {
                        f.delete();
                    }
                }
            }

            String trimmed = photoUrl.trim();
            boolean isPngAsset = trimmed.toLowerCase().startsWith("data:image/png") || trimmed.toLowerCase().endsWith(".png");
            File outFile = new File(shareDir, "kft_share_" + now + (isPngAsset ? ".png" : ".jpg"));

            if (trimmed.startsWith("data:image/")) {
                int commaIdx = trimmed.indexOf(',');
                String base64Part = commaIdx != -1 ? trimmed.substring(commaIdx + 1) : trimmed;
                byte[] decoded = Base64.decode(base64Part, Base64.DEFAULT);
                if (decoded != null && decoded.length > 32) {
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(decoded);
                        fos.flush();
                    }
                    return outFile;
                }
            }

            // Check if it's a bundled asset path (e.g., "/Shop/rest-1.jpg", "/foods/food-1.jpg", or "https://localhost/Shop/...")
            String assetRelPath = null;
            if (trimmed.startsWith("/")) {
                assetRelPath = trimmed;
            } else if (trimmed.contains("localhost/")) {
                int idx = trimmed.indexOf("localhost/");
                assetRelPath = trimmed.substring(idx + "localhost".length());
            }
            if (assetRelPath != null) {
                int qIdx = assetRelPath.indexOf('?');
                if (qIdx != -1) {
                    assetRelPath = assetRelPath.substring(0, qIdx);
                }
                String fullAssetPath = "public" + (assetRelPath.startsWith("/") ? assetRelPath : "/" + assetRelPath);
                try (InputStream is = context.getAssets().open(fullAssetPath);
                     FileOutputStream fos = new FileOutputStream(outFile)) {
                    byte[] buf = new byte[8192];
                    int read;
                    while ((read = is.read(buf)) != -1) {
                        fos.write(buf, 0, read);
                    }
                    fos.flush();
                    if (outFile.exists() && outFile.length() > 0) {
                        return outFile;
                    }
                } catch (Exception ignored) {
                }
            }

            // Remote HTTP/HTTPS image URL
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(trimmed);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(4500);
                    conn.setReadTimeout(4500);
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14)");
                    conn.connect();
                    if (conn.getResponseCode() >= 200 && conn.getResponseCode() < 300) {
                        try (InputStream is = conn.getInputStream();
                             FileOutputStream fos = new FileOutputStream(outFile)) {
                            byte[] buf = new byte[8192];
                            int read;
                            while ((read = is.read(buf)) != -1) {
                                fos.write(buf, 0, read);
                            }
                            fos.flush();
                        }
                        if (outFile.exists() && outFile.length() > 0) {
                            return outFile;
                        }
                    }
                } catch (Exception ignored) {
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /**
     * Opens the native Android Share Sheet (Intent.ACTION_SEND + Intent.createChooser)
     * with restaurant/food name, photo (via FileProvider), description, location, and direct links
     * for Telegram, Facebook, Messenger, WhatsApp, Line, and all installed apps.
     */
    @PluginMethod
    public void shareContent(PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        final String title = call.getString("title", "Discover Cambodia Food & Tourism");
        final String text = call.getString("text", "");
        final String url = call.getString("url", "");
        final String photoUrl = call.getString("photoUrl", "");

        new Thread(() -> {
            try {
                StringBuilder fullTextBuilder = new StringBuilder();
                if (text != null && !text.trim().isEmpty()) {
                    fullTextBuilder.append(text.trim());
                }
                if (url != null && !url.trim().isEmpty() && !fullTextBuilder.toString().contains(url.trim())) {
                    if (fullTextBuilder.length() > 0) {
                        fullTextBuilder.append("\n\n");
                    }
                    fullTextBuilder.append(url.trim());
                }
                final String finalShareText = fullTextBuilder.toString();

                File sharedImageFile = resolveShareImageFile(context, photoUrl);
                Uri tempUri = null;
                if (sharedImageFile != null && sharedImageFile.exists() && sharedImageFile.length() > 0) {
                    try {
                        tempUri = FileProvider.getUriForFile(
                            context,
                            context.getPackageName() + ".fileprovider",
                            sharedImageFile
                        );
                    } catch (Exception ignored) {
                        tempUri = null;
                    }
                }
                final Uri contentUri = tempUri;

                Activity activity = getActivity();
                Runnable launchShare = () -> {
                    try {
                        Intent sendIntent = new Intent(Intent.ACTION_SEND);
                        if (contentUri != null) {
                            sendIntent.setType("image/*");
                            sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                            sendIntent.putExtra(Intent.EXTRA_TITLE, title);
                            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                            sendIntent.putExtra(Intent.EXTRA_TEXT, finalShareText);
                            sendIntent.setClipData(ClipData.newUri(context.getContentResolver(), title, contentUri));
                            sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } else {
                            sendIntent.setType("text/plain");
                            sendIntent.putExtra(Intent.EXTRA_TITLE, title);
                            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                            sendIntent.putExtra(Intent.EXTRA_TEXT, finalShareText);
                        }

                        Intent chooser = Intent.createChooser(
                            sendIntent,
                            (title != null && !title.isEmpty()) ? title : "ចែករំលែកតាមរយៈ / Share via"
                        );
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                        if (activity != null) {
                            activity.startActivity(chooser);
                        } else {
                            context.startActivity(chooser);
                        }

                        JSObject ret = new JSObject();
                        ret.put("shared", true);
                        ret.put("hasImage", contentUri != null);
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("Failed to open Android Share Sheet: " + e.getMessage());
                    }
                };

                if (activity != null) {
                    activity.runOnUiThread(launchShare);
                } else {
                    launchShare.run();
                }
            } catch (Exception e) {
                call.reject("Share error: " + e.getMessage());
            }
        }).start();
    }
}
