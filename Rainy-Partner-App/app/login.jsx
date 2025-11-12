import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/Context/AuthContext";
import { router } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { requestOtp, loginWithOTP } = useAuth();

  const sendOTP = async () => {
    if (!identifier.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }

    // Validate phone number (10 digits)
    if (identifier.length !== 10 || !/^\d{10}$/.test(identifier)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestOtp(identifier);
      
      console.log("OTP Response:", JSON.stringify(response, null, 2)); // Debug log
      
      // Check multiple possible success indicators
      const responseData = response?.data || response;
      
      // Check if request was successful
      const isSuccess = 
        response?.status === 200 ||
        response?.status === 201 ||
        responseData?.success === true ||
        responseData?.otp ||
        responseData?.message?.toLowerCase().includes('sent') ||
        responseData?.message?.toLowerCase().includes('success');
      
      if (isSuccess) {
        setOtpSent(true);
        const otpValue = responseData?.otp || response?.otp;
        
        if (__DEV__ && otpValue) {
          Alert.alert(
            "OTP Sent Successfully", 
          );
        } else {
          Alert.alert("Success", "OTP sent successfully! Please check your SMS.");
        }
      } else {
        throw new Error(responseData?.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP Send Error:", error);
      console.error("Error Response:", error.response);
      
      let message = "Failed to send OTP. Please try again.";
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (typeof error.response?.data === "string") {
        message = error.response.data;
      } else if (error.message && error.message !== "Network Error") {
        message = error.message;
      }

      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginWithOTP(identifier, otp);
      
      if (success) {
        const userDataStr = await AsyncStorage.getItem("user_data");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;

        const token = await AsyncStorage.getItem("access_token");
        if (token) {
          await SecureStore.setItemAsync("access_token", token);
        }

        if (userData?.kyc_status === "deleted") {
            Alert.alert(
              "Account Deleted",
              "Your account has been permanently deleted. Please contact support if you need additional information.",
              [
                { text: "OK", onPress: async () => {
                  await AsyncStorage.removeItem('user_data');
                  await SecureStore.deleteItemAsync('access_token');
                  router.replace("/login")
                } }
              ]
            );
            return;
          }

        if (userData?.needs_onboarding) {
          const savedLanguage = await AsyncStorage.getItem("app_language");

          if (!savedLanguage) {
            router.replace("/languageSelectionPage");
          } else {
            router.replace("/onboarding");
          } 
        } else {
          router.replace("/(tabs)/home");
        }
      } else {
        Alert.alert("Error", "Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("OTP Verify Error:", error);
      
      let message = "Invalid OTP. Please try again.";
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ImageBackground
        source={require("../assets/Rainy-Login-Background.webp")}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          resizeMode: 'cover'
        }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.9)"]}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View
              style={{
                alignItems: "center",
                marginBottom: 50,
              }}
            >
              <Image
                source={require("../assets/Rainy-Filter-Logo-01.png")}
                style={{
                  width: 100,
                  height: 100,
                  marginBottom: 16,
                  marginTop: 16
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: "white",
                  marginTop: 16,
                }}
              >
                Rainy Partner
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: "#4A90E2",
                  marginTop: 8,
                  fontWeight: "600",
                }}
              >
                Save Water, Save Future
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#B0B0B0",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                Harvesting every drop for tomorrow
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 20,
                  padding: 30,
                  backdropFilter: "blur(10px)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "white",
                    textAlign: "center",
                    marginBottom: 30,
                  }}
                >
                  {otpSent ? "Enter OTP" : "Partner Login"}
                </Text>

                {!otpSent ? (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <Ionicons name="call" size={20} color="#666" />
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          paddingLeft: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 16,
                            fontWeight: "600",
                            marginRight: 8,
                            paddingVertical: 16,
                          }}
                        >
                          +91
                        </Text>
                        <TextInput
                          style={{
                            flex: 1,
                            color: "white",
                            fontSize: 16,
                            paddingVertical: 16,
                          }}
                          placeholder="Enter Phone Number"
                          placeholderTextColor="#999"
                          value={identifier}
                          onChangeText={setIdentifier}
                          keyboardType="phone-pad"
                          maxLength={10}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        {
                          backgroundColor: "#4A90E2",
                          borderRadius: 12,
                          paddingVertical: 16,
                          alignItems: "center",
                          marginTop: 10,
                        },
                        isLoading && styles.buttonDisabled,
                      ]}
                      onPress={sendOTP}
                      disabled={isLoading}
                    >
                      <Text style={styles.buttonText}>
                        {isLoading ? "Sending..." : "Send OTP"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Ionicons name="key" size={20} color="#666" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#999"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        {
                          backgroundColor: "#4A90E2",
                          borderRadius: 12,
                          paddingVertical: 16,
                          alignItems: "center",
                          marginTop: 10,
                        },
                        isLoading && { backgroundColor: "#666" },
                      ]}
                      onPress={verifyOTP}
                      disabled={isLoading}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 16,
                          fontWeight: "bold",
                        }}
                      >
                        {isLoading ? "Verifying..." : "Verify & Login"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        alignItems: "center",
                        marginTop: 20,
                      }}
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                    >
                      <Text
                        style={{
                          color: "#4A90E2",
                          fontSize: 14,
                        }}
                      >
                        ← Change Number
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    paddingVertical: 16,
    paddingLeft: 12,
  },
});
