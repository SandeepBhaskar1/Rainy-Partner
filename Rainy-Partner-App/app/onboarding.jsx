import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../src/Context/AuthContext";

export default function Onboarding() {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    pin: "",
    city: "",
    district: "",
    state: "",
    service_area_pin: "",
    experience: "",
    tools: "",
    aadhaar_number: "",
    plumber_license_number: "",
    profile: "",
    aadhaar_front: "",
    aadhaar_back: "",
    license_front: "",
    license_back: "",
  });

  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const [images, setImages] = useState({
    profile: null,
    aadhaar_front: null,
    aadhaar_back: null,
    license_front: null,
    license_back: null,
  });

  const [signedUrls, setSignedUrls] = useState({
    profile: null,
    aadhaar_front: null,
    aadhaar_back: null,
    license_front: null,
    license_back: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getSignedUrlFromKey = async (s3Key, token) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/get-image`,
        { key: s3Key },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        return response.data.url;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error getting Signed URL:", error);
      return null;
    }
  };

  const loadSignedUrl = async (s3Key, docType) => {
    if (!s3Key) return;

    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        console.warn("Token not found for loading signed URL");
        return;
      }
      const signedUrl = await getSignedUrlFromKey(s3Key, token);

      if (signedUrl) {
        setSignedUrls((prev) => ({
          ...prev,
          [docType]: signedUrl,
        }));
      }
    } catch (error) {
      console.error("Error loading signed URL:", error);
    }
  };

  useEffect(() => {
    Object.keys(formData).forEach((key) => {
      if (
        formData[key] &&
        [
          "profile",
          "aadhaar_front",
          "aadhaar_back",
          "license_front",
          "license_back",
        ].includes(key)
      ) {
        loadSignedUrl(formData[key], key);
      }
    });
  }, [formData]);

  const fetchPinCode = async (pin) => {
    if (pin.length === 6) {
      try {
        const response = await axios.get(
          `https://api.postalpincode.in/pincode/${pin}`
        );
        const data = response.data;

        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setFormData((prev) => ({
            ...prev,
            pin: pin,
            city: postOffice.Block,
            district: postOffice.District,
            state: postOffice.State,
          }));
        } else {
          Alert.alert(
            t("onboarding.invalidPinCode"),
            t("onboarding.enterValidPin")
          );
          setFormData((prev) => ({
            ...prev,
            pin: "",
            city: "",
            district: "",
            state: "",
          }));
        }
      } catch (error) {
        console.error("Error fetching PIN code data:", error);
        Alert.alert(t("common.error"), t("onboarding.errorFetchingLocation"));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        city: "",
        district: "",
        state: "",
      }));
    }
  };

  const pickImage = async (type) => {
    Alert.alert(t("onboarding.uploadImage"), t("settings.selectLanguage"), [
      {
        text: t("onboarding.takePhoto"),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            alert(t("onboarding.cameraPermissionRequired"));
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

          if (!result.canceled) {
            const file = await validateAndSetImage(result.assets[0], type);
            if (file) {
              await handleUpload(type, file);
            }
          }
        },
      },
      {
        text: t("onboarding.chooseFromGallery"),
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            alert(t("onboarding.mediaPermissionRequired"));
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

          if (!result.canceled) {
            const file = await validateAndSetImage(result.assets[0], type);
            if (file) {
              await handleUpload(type, file);
            }
          }
        },
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const validateAndSetImage = async (file, docType) => {
    const fileUri = file.uri;
    const ext = file.mimeType.split("/")[1];

    const allowedFileTypes = ["jpg", "jpeg", "png"];

    if (!allowedFileTypes.includes(ext)) {
      Alert.alert(
        t("onboarding.invalidFileType"),
        t("onboarding.selectValidFileType")
      );
      return null;
    }

    const info = await FileSystem.getInfoAsync(file.uri);
    if (info.size > MAX_FILE_SIZE) {
      Alert.alert(
        t("onboarding.fileTooLarge"),
        t("onboarding.fileSizeExceeds")
      );
      return null;
    }

    const validatedFile = {
      uri: fileUri,
      type: `image/${ext}`,
      ext,
      docType,
    };

    setImages((prev) => ({
      ...prev,
      [docType]: validatedFile,
    }));
    return validatedFile;
  };

  const extractS3Key = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error("Error extracting S3 Key:", error);
      return url;
    }
  };

  const uploadToS3 = async (fileUri, signedUrl, fileType) => {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();

      await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileType,
        },
        body: blob,
      });
      const cleanUrl = signedUrl.split("?")[0];
      return cleanUrl;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      Alert.alert(
        t("onboarding.uploadFailed"),
        t("onboarding.couldNotUploadFile")
      );
      return null;
    }
  };

  const handleUpload = async (docType, file) => {
    if (!file) {
      Alert.alert(`${t("onboarding.noFileSelected")} ${docType}`);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        console.warn("Token not found in SecureStore");
        Alert.alert(
          t("onboarding.sessionExpired"),
          t("onboarding.pleaseLoginAgain"),
          [
            {
              text: t("onboarding.goToLogin"),
              onPress: async () => {
                try {
                  await SecureStore.deleteItemAsync("access_token");
                  await AsyncStorage.removeItem("user_data");
                  router.replace("/login");
                } catch (error) {
                  console.error("Error clearing storage:", error);
                }
              },
            },
          ]
        );
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/uploadurl`,
        {
          docType: file.docType,
          fileType: file.ext,
          fileName: `${Date.now()}-${docType}.${file.ext}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.url) {
        throw new Error("No signed URL received from server");
      }

      const signedUrl = response.data.url;
      const uploadedUrl = await uploadToS3(file.uri, signedUrl, file.type);

      if (uploadedUrl) {
        const s3Key = extractS3Key(uploadedUrl);
        updateFormData(docType, s3Key);
      }
    } catch (error) {
      console.error("Error uploading file:", error);

      if (error.response?.status === 401) {
        Alert.alert(
          t("common.error"),
          t("onboarding.sessionExpiredLoginAgain")
        );
      } else if (error.response?.status === 400) {
        Alert.alert(t("common.error"), t("onboarding.invalidFileFormat"));
      } else {
        Alert.alert(
          t("common.error"),
          error.response?.data?.message || t("onboarding.couldNotUploadFile")
        );
      }
    }
  };

  const submitOnboarding = async () => {
    setIsLoading(true);

    if (
      !formData.name ||
      !formData.address ||
      !formData.pin ||
      !formData.city ||
      !formData.district ||
      !formData.state ||
      !formData.service_area_pin ||
      !formData.experience ||
      !formData.tools ||
      !formData.aadhaar_number ||
      !formData.plumber_license_number
    ) {
      Alert.alert(t("common.error"), t("onboarding.fillAllFields"));
      setIsLoading(false);
      return;
    }

    if (
      !formData.aadhaar_front ||
      !formData.aadhaar_back ||
      !formData.license_front ||
      !formData.license_back
    ) {
      Alert.alert(t("common.error"), t("onboarding.uploadAllDocuments"));
      setIsLoading(false);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("access_token");
      const userDataString = await AsyncStorage.getItem("user_data");
      const userData = userDataString ? JSON.parse(userDataString) : null;

      if (!token) {
        Alert.alert(t("common.error"), t("onboarding.tokenNotFound"));
        setIsLoading(false);
        return;
      }

      if (!userData || !userData.id || !userData.phone) {
        Alert.alert(t("common.error"), t("onboarding.userDataMissing"));
        setIsLoading(false);
        return;
      }

      const payload = {
        id: userData.id,
        phone: userData.phone,
        name: formData.name,
        address: formData.address,
        pin: formData.pin,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        service_area_pin: formData.service_area_pin,
        experience: formData.experience,
        tools: formData.tools,
        aadhaar_number: formData.aadhaar_number,
        plumber_license_number: formData.plumber_license_number,
        profile: formData.profile,
        aadhaar_front: formData.aadhaar_front,
        aadhaar_back: formData.aadhaar_back,
        license_front: formData.license_front,
        license_back: formData.license_back,
      };

      const response = await axios.post(
        `${BACKEND_URL}/onboarding`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data;

      if (result.token) {
        await SecureStore.setItemAsync("access_token", result.token);
      }

      if (result.user) {
        await AsyncStorage.setItem("user_data", JSON.stringify(result.user));
      }

      router.replace("/agreement");
    } catch (error) {
      console.error(
        "Onboarding Error",
        error.response?.data || error.message || error
      );
      Alert.alert(
        t("onboarding.onboardingFailed"),
        t("onboarding.pleaseTryAgain")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("onboarding.title")}</Text>
          <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("onboarding.personalInfo")}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("onboarding.fullName")}</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => updateFormData("name", text)}
                placeholder={t("onboarding.enterFullName")}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("onboarding.completeAddress")}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => updateFormData("address", text)}
                placeholder={t("onboarding.houseNumberStreet")}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t("onboarding.pinCode")}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.pin}
                  onChangeText={(text) => {
                    updateFormData("pin", text);
                    fetchPinCode(text);
                  }}
                  placeholder={t("onboarding.sixDigitPin")}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t("onboarding.city")}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => updateFormData("city", text)}
                  placeholder={t("onboarding.yourCity")}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t("onboarding.district")}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.district}
                  onChangeText={(text) => updateFormData("district", text)}
                  placeholder={t("onboarding.districtPlaceholder")}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t("onboarding.state")}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => updateFormData("state", text)}
                  placeholder={t("onboarding.statePlaceholder")}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("onboarding.professionalInfo")}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("onboarding.serviceAreaPins")}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.service_area_pin}
                onChangeText={(text) =>
                  updateFormData("service_area_pin", text)
                }
                placeholder={t("onboarding.pinsCommaSeparated")}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("onboarding.experienceYears")}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.experience}
                onChangeText={(text) => updateFormData("experience", text)}
                placeholder={t("onboarding.yearsOfExperience")}
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("onboarding.toolsEquipment")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.tools}
                onChangeText={(text) => updateFormData("tools", text)}
                placeholder={t("onboarding.listToolsEquipment")}
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("onboarding.kycDocuments")}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("onboarding.aadhaarNumber")}</Text>
              <TextInput
                style={styles.input}
                value={formData.aadhaar_number}
                onChangeText={(text) => updateFormData("aadhaar_number", text)}
                placeholder={t("onboarding.twelveDigitAadhaar")}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={12}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("onboarding.plumberLicenseNumber")}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.plumber_license_number}
                onChangeText={(text) =>
                  updateFormData("plumber_license_number", text)
                }
                placeholder={t("onboarding.licenseNumber")}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("onboarding.uploadDocuments")}
            </Text>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>
                {t("onboarding.profilePhoto")}
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("profile")}
              >
                {images.profile ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image
                      source={{ uri: images.profile.uri }}
                      style={styles.uploadedImage}
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#34C759"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>
                      {t("onboarding.uploadProfilePhoto")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>
                {t("onboarding.aadhaarFront")}
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("aadhaar_front")}
              >
                {images.aadhaar_front ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image
                      source={{ uri: images.aadhaar_front.uri }}
                      style={styles.uploadedImage}
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#34C759"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document" size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>
                      {t("onboarding.uploadAadhaarCard")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>
                {t("onboarding.aadhaarBack")}
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("aadhaar_back")}
              >
                {images.aadhaar_back ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image
                      source={{ uri: images.aadhaar_back.uri }}
                      style={styles.uploadedImage}
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#34C759"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document" size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>
                      {t("onboarding.uploadAadhaarCard")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>
                {t("onboarding.licenseFront")}
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("license_front")}
              >
                {images.license_front ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image
                      source={{ uri: images.license_front.uri }}
                      style={styles.uploadedImage}
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#34C759"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document" size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>
                      {t("onboarding.uploadLicense")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>
                {t("onboarding.licenseBack")}
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("license_back")}
              >
                {images.license_back ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image
                      source={{ uri: images.license_back.uri }}
                      style={styles.uploadedImage}
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#34C759"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document" size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>
                      {t("onboarding.uploadLicense")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={submitOnboarding}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading
                ? t("onboarding.submitting")
                : t("onboarding.submitForVerification")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() =>
              Alert.alert(t("home.confirmLogout"), t("home.areYouSure"), [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("common.logout"), onPress: logout },
              ])
            }
          >
            <Text style={styles.logoutButtonText}>{t("common.logout")}</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  uploadText: {
    fontSize: 14,
    color: "#4A90E2",
    marginTop: 8,
    fontWeight: "500",
  },
  uploadedImageContainer: {
    position: "relative",
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  uploadedOverlay: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: "#4A90E2",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    width: '90%',
    backgroundColor: "#FF3B30",
    alignSelf: "center",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  skipButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4A90E2",
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomSpacer: {
    height: 40,
  },
  autoFillIndicator: {
    fontSize: 12,
    color: "#34C759",
    marginTop: 4,
    fontWeight: "500",
  },
  autoFilledInput: {
    borderColor: "#34C759",
    backgroundColor: "#F0FFF4",
  },
});
