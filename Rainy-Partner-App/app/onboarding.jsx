import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView,
    TouchableOpacity, Image, Platform,
    Alert
} from "react-native";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function Onboarding() {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        pin: '',
        city: '',
        district: '',
        state: '',
        service_area_pin: '',
        experience: '',
        tools: '',
        aadhaar_number: '', 
        plumber_license_number: '',
        profile: '',
        aadhaar_front: '',
        aadhaar_back: '',
        license_front: '',
        license_back: ''
    });

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const BACKEND_URL_LOCAL = process.env.BACKEND_URL_LOCAL;

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
    }) 

    const [isLoading, setIsLoading] = useState(false);
    
    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const getSignedUrlFromKey = async (s3Key, token) => {
        try {
            const response = await axios.post(
                `${BACKEND_URL_LOCAL}/get-image`,
                { key: s3Key },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                console.log(response.data.url);
                return response.data.url;
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error getting Signed URL:', error);
            return null;
        }
    };

    const loadSignedUrl = async (s3Key, docType) => {
        if (!s3Key) return;
        
        try {
            // CHANGED: Retrieve token from SecureStore instead of AsyncStorage
            const token = await SecureStore.getItemAsync("access_token");
            if (!token) {
                console.warn("Token not found for loading signed URL");
                return;
            }
            const signedUrl = await getSignedUrlFromKey(s3Key, token);
            
            if (signedUrl) {
                setSignedUrls(prev => ({
                    ...prev,
                    [docType]: signedUrl
                }));
            }
        } catch (error) {
            console.error('Error loading signed URL:', error);
        }
    };

    useEffect(() => {
        Object.keys(formData).forEach(key => {
            if (formData[key] && ['profile', 'aadhaar_front', 'aadhaar_back', 'license_front', 'license_back'].includes(key)) {
                loadSignedUrl(formData[key], key);
            }
        });
    }, [formData]);

    const fetchPinCode = async (pin) => {
        if (pin.length === 6) {
            try {
                const response = await axios.get(`https://api.postalpincode.in/pincode/${pin}`);
                const data = response.data;                

                if (data[0].Status === "Success") {
                    const postOffice = data[0].PostOffice[0];
                    setFormData(prev => ({
                        ...prev,
                        pin: pin,
                        city: postOffice.Block,
                        district: postOffice.District,
                        state: postOffice.State
                    }));
                } else {
                    Alert.alert("Invalid PIN code", "Please enter a valid 6-digit PIN code.");
                    setFormData(prev => ({
                        ...prev,
                        pin: '',
                        city: '',
                        district: '',
                        state: ''
                    }));
                }
            } catch (error) {
                console.error("Error fetching PIN code data:", error);
                Alert.alert("Error", "Unable to fetch location data. Please try again later.");
            }
        } else {
            setFormData(prev => ({
                ...prev,
                city: '',
                district: '',
                state: ''
            }));
        }
    };

    const pickImage = async (type) => {
        Alert.alert("Upload Image", "Choose an option", [
            {
                text: "Take Photo",
                onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        alert('Camera permission is required to take photos.');
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
                }
            },
            {
                text: "Choose from Gallery",
                onPress: async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        alert('Media library permission is required to select photos.');
                        return;
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.7,
                    });

                    if (!result.canceled) {
                        console.log('Image Picked:', result.assets[0], type);
                        const file = await validateAndSetImage(result.assets[0], type);
                        if (file) {
                            await handleUpload(type, file);
                        }
                    }
                }
            },
            { text: "Cancel", style: "cancel" }
        ]);
    };

    const validateAndSetImage = async (file, docType) => {
        const fileUri = file.uri;
        const ext = file.mimeType.split('/')[1];

        const allowedFileTypes = ['jpg', 'jpeg', 'png'];

        if (!allowedFileTypes.includes(ext)) {
            Alert.alert('Invalid File Type', 'Please select a valid file type (jpg, jpeg, png).');
            return null;
        }

        const info = await FileSystem.getInfoAsync(file.uri);
        if (info.size > MAX_FILE_SIZE) {
            Alert.alert('File Too Large', 'File size exceeds 2MB. Please select a smaller file.');
            return null;
        }

        const validatedFile = {
            uri: fileUri,
            type: `image/${ext}`,
            ext,
            docType
        };

        setImages(prev => ({
            ...prev,
            [docType]: validatedFile
        }));    
        return validatedFile;
    };

    const extractS3Key = (url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname.substring(1);
        } catch (error) {
            console.error('Error extracting S3 Key:', error);
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
                    "Content-Type": fileType
                },
                body: blob,
            }); 
            const cleanUrl = signedUrl.split('?')[0];
            return cleanUrl;
        } catch (error) {
            console.error("Error uploading file to S3:", error);
            Alert.alert("Upload Failed", "Could not upload file to server");
            return null;
        }
    };

    const handleUpload = async (docType, file) => {
        if (!file) {
            Alert.alert(`No file selected. Please upload ${docType} first.`);
            return;
        }

        try {
            const token = await SecureStore.getItemAsync("access_token");
            console.log("Token retrieved for upload:", !!token);
            
            if (!token) {
                console.warn("Token not found in SecureStore");
                Alert.alert(
                    "Session Expired",
                    "Please log in again to continue.",
                    [
                        {
                            text: "Go to Login",
                            onPress: async () => {
                                try {
                                    await SecureStore.deleteItemAsync('access_token');
                                    await AsyncStorage.removeItem('user_data');
                                    router.replace('/login');
                                } catch (error) {
                                    console.error("Error clearing storage:", error);
                                }
                            }
                        }
                    ]
                );
                return;
            }

            const response = await axios.post(
                `${BACKEND_URL_LOCAL}/uploadurl`,
                {
                    docType: file.docType,
                    fileType: file.ext,
                    fileName: `${Date.now()}-${docType}.${file.ext}`,
                },
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            );

            if (!response.data.url) {
                throw new Error('No signed URL received from server');
            }

            const signedUrl = response.data.url;
            const uploadedUrl = await uploadToS3(file.uri, signedUrl, file.type);

            if (uploadedUrl) {
                console.log('File Uploaded Successfully:', uploadedUrl);
                const s3Key = extractS3Key(uploadedUrl);
                updateFormData(docType, s3Key);
                console.log('S3 Key:', s3Key);
            }
             
        } catch (error) {
            console.error("Error uploading file:", error);
            
            if (error.response?.status === 401) {
                Alert.alert("Error", "Your session has expired. Please log in again.");
            } else if (error.response?.status === 400) {
                Alert.alert("Error", "Invalid file format or request.");
            } else {
                Alert.alert("Error", error.response?.data?.message || "Could not upload file. Please try again.");
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
            Alert.alert("Error", "Please fill all required fields.");
            setIsLoading(false);
            return;
        }

        if (
            !formData.aadhaar_front ||
            !formData.aadhaar_back ||
            !formData.license_front ||
            !formData.license_back
        ) {
            Alert.alert("Error", "Please upload all the required documents.");
            setIsLoading(false);
            return;
        }

        try {
            const token = await SecureStore.getItemAsync("access_token");
            const userDataString = await AsyncStorage.getItem("user_data");
            const userData = userDataString ? JSON.parse(userDataString) : null;

            if (!token) {
                Alert.alert("Error", "Authentication token not found. Please log in again.");
                setIsLoading(false);
                return;
            }

            if (!userData || !userData.id || !userData.phone) {
                Alert.alert("Error", "User data is missing. Please log in again.");
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
                `${BACKEND_URL_LOCAL}/onboarding`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const result = response.data;
            console.log("Onboarding Successful:", result);

            // CHANGED: Store token in SecureStore instead of AsyncStorage
            if (result.token) {
                await SecureStore.setItemAsync('access_token', result.token);
            }

            if (result.user) {
                await AsyncStorage.setItem('user_data', JSON.stringify(result.user));
            }

            router.replace("/agreement");
        } catch (error) {
            console.error(
                "Onboarding Error",
                error.response?.data || error.message || error
            );
            Alert.alert("Onboarding Failed", "Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>
                        Please provide your details and upload required documents for KYC verification
                    </Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => updateFormData('name', text)}
                                placeholder="Enter your full name"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Complete Address *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.address}
                                onChangeText={(text) => updateFormData('address', text)}
                                placeholder="House number, street, area"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>PIN Code *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.pin}
                                    onChangeText={(text) => {
                                        updateFormData('pin', text);
                                        fetchPinCode(text);
                                    }}
                                    placeholder="6-digit PIN"
                                    placeholderTextColor="#999"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>City *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.city}
                                    onChangeText={(text) => updateFormData('city', text)}
                                    placeholder="Your city"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>District *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.district}
                                    onChangeText={(text) => updateFormData('district', text)}
                                    placeholder="District"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>State *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.state}
                                    onChangeText={(text) => updateFormData('state', text)}
                                    placeholder="State"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Professional Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Service Area PIN Codes *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.service_area_pin}
                                onChangeText={(text) => updateFormData('service_area_pin', text)}
                                placeholder="PIN codes separated by commas (e.g., 110001, 110002)"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Experience (Years) *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.experience}
                                onChangeText={(text) => updateFormData('experience', text)}
                                placeholder="Years of experience"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tools & Equipment *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.tools}
                                onChangeText={(text) => updateFormData('tools', text)}
                                placeholder="List your tools and equipment"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={2}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>KYC Documents</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Aadhaar Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.aadhaar_number}
                                onChangeText={(text) => updateFormData('aadhaar_number', text)}
                                placeholder="12-digit Aadhaar number"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={12}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Plumber License Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.plumber_license_number}
                                onChangeText={(text) => updateFormData('plumber_license_number', text)}
                                placeholder="License number"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upload Documents</Text>

                        <View style={styles.uploadSection}>
                            <Text style={styles.uploadLabel}>Profile Photo *</Text>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => pickImage('profile')}
                            >
                                {images.profile ? (
                                    <View style={styles.uploadedImageContainer}>
                                        <Image source={{ uri: images.profile.uri }} style={styles.uploadedImage} />
                                        <View style={styles.uploadedOverlay}>
                                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={32} color="#4A90E2" />
                                        <Text style={styles.uploadText}>Upload Profile Photo</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.uploadSection}>
                            <Text style={styles.uploadLabel}>Aadhaar Card (Front side) *</Text>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => pickImage('aadhaar_front')}
                            >
                                {images.aadhaar_front ? (
                                    <View style={styles.uploadedImageContainer}>
                                        <Image source={{ uri: images.aadhaar_front.uri }} style={styles.uploadedImage} />
                                        <View style={styles.uploadedOverlay}>
                                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="document" size={32} color="#4A90E2" />
                                        <Text style={styles.uploadText}>Upload Aadhaar Card</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.uploadSection}>
                            <Text style={styles.uploadLabel}>Aadhaar Card (Back side) *</Text>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => pickImage('aadhaar_back')}
                            >
                                {images.aadhaar_back ? (
                                    <View style={styles.uploadedImageContainer}>
                                        <Image source={{ uri: images.aadhaar_back.uri }} style={styles.uploadedImage} />
                                        <View style={styles.uploadedOverlay}>
                                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="document" size={32} color="#4A90E2" />
                                        <Text style={styles.uploadText}>Upload Aadhaar Card</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.uploadSection}>
                            <Text style={styles.uploadLabel}>Plumber License (Front side) *</Text>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => pickImage('license_front')}
                            >
                                {images.license_front ? (
                                    <View style={styles.uploadedImageContainer}>
                                        <Image source={{ uri: images.license_front.uri }} style={styles.uploadedImage} />
                                        <View style={styles.uploadedOverlay}>
                                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="document" size={32} color="#4A90E2" />
                                        <Text style={styles.uploadText}>Upload License</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.uploadSection}>
                            <Text style={styles.uploadLabel}>Plumber License (Back side) *</Text>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => pickImage('license_back')}
                            >
                                {images.license_back ? (
                                    <View style={styles.uploadedImageContainer}>
                                        <Image source={{ uri: images.license_back.uri }} style={styles.uploadedImage} />
                                        <View style={styles.uploadedOverlay}>
                                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="document" size={32} color="#4A90E2" />
                                        <Text style={styles.uploadText}>Upload License</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={submitOnboarding}
                        disabled={isLoading}
                    >
                        <Text style={styles.submitButtonText}>
                            {isLoading ? 'Submitting...' : 'Submit for Verification'}
                        </Text>
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
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        backgroundColor: 'white',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
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
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    uploadButton: {
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    uploadText: {
        fontSize: 14,
        color: '#4A90E2',
        marginTop: 8,
        fontWeight: '500',
    },
    uploadedImageContainer: {
        position: 'relative',
    },
    uploadedImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    uploadedOverlay: {
        position: 'absolute',
        bottom: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    submitButton: {
        backgroundColor: '#4A90E2',
        marginHorizontal: 20,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#999',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4A90E2',
        marginHorizontal: 20,
        marginTop: 12,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#4A90E2',
        fontSize: 14,
        fontWeight: '500',
    },
    bottomSpacer: {
        height: 40,
    },
    autoFillIndicator: {
        fontSize: 12,
        color: '#34C759',
        marginTop: 4,
        fontWeight: '500',
    },
    autoFilledInput: {
        borderColor: '#34C759',
        backgroundColor: '#F0FFF4',
    },
});
