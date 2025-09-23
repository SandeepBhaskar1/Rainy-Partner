import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image,
  Linking,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/Context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import KYCProtected from '../../src/Context/KYC-Page';
// import {HeaderBackButton} from 'react-navigation/elements'

export default function JobsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionImages, setCompletionImages] = useState({
    serialNumber: null,
    warrantyCard: null,
    installation: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const navigation = useNavigation();
  
  // Replace React Query state with regular useState
  const [pendingJobs, setPendingJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

useEffect(() => {
  const backAction = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true; // handled
    }
    // let system handle the back (exit app) if no screen to go back
    return false;
  };

  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    backAction
  );

  return () => backHandler.remove();
}, [navigation]);


  // Fetch pending jobs
  const fetchPendingJobs = useCallback(async () => {
    if (activeTab !== 'pending') return;
    
    setLoadingPending(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/plumber/assigned-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const { jobs } = await response.json();
      
      setPendingJobs(jobs || []);
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
      setPendingJobs([]);
    } finally {
      setLoadingPending(false);
    }
  }, [BACKEND_URL, activeTab]);

  // Fetch completed jobs
  const fetchCompletedJobs = useCallback(async () => {
    if (activeTab !== 'completed') return;
    
    setLoadingCompleted(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/plumber/completed-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        setCompletedJobs([]);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        setCompletedJobs([]);
        return;
      }
      
      const data = await response.json();
      setCompletedJobs(data);
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
      setCompletedJobs([]);
    } finally {
      setLoadingCompleted(false);
    }
  }, [user?.access_token, activeTab]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingJobs();
    } else {
      fetchCompletedJobs();
    }
  }, [activeTab, fetchPendingJobs, fetchCompletedJobs]);

  const handleRefresh = () => {
    if (activeTab === 'pending') {
      fetchPendingJobs();
    } else {
      fetchCompletedJobs();
    }
  };

  const handleCall = (phoneNumber, clientName) => {
    if (phoneNumber && phoneNumber !== 'N/A') {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Contact Not Available', 'Phone number not provided for this job.');
    }
  };

  const openCompletionModal = (jobId) => {
    setSelectedJobId(jobId);
    setCompletionImages({
      serialNumber: null,
      warrantyCard: null,
      installation: null,
    });
    setShowCompletionModal(true);
  };

  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCompletionImages(prev => ({
          ...prev,
          [type]: result.assets[0]
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async (type) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCompletionImages(prev => ({
          ...prev,
          [type]: result.assets[0]
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePickerOptions = (type) => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add the image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => takePhoto(type) },
        { text: 'Gallery', onPress: () => pickImage(type) }
      ]
    );
  };

  const submitJobCompletion = async () => {
    // Check if all required images are uploaded
    if (!completionImages.serialNumber || !completionImages.warrantyCard || !completionImages.installation) {
      Alert.alert('Missing Images', 'Please upload all required images before submitting.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('job_id', selectedJobId);
      
      // Add images to form data
      if (completionImages.serialNumber) {
        formData.append('serial_number_image', {
          uri: completionImages.serialNumber.uri,
          type: 'image/jpeg',
          name: 'serial_number.jpg',
        });
      }
      
      if (completionImages.warrantyCard) {
        formData.append('warranty_card_image', {
          uri: completionImages.warrantyCard.uri,
          type: 'image/jpeg',
          name: 'warranty_card.jpg',
        });
      }
      
      if (completionImages.installation) {
        formData.append('installation_image', {
          uri: completionImages.installation.uri,
          type: 'image/jpeg',
          name: 'installation.jpg',
        });
      }

      const response = await fetch(`${BACKEND_URL}/plumber/jobs/submit-completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert(
          'Success', 
          'Job completion submitted successfully! Images have been sent to admin for review.',
          [{ text: 'OK', onPress: () => {
            setShowCompletionModal(false);
            fetchPendingJobs(); // Refresh pending jobs
          }}]
        );
      } else {
        Alert.alert('Error', 'Failed to submit job completion');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'under_review': return '#5856D6';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };


  const JobCard = ({ job, isCompleted = false }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobMainInfo}>
          <Text style={styles.jobTitle}>
            Installation Task #{job.id?.slice(-6)?.toUpperCase()}
          </Text>
          <Text style={styles.jobDate}>
            {formatDate(job.created_at || job.assigned_date)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(job.status || "pending") },
          ]}
        >
          <Text style={styles.statusText}>
            {job.status === "under_review"
              ? "Under Review"
              : isCompleted
              ? "Completed"
              : job.status || "Pending"}
          </Text>
        </View>
      </View>

      {/* Client Details */}
      <View style={styles.clientSection}>
        <View style={styles.clientHeader}>
          <Ionicons name="person-outline" size={16} color="#4A90E2" />
          <Text style={styles.clientHeaderText}>Client Details</Text>
        </View>
        <Text style={styles.clientName}>
          {job.client?.name || job.customer_name || "N/A"}
        </Text>
        <Text style={styles.clientPhone}>
          {job.client?.phone || job.customer_phone || "Contact not provided"}
        </Text>
        <Text style={styles.clientAddress} numberOfLines={2}>
          {job.client?.address || job.installation_address || "Address not provided"}
        </Text>
      </View>

      {/* Model & Product Details */}
      <View style={styles.productSection}>
        <View style={styles.productHeader}>
          <Ionicons name="cube-outline" size={16} color="#00B761" />
          <Text style={styles.productHeaderText}>Model Purchased</Text>
        </View>
        <Text style={styles.modelName}>
          {job.model_purchased || job.product_model || "FL-Series Filter"}
        </Text>
        <Text style={styles.modelDetails}>
          Capacity: {job.capacity || job.roof_capacity || "Standard Installation"}
        </Text>
        {job.special_instructions && (
          <Text style={styles.instructions}>Note: {job.special_instructions}</Text>
        )}
      </View>

      {/* Location & Contact */}
      <View style={styles.locationSection}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText}>
            {job.location || job.city || "Location TBD"}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="call-outline" size={14} color="#666" />
          <Text style={styles.locationText}>
            {job.client?.phone || job.customer_phone || "Contact: Via admin"}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      {!isCompleted && job.status !== "under_review" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() =>
              handleCall(
                job.client?.phone || job.customer_phone,
                job.client?.name || job.customer_name || "Client"
              )
            }
          >
            <Ionicons name="call" size={16} color="white" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => openCompletionModal(job.id)}
          >
            <Ionicons name="camera" size={16} color="white" />
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {job.status === "under_review" && (
        <View style={styles.reviewInfo}>
          <Ionicons name="time" size={16} color="#5856D6" />
          <Text style={styles.reviewText}>
            Images submitted - Awaiting admin review
          </Text>
        </View>
      )}

      {isCompleted && job.completion_date && (
        <View style={styles.completionInfo}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={styles.completionText}>
            Completed on {formatDate(job.completion_date)}
          </Text>
        </View>
      )}
    </View>
  );

  const ImageUploadCard = ({ 
    title, 
    description, 
    type, 
    image, 
    onPress 
  }) => (
    <TouchableOpacity style={styles.imageUploadCard} onPress={onPress}>
      <View style={styles.imageUploadContent}>
        <View style={styles.imageUploadHeader}>
          <Ionicons 
            name={image ? "checkmark-circle" : "camera-outline"} 
            size={20} 
            color={image ? "#34C759" : "#666"} 
          />
          <Text style={styles.imageUploadTitle}>{title}</Text>
        </View>
        <Text style={styles.imageUploadDescription}>{description}</Text>
        
        {image && (
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
        )}
        
        <View style={styles.imageUploadButton}>
          <Text style={styles.imageUploadButtonText}>
            {image ? 'Change Image' : 'Add Image'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <KYCProtected>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Installation Jobs</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === 'pending' ? 'white' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending Jobs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Ionicons 
            name="checkmark-done-outline" 
            size={20} 
            color={activeTab === 'completed' ? 'white' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Job Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={activeTab === 'pending' ? loadingPending : loadingCompleted} 
            onRefresh={handleRefresh} 
          />
        }
      >
        {activeTab === 'pending' ? (
          <View style={styles.jobsList}>
            {pendingJobs && pendingJobs.length > 0 ? (
              pendingJobs.map((job, index) => (
                <JobCard key={job.id || index} job={job} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyTitle}>No Pending Jobs</Text>
                <Text style={styles.emptyMessage}>
                  New installation tasks assigned by admin will appear here
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.jobsList}>
            {completedJobs && completedJobs.length > 0 ? (
              completedJobs.map((job, index) => (
                <JobCard key={job.id || index} job={job} isCompleted={true} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyTitle}>No Completed Jobs</Text>
                <Text style={styles.emptyMessage}>
                  Completed installation tasks will appear here
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Job Completion Modal with Image Upload */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModalContainer}>
            <View style={styles.completionModalHeader}>
              <Text style={styles.completionModalTitle}>Mark Job Complete</Text>
              <TouchableOpacity 
                onPress={() => setShowCompletionModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.completionModalSubtitle}>
              Upload the following images to complete this job:
            </Text>

            <ScrollView style={styles.imageUploadList}>
              <ImageUploadCard
                title="Filter Box Serial Number"
                description="Take a clear photo of the filter box showing the serial number"
                type="serialNumber"
                image={completionImages.serialNumber}
                onPress={() => showImagePickerOptions('serialNumber')}
              />

              <ImageUploadCard
                title="Warranty Card"
                description="Upload photo of the completed warranty card"
                type="warrantyCard"
                image={completionImages.warrantyCard}
                onPress={() => showImagePickerOptions('warrantyCard')}
              />

              <ImageUploadCard
                title="Installation Photo"
                description="Take a photo showing the completed installation"
                type="installation"
                image={completionImages.installation}
                onPress={() => showImagePickerOptions('installation')}
              />
            </ScrollView>

            <View style={styles.completionModalActions}>
              <TouchableOpacity 
                style={styles.cancelCompletionButton} 
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.cancelCompletionButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitCompletionButton,
                  (!completionImages.serialNumber || !completionImages.warrantyCard || !completionImages.installation || isUploading) && styles.submitCompletionButtonDisabled
                ]} 
                onPress={submitJobCompletion}
                disabled={!completionImages.serialNumber || !completionImages.warrantyCard || !completionImages.installation || isUploading}
              >
                <Text style={styles.submitCompletionButtonText}>
                  {isUploading ? 'Uploading...' : 'Submit for Review'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
    </KYCProtected>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },



  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: 'white',
  },

  content: {
    flex: 1,
  },
  jobsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Job Card Styles
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobMainInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  jobDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },

  // Client Section
  clientSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Product Section
  productSection: {
    backgroundColor: '#F0FFF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B761',
    marginLeft: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  modelDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // Location Section
  locationSection: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#00B761',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },

  // Review Info
  reviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    padding: 8,
    borderRadius: 6,
  },
  reviewText: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Completion Info
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    padding: 8,
    borderRadius: 6,
  },
  completionText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Job Completion Modal
  completionModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    flex: 1,
  },
  completionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  completionModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  completionModalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  imageUploadList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageUploadCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imageUploadContent: {
    alignItems: 'center',
  },
  imageUploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageUploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  imageUploadDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  imagePreview: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageUploadButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  imageUploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  completionModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelCompletionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelCompletionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitCompletionButton: {
    flex: 2,
    backgroundColor: '#00B761',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitCompletionButtonDisabled: {
    backgroundColor: '#999',
  },
  submitCompletionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});