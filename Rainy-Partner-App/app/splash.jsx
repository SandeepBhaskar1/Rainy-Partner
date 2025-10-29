import React, { useEffect } from "react";
import {
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
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
      } catch {
        router.replace("/login");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar hidden />
      <Image
        source={require("../assets/Rainy-Filter-Logo-01.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* You can add other content here if needed */}
      </Image>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    resizeMode: 'cover',
  },
});