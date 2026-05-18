const appJson = require("./app.json");

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const { expo } = appJson;
  return {
    ...expo,
    extra: {
      ...expo.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
      apiKey: process.env.EXPO_PUBLIC_API_KEY ?? "",
    },
  };
};
