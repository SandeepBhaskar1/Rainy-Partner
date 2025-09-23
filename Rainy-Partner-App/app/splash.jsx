import React, { useEffect } from "react";
import { Image, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function SplashScreen() {

  
  const router = useRouter();

  useEffect(() => {

    const timer = setTimeout(async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("user_data");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;

        if (!userData) {
          router.replace("/login");
        } else if (userData.needs_onboarding) {
          router.replace("/onboarding");
        } else if (!userData.agreement_accepted) {
          router.replace("/agreement");
        } else {
          router.replace("/(tabs)/home");
        }
      } catch (error) {
        router.replace("/login");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <Image
        source={require("../assets/Rainy_Filter_Logo.png")}
        style={{ width: 200, height: 200 }}
      />
    </View>
  );
}
