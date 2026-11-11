# Discover Cambodia Food & Tourism — ProGuard / R8 Code Obfuscation & Anti-Reverse-Engineering Rules
-optimizationpasses 5
-allowaccessmodification
-renamesourcefileattribute SourceFile

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep class com.khmerfood.tourism.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-dontwarn com.getcapacitor.**
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Capacitor Local Notifications (meal-time reminders): alarm receivers + plugin classes are looked up reflectively
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-dontwarn com.capacitorjs.plugins.localnotifications.**
