# R8 rules for the release build (minifyEnabled + shrinkResources in build.gradle), on top of
# proguard-android-optimize.txt (which already keeps @JavascriptInterface methods) and the consumer
# rules shipped by Capacitor and AndroidX.
#
# The game itself is JavaScript running in the WebView. The Java side is the Capacitor / Cordova
# runtime plus MainActivity, and that runtime works by reflection: plugins are instantiated by class
# name from assets/capacitor.plugins.json, their methods are found through @CapacitorPlugin /
# @PluginMethod annotations, and Cordova creates plugins by name from res/xml/config.xml. The runtime
# is small, so keep it whole rather than risk a release-only crash; R8 still shrinks and optimises
# AndroidX and Kotlin, which is where the size goes.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class com.shaunflint.novacorsair.** { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Readable stack traces. CI uploads mapping.txt (and the App Bundle embeds it for Play Console).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Compile-time-only annotations that some libraries reference without shipping them.
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn org.checkerframework.**
