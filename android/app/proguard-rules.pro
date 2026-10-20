# Khmer Food & Tourism - Production R8/ProGuard Hardening Rules

# 1. Keep Capacitor and WebView JavaScript bridge interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.** { *; }

# 2. Preserve native plugins and models
-keep class com.khmerfood.tourism.** { *; }
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# 3. Strip debug logs in production release builds to prevent information leakage
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

# 4. Obfuscation & optimization directives
-repackageclasses 'com.khmerfood.tourism.internal'
-allowaccessmodification
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
