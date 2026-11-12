plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.bayaestate.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Required by flutter_local_notifications.
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.bayaestate.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Two installable apps from one codebase — same UI/logic, different
    // applicationId, display name, and Firebase project (google-services.json
    // under src/<flavor>/). API endpoint is still chosen via the existing
    // --dart-define=API_BASE_URL, independent of the flavor.
    flavorDimensions += "brand"
    productFlavors {
        create("bayaestate") {
            dimension = "brand"
            applicationId = "com.bayaestate.app"
            resValue(type = "string", name = "app_name", value = "BayaEstate")
        }
        create("pronesto") {
            dimension = "brand"
            applicationId = "com.pronesto.app"
            resValue(type = "string", name = "app_name", value = "Pronesto")
        }
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
            // Disabled outright rather than chased further: R8 was on by
            // default for release here (confirmed by the obfuscated res/*
            // paths a built release APK actually contained) and silently
            // broke the ring feature's FCM-to-Dart handoff even after
            // fixing the resource-stripping issue, adding targeted keep
            // rules for every class in the chain (confirmed unobfuscated
            // in mapping.txt), and adding the attribute-preservation rules
            // Firebase/Gson's reflection typically needs — still no
            // reproducible fix. Minification is a pure APK-size
            // optimization with no functional upside here (this app isn't
            // Play-Store size-constrained); eliminating it removes this
            // entire class of silent-failure risk instead of continuing to
            // guess at rules. proguard-rules.pro is kept for if this is
            // ever revisited.
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
