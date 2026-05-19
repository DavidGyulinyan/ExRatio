const fs = require("fs");
const path = require("path");
const appJson = require("./app.json");
const pkg = require("./package.json");

const GOOGLE_SERVICES_FILE = "./google-services.json";
const hasGoogleServices = fs.existsSync(
  path.join(__dirname, GOOGLE_SERVICES_FILE)
);

const NOTIFICATION_ICON = "./assets/images/app-notification-icon.png";
const NOTIFICATION_COLOR = "#F07E25";

const LOCATION_PERMISSION =
  "Capital uses your location to suggest your local currency for conversions.";

function pluginName(entry) {
  return Array.isArray(entry) ? entry[0] : entry;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const { expo } = appJson;

  const { notifications: _deprecatedNotifications, ...expoBase } = expo;

  const updates = { ...(expo.updates ?? {}) };
  delete updates.channel;

  const basePlugins = (expo.plugins ?? []).filter(
    (p) =>
      pluginName(p) !== "expo-notifications" &&
      pluginName(p) !== "expo-location" &&
      pluginName(p) !== "expo-build-properties"
  );

  const plugins = [
    ...basePlugins,
    [
      "expo-notifications",
      {
        icon: NOTIFICATION_ICON,
        color: NOTIFICATION_COLOR,
        iosDisplayInForeground: true,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: LOCATION_PERMISSION,
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
  ];

  const versionCode = parseInt(process.env.ANDROID_VERSION_CODE ?? "1", 10);

  return {
    ...expoBase,
    version: pkg.version,
    updates,
    plugins,
    android: {
      ...expo.android,
      versionCode: Number.isFinite(versionCode) ? versionCode : 1,
      ...(hasGoogleServices
        ? { googleServicesFile: GOOGLE_SERVICES_FILE }
        : {}),
    },
    ios: {
      ...expo.ios,
      buildNumber: process.env.IOS_BUILD_NUMBER ?? "1",
    },
    extra: {
      ...expo.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
      apiKey: process.env.EXPO_PUBLIC_API_KEY ?? "",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  };
};
