import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/Context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
    const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['plumber-profile'],
    queryFn: async () => {
        const response = await axios.get(`${process.env.BACKEND_URL_LOCAL}/plumber/profile`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      return response.data;
    },
  });



useEffect(() => {
  if (!profile?.profile) return;

  const getProfileImage = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/get-image`,
        { key: profile.profile }, 
        { headers: { Authorization: `Bearer ${user?.access_token}` } }
      );
      setImageUrl(response.data.url);
    } catch (error) {
      console.error("Error fetching profile image:", error);
    } finally {
      setLoading(false);
    }
  };

  getProfileImage();
}, [profile]);


  const getKycStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return { color: '#34C759', icon: 'checkmark-circle', text: 'Approved' };
      case 'rejected':
        return { color: '#FF3B30', icon: 'close-circle', text: 'Rejected' };
      default:
        return { color: '#FF9500', icon: 'time', text: 'Pending Review' };
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => { logout; router.replace('/login') } },
      ]
    );
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  };

  const kycInfo = getKycStatusInfo(profile.kyc_status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Profile Card */}
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

          
          <Text style={styles.name}>{profile.name || 'Not provided'}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>
          
          <View style={[styles.kycBadge, { backgroundColor: kycInfo.color }]}>
            <Ionicons name={kycInfo.icon} size={16} color="white" />
            <Text style={styles.kycText}>KYC {kycInfo.text}</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {profile.address 
                  ? `${profile.address.address}, ${profile.address.city}, ${profile.address.state} - ${profile.address.pin}`
                  : 'Not provided'
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{profile.experience || 0} years</Text>
            </View>
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="map" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Service Areas (PIN Codes)</Text>
              <Text style={styles.infoValue}>{profile.service_area_pin || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="build" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tools & Equipment</Text>
              <Text style={styles.infoValue}>{profile.tools || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Trust Score</Text>
              <Text style={styles.infoValue}>{profile.trust || 100}/100</Text>
            </View>
          </View>
        </View>

        {/* KYC Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Information</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Aadhaar Number</Text>
              <Text style={styles.infoValue}>
                {profile.aadhaar_number 
                  ? `XXXX-XXXX-${profile.aadhaar_number.slice(-4)}`
                  : 'Not provided'
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="document" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>License Number</Text>
              <Text style={styles.infoValue}>
                {profile.plumber_license_number || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="help-circle" size={20} color="#666" />
            <Text style={styles.supportText}>Help & FAQ</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.supportText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="document-text" size={20} color="#666" />
            <Text style={styles.supportText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="shield-checkmark" size={20} color="#666" />
            <Text style={styles.supportText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Plumber Partner v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 Plumber Partner Platform</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
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
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  kycText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  supportText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 20,
  },
});