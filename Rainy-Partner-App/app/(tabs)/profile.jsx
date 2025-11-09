import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  TextInput,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/Context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSelector from "../languageSelector";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const { t, currentLanguage, languages } = useLanguage();
  const [imageUrl, setImageUrl] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState(null);
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const cogButtonRef = useRef(null);
  const [editedData, setEditedData] = useState({
    email: "",
    address: "",
    city: "",
    state: "",
    pin: "",
    experience: "",
    tools: "",
    service_area_pin: "",
  });

  const [isModified, setIsModified] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;
  const router = useRouter();

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["plumber-profile"],
    queryFn: async () => {
      const response = await axios.get(`${BACKEND_URL}/plumber/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error("Error refreshing profile:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrivecy = () => {
    router.push("/privecyPolicyScreen");
  };

  const handleTerms = () => {
    router.push("/termsScreen");
  };

  const handleContactSupport = () => {
    const email = "sales@rainyfilters.com";
    const subject = "Support Request";
    const body = "";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mailtoUrl);
        } else {
          alert("Unable to open mail app");
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };

  useEffect(() => {
    if (!profile?.profile) return;

    const getProfileImage = async () => {
      try {
        const response = await axios.post(
          `${BACKEND_URL}/get-image`,
          { key: profile.profile },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );
        setImageUrl(response.data.url);
      } catch (error) {
        console.error("❌ Full error:", error);
        console.error("❌ Error response:", error.response?.data);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getProfileImage();
  }, [profile?.profile, token]);

  useEffect(() => {
    if (profile) {
      setEditedData({
        email: profile.email || "",
        address: profile.address?.address || "",
        city: profile.address?.city || "",
        state: profile.address?.state || "",
        pin: profile.address?.pin?.toString() || "",
        experience: profile.experience?.toString() || "",
        tools: Array.isArray(profile.tools)
          ? profile.tools.join(", ")
          : profile.tools || "",
        service_area_pin: Array.isArray(profile.service_area_pin)
          ? profile.service_area_pin.join(", ")
          : profile.service_area_pin || "",
      });
    }
  }, [profile]);


const handleDeleteAccount = async () => {
  try {
    setDropdownVisible(false);

    const checkResponse = await axios.get(
      `${BACKEND_URL}/plumber/check-deletion-eligibility`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { canDelete, incompleteJobs, unfulfilledOrders } = checkResponse.data;

    if (!canDelete) {
      let message = 'Please complete the following before deleting your account:\n\n';
      
      if (incompleteJobs > 0) {
        message += `• ${incompleteJobs} incomplete assigned job(s)\n`;
      }
      if (unfulfilledOrders > 0) {
        message += `• ${unfulfilledOrders} unfulfilled order(s)\n`;
      }
      
      Alert.alert(
        'Cannot Delete Account',
        message,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.put(
                `${BACKEND_URL}/plumber/delete-account`,
                { kyc_status: 'deleted' },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              Alert.alert(
                'Account Deleted',
                'Your account has been deleted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      logout();
                      router.replace('/login');
                    },
                  },
                ],
                { cancelable: false }
              );
            } catch (deleteError) {
              console.error('Error deleting account:', deleteError);
              Alert.alert(
                'Error',
                deleteError.response?.data?.detail || 
                'Failed to delete account. Please try again later.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          },
        },
      ]
    );

  } catch (error) {
    console.error('Error checking deletion eligibility:', error);
    Alert.alert(
      'Error',
      error.response?.data?.detail || 
      'Something went wrong. Please try again later.',
      [{ text: 'OK', style: 'default' }]
    );
  }
};

  const getKycStatusInfo = (status) => {
    switch (status) {
      case "approved":
        return {
          color: "#34C759",
          icon: "checkmark-circle",
          text: t("profile.kycApproved"),
        };
      case "rejected":
        return {
          color: "#FF3B30",
          icon: "close-circle",
          text: t("profile.kycRejected"),
        };
      default:
        return {
          color: "#FF9500",
          icon: "time",
          text: t("profile.kycPending"),
        };
    }
  };

  const handleLogout = () => {
    Alert.alert(t("home.confirmLogout"), t("home.areYouSure"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleDropdown = () => {
    cogButtonRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPosition({
        top: y + height + 5, 
        right: 10, 
      });
      setDropdownVisible(true);
    });
  };

  const handleInputChange = (key, value) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
    setIsModified(true);
  };

  const handleSave = async () => {
    try {
      const payload = {};

      if (editedData.email && editedData.email !== profile.email) {
        payload.email = editedData.email;
      }

      if (
        editedData.address !== profile.address?.address ||
        editedData.city !== profile.address?.city ||
        editedData.state !== profile.address?.state ||
        editedData.pin !== profile.address?.pin
      ) {
        payload.address = {
          address: editedData.address,
          city: editedData.city,
          state: editedData.state,
          pin: editedData.pin,
        };
      }

      if (
        editedData.experience &&
        Number(editedData.experience) !== profile.experience
      ) {
        payload.experience = Number(editedData.experience);
      }

      if (
        editedData.service_area_pin &&
        editedData.service_area_pin !==
          (Array.isArray(profile.service_area_pin)
            ? profile.service_area_pin.join(", ")
            : profile.service_area_pin)
      ) {
        payload.service_area_pin = editedData.service_area_pin
          .split(",")
          .map((pin) => pin.trim())
          .filter((pin) => pin.length > 0);
      }

      if (
        editedData.tools &&
        editedData.tools !==
          (Array.isArray(profile.tools)
            ? profile.tools.join(", ")
            : profile.tools)
      ) {
        payload.tools = editedData.tools
          .split(",")
          .map((tool) => tool.trim())
          .filter((tool) => tool.length > 0);
      }

      if (Object.keys(payload).length === 0) {
        Alert.alert("No Changes", "You haven’t modified anything.");
        return;
      }

      await axios.put(`${BACKEND_URL}/plumber/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Profile updated successfully.");
      await refetch();
      setIsEditing(false);
      setIsModified(false);
    } catch (error) {
      console.error("Error updating profile:", error.response?.data || error);
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to update profile."
      );
    }
  };

  useEffect(() => {
    const fetchCoordinatorDetails = async () => {
      const coordinatorId = profile.coordinator_id;
      if (!coordinatorId) {
        return;
      }

      try {
        const response = await axios.get(
          `${BACKEND_URL}/plumber/coordinator/${coordinatorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCoordinatorInfo(response.data);
      } catch (error) {
        console.error("Error fetching coordinator details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
    };

    if (profile) {
      fetchCoordinatorDetails();
    }
  }, [profile?.coordinator_id, user?.coordinator_id, token, BACKEND_URL]);

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kycInfo = getKycStatusInfo(profile.kyc_status);
  const currentLang = languages.find((lang) => lang.code === currentLanguage);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.title}>{t("common.profile")}</Text>
        <View style={styles.rightButtons}>
          <TouchableOpacity
            ref={cogButtonRef}
            onPress={handleDropdown}
            style={styles.logoutButton}
          >
            <Ionicons name="cog" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              { top: dropdownPosition.top, right: dropdownPosition.right },
            ]}
          >
            <View style={styles.arrowBorder} />
            <View style={styles.arrowFill} />

            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={handleDeleteAccount}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                <Text style={styles.deleteText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4A90E2"]}
          />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {profile.name || t("profile.notProvided")}
          </Text>
          <Text style={styles.phone}>{profile.phone}</Text>
          <Text style={styles.phone}>{profile.user_id || "N/A"}</Text>

          <View style={[styles.kycBadge, { backgroundColor: kycInfo.color }]}>
            <Ionicons name={kycInfo.icon} size={16} color="white" />
            <Text style={styles.kycText}>KYC {kycInfo.text}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.preferences")}</Text>

          <TouchableOpacity
            style={styles.languageItem}
            onPress={() => setShowLanguageSelector(true)}
          >
            <View style={styles.languageLeft}>
              <Ionicons name="language" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t("settings.language")}</Text>
                <Text style={styles.infoValue}>{currentLang?.nativeName}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.enquireButoonContainer}>
          <TouchableOpacity
            style={styles.enquireButton}
            onPress={() => {
              const phoneNumber = coordinatorInfo.phone.replace(/[^0-9]/g, "");
              const whatsappUrl = `https://wa.me/91${phoneNumber}`;

              Linking.openURL(whatsappUrl).catch((err) => {
                console.error("Error opening WhatsApp:", err);
                Alert.alert("Error", "Could not open WhatsApp");
              });
            }}
          >
            <Ionicons
              style={{ color: "white" }}
              name="logo-whatsapp"
              size={25}
            />
            <Text style={{ color: "white", fontSize: 16, fontWeight: 700 }}>
              Send Enquiry
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={styles.sectionTitle01}>
              {t("profile.personalInfo")}
            </Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create" size={20} color="#999" />
              </TouchableOpacity>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                {isModified && (
                  <TouchableOpacity onPress={handleSave}>
                    <Ionicons name="save" size={22} color="#4A90E2" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setEditedData({
                      email: profile.email || "",
                      address: profile.address?.address || "",
                      experience: profile.experience?.toString() || "",
                    });
                    setIsEditing(false);
                    setIsModified(false);
                  }}
                >
                  <Ionicons name="close" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.email")}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedData.email}
                  onChangeText={(text) => handleInputChange("email", text)}
                  placeholder="Enter email"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile.email || t("profile.notProvided")}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={[styles.infoContent, { flex: 1 }]}>
              <Text style={styles.infoLabel}>{t("profile.address")}</Text>

              {isEditing ? (
                <View style={{ width: "100%" }}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    value={editedData.address || ""}
                    onChangeText={(text) => handleInputChange("address", text)}
                    placeholder="House No. / Street / Area"
                  />

                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    value={editedData.city || ""}
                    onChangeText={(text) => handleInputChange("city", text)}
                    placeholder="City / District"
                    autoCapitalize="words"
                  />

                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    value={editedData.state || ""}
                    onChangeText={(text) => handleInputChange("state", text)}
                    placeholder="State"
                    autoCapitalize="words"
                  />

                  <TextInput
                    style={styles.input}
                    value={editedData.pin || ""}
                    onChangeText={(text) => handleInputChange("pin", text)}
                    placeholder="Pincode"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {profile.address &&
                  (profile.address.address ||
                    profile.address.city ||
                    profile.address.state ||
                    profile.address.pin)
                    ? `${profile.address.address || ""}${
                        profile.address.city ? ", " + profile.address.city : ""
                      }${
                        profile.address.state
                          ? ", " + profile.address.state
                          : ""
                      }${
                        profile.address.pin ? " - " + profile.address.pin : ""
                      }`
                    : t("profile.notProvided")}
                </Text>
              )}
            </View>
          </View>

          {/* Experience */}
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.experience")}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedData.experience}
                  onChangeText={(text) => handleInputChange("experience", text)}
                  placeholder="Enter experience"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile.experience || 0} {t("profile.years")}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.coordinator")}</Text>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.name}>
                {coordinatorInfo?.name || t("profile.notProvided")}
              </Text>
            </View>
          </View>

          {coordinatorInfo?.phone && (
            <TouchableOpacity
              style={styles.infoItem}
              onPress={() => {
                const phoneNumber = coordinatorInfo.phone.replace(
                  /[^0-9]/g,
                  ""
                );
                const phoneUrl = `tel:+91${phoneNumber}`;

                Linking.openURL(phoneUrl).catch((err) => {
                  console.error("Error opening dialer:", err);
                  Alert.alert("Error", "Could not open phone dialer");
                });
              }}
            >
              <Ionicons name="call" size={20} color="#03afffff" />
              <View style={styles.infoContent}>
                <Text style={styles.name}>+91 {coordinatorInfo.phone}</Text>
              </View>
            </TouchableOpacity>
          )}

          {coordinatorInfo?.phone && (
            <TouchableOpacity
              style={styles.infoItem}
              onPress={() => {
                const phoneNumber = coordinatorInfo.phone.replace(
                  /[^0-9]/g,
                  ""
                );
                const whatsappUrl = `https://wa.me/91${phoneNumber}`;

                Linking.openURL(whatsappUrl).catch((err) => {
                  console.error("Error opening WhatsApp:", err);
                  Alert.alert("Error", "Could not open WhatsApp");
                });
              }}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <View style={styles.infoContent}>
                <Text style={styles.name}>+91 {coordinatorInfo.phone}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={styles.sectionTitle}>
              {t("profile.professionalInfo")}
            </Text>

            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create" size={20} color="#999" />
              </TouchableOpacity>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                {isModified && (
                  <TouchableOpacity onPress={handleSave}>
                    <Ionicons name="save" size={22} color="#4A90E2" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setEditedData({
                      ...editedData,
                      service_area_pin: Array.isArray(profile.service_area_pin)
                        ? profile.service_area_pin.join(", ")
                        : profile.service_area_pin || "",
                      tools: Array.isArray(profile.tools)
                        ? profile.tools.join(", ")
                        : profile.tools || "",
                    });
                    setIsEditing(false);
                    setIsModified(false);
                  }}
                >
                  <Ionicons name="close" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Service Area PIN */}
          <View style={styles.infoItem}>
            <Ionicons name="map" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.serviceAreas")}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={
                    Array.isArray(editedData.service_area_pin)
                      ? editedData.service_area_pin.join(", ")
                      : editedData.service_area_pin || ""
                  }
                  onChangeText={(text) =>
                    handleInputChange("service_area_pin", text)
                  }
                  placeholder="Enter service area PINs (comma-separated)"
                  keyboardType="default"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile.service_area_pin &&
                  profile.service_area_pin.length > 0
                    ? Array.isArray(profile.service_area_pin)
                      ? profile.service_area_pin.join(", ")
                      : profile.service_area_pin
                    : t("profile.notProvided")}
                </Text>
              )}
            </View>
          </View>

          {/* Tools */}
          <View style={styles.infoItem}>
            <Ionicons name="build" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t("profile.toolsEquipment")}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={
                    Array.isArray(editedData.tools)
                      ? editedData.tools.join(", ")
                      : editedData.tools || ""
                  }
                  onChangeText={(text) => handleInputChange("tools", text)}
                  placeholder="Enter tools (comma-separated)"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile.tools && profile.tools.length > 0
                    ? Array.isArray(profile.tools)
                      ? profile.tools.join(", ")
                      : profile.tools
                    : t("profile.notProvided")}
                </Text>
              )}
            </View>
          </View>

          {/* Trust Score */}
          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.trustScore")}</Text>
              <Text style={styles.infoValue}>{profile.trust || 100}/100</Text>
            </View>
          </View>
        </View>

        {/* KYC Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.kycInfo")}</Text>

          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.aadhaarNumber")}</Text>
              <Text style={styles.infoValue}>
                {profile.aadhaar_number
                  ? `XXXX-XXXX-${profile.aadhaar_number.slice(-4)}`
                  : t("profile.notProvided")}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="document" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.licenseNumber")}</Text>
              <Text style={styles.infoValue}>
                {profile.plumber_license_number || t("profile.notProvided")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.support")}</Text>

          <TouchableOpacity
            style={styles.supportItem}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.supportText}>
              {t("profile.contactSupport")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem} onPress={handleTerms}>
            <Ionicons name="document-text" size={20} color="#666" />
            <Text style={styles.supportText}>
              {t("profile.termsConditions")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem} onPress={handlePrivecy}>
            <Ionicons name="shield-checkmark" size={20} color="#666" />
            <Text style={styles.supportText}>{t("profile.privacyPolicy")}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>{t("profile.appVersion")}</Text>
          <Text style={styles.appInfoText}>{t("profile.copyright")}</Text>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    borderRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoutButton: {
    padding: 8,
    color: "red",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  kycText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  sectionTitle01: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  languageLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  enquireButoonContainer: {
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#006effff",
    color: "white",
  },
  enquireButton: {
    flexDirection: "row",
    alignItems: "center",
    display: "flex",
    gap: 10,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: "#333",
    width: "100%",
    backgroundColor: "#fff",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
  },
  supportItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  supportText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  appInfo: {
    alignItems: "center",
    padding: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    paddingTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  dropdownContainer: {
    position: "absolute",
  },
  arrowBorder: {
    position: "absolute",
    top: -9,
    right: 67,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#d1d5db",
    zIndex: 2,
  },
  arrowFill: {
    position: "absolute",
    top: -7.5,
    right: 67.5,
    width: 0,
    height: 0,
    borderLeftWidth: 8.5,
    borderRightWidth: 8.5,
    borderBottomWidth: 8.5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "white",
    zIndex: 3,
  },
  dropdownMenu: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "500",
  },
});
