# Khmer Food & Tourism ProGuard Rules
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep class com.khmerfood.tourism.NativeGoogleAuthPlugin { *; }
-keep class com.khmerfood.tourism.MainActivity { *; }
-dontwarn com.getcapacitor.**
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
