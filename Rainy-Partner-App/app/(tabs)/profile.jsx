import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/Context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from '../languageSelector'; 
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const { t, currentLanguage, languages } = useLanguage();
  const [imageUrl, setImageUrl] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState(null);
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['plumber-profile'],
    queryFn: async () => {
      const response = await axios.get(`${BACKEND_URL}/plumber/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
      
    },
  });

  const handlePrivecy = () => {
    router.push('/privecyPolicyScreen')
  }

  const handleTerms = () => {
    router.push('/termsScreen')
  }

  const handleContactSupport = () => {
  const email = 'sales@rainyfilters.com';
  const subject = 'Support Request'; 
  const body = ''; 
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  Linking.canOpenURL(mailtoUrl)
    .then((supported) => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        alert('Unable to open mail app');
      }
    })
    .catch((err) => console.error('An error occurred', err));
};

  useEffect(() => {
    if (!profile?.profile) return;

    const getProfileImage = async () => {
      try {
        const response = await axios.post(
          `${BACKEND_URL}/get-image`,
          { key: profile.profile }, 
          { headers: { Authorization: `Bearer ${token}` } }
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
        return { color: '#34C759', icon: 'checkmark-circle', text: t('profile.kycApproved') };
      case 'rejected':
        return { color: '#FF3B30', icon: 'close-circle', text: t('profile.kycRejected') };
      default:
        return { color: '#FF9500', icon: 'time', text: t('profile.kycPending') };
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('home.confirmLogout'),
      t('home.areYouSure'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.logout'), 
          style: 'destructive', 
          onPress: async () => { 
            logout(); 
            router.replace('/login');
          } 
        },
      ]
    );
  };
useEffect(() => {
  const fetchCoordinatorDetails = async () => {
    const coordinatorId = profile.coordinator_id ;
    
    if (!coordinatorId) {
      console.log('No coordinator_id found in profile or user');
      return;
    }
    
    try {
      const response = await axios.get(
        `${BACKEND_URL}/plumber/coordinator/${coordinatorId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("Coordinator details SUCCESS:", response.data);
      setCoordinatorInfo(response.data);
    } catch (error) {
      console.error("Error fetching coordinator details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  };

  // Only run when profile is loaded
  if (profile) {
    fetchCoordinatorDetails();
  }
}, [profile?.coordinator_id, user?.coordinator_id, token, BACKEND_URL]);
  

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  };

  const kycInfo = getKycStatusInfo(profile.kyc_status);
  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.title}>{t('common.profile')}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </SafeAreaView>

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
          
          <Text style={styles.name}>{profile.name || t('profile.notProvided')}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>
          
          <View style={[styles.kycBadge, { backgroundColor: kycInfo.color }]}>
            <Ionicons name={kycInfo.icon} size={16} color="white" />
            <Text style={styles.kycText}>KYC {kycInfo.text}</Text>
          </View>
        </View>

        {/* Language Selector Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
          
          <TouchableOpacity
            style={styles.languageItem}
            onPress={() => setShowLanguageSelector(true)}
          >
            <View style={styles.languageLeft}>
              <Ionicons name="language" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('settings.language')}</Text>
                <Text style={styles.infoValue}>{currentLang?.nativeName}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.email')}</Text>
              <Text style={styles.infoValue}>{profile.email || t('profile.notProvided')}</Text>
            </View>
          </View>


          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.address')}</Text>
              <Text style={styles.infoValue}>
                {profile.address 
                  ? `${profile.address.address}, ${profile.address.city}, ${profile.address.state} - ${profile.address.pin}`
                  : t('profile.notProvided')
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.experience')}</Text>
              <Text style={styles.infoValue}>
                {profile.experience || 0} {t('profile.years')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.coordinator')}</Text>
    <View style={styles.infoItem}>
    <Ionicons name="person" size={20} color="#666" />
    <View style={styles.infoContent}>
      <Text style={styles.name}>
        {coordinatorInfo?.name || t('profile.notProvided')}
      </Text>
    </View>
  </View>

{coordinatorInfo?.phone && (
  <TouchableOpacity 
    style={styles.infoItem}
    onPress={() => {
      const phoneNumber = coordinatorInfo.phone.replace(/[^0-9]/g, '');
      const phoneUrl = `tel:+91${phoneNumber}`;
      
      Linking.openURL(phoneUrl)
        .catch((err) => {
          console.error('Error opening dialer:', err);
          Alert.alert('Error', 'Could not open phone dialer');
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
      const phoneNumber = coordinatorInfo.phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/91${phoneNumber}`;
      
      Linking.openURL(whatsappUrl)
        .catch((err) => {
          console.error('Error opening WhatsApp:', err);
          Alert.alert('Error', 'Could not open WhatsApp');
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
          <Text style={styles.sectionTitle}>{t('profile.professionalInfo')}</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="map" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.serviceAreas')}</Text>
              <Text style={styles.infoValue}>
                {profile.service_area_pin || t('profile.notProvided')}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="build" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.toolsEquipment')}</Text>
              <Text style={styles.infoValue}>
                {profile.tools || t('profile.notProvided')}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.trustScore')}</Text>
              <Text style={styles.infoValue}>{profile.trust || 100}/100</Text>
            </View>
          </View>
        </View>

        {/* KYC Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.kycInfo')}</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.aadhaarNumber')}</Text>
              <Text style={styles.infoValue}>
                {profile.aadhaar_number 
                  ? `XXXX-XXXX-${profile.aadhaar_number.slice(-4)}`
                  : t('profile.notProvided')
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="document" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.licenseNumber')}</Text>
              <Text style={styles.infoValue}>
                {profile.plumber_license_number || t('profile.notProvided')}
              </Text>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.support')}</Text>

          <TouchableOpacity style={styles.supportItem} onPress={handleContactSupport}>
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.supportText}>{t('profile.contactSupport')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem} onPress={handleTerms}>
            <Ionicons name="document-text" size={20} color="#666" />
            <Text style={styles.supportText}>{t('profile.termsConditions')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportItem} onPress={handlePrivecy}>
            <Ionicons name="shield-checkmark" size={20} color="#666" />
            <Text style={styles.supportText}>{t('profile.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>{t('profile.appVersion')}</Text>
          <Text style={styles.appInfoText}>{t('profile.copyright')}</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  name: {
    fontSize: 18,
    paddingTop: 2
  }
});