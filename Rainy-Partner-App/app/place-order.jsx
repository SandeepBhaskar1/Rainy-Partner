import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/Context/AuthContext';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PlaceOrderScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

  // Customer Information
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // Shipping Address (removed GSTIN)
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    district: '',
    state: '',
    pin: '',
  });

  // Billing Address (with GSTIN)
  const [billingAddress, setBillingAddress] = useState({
    address: '',
    city: '',
    district: '',
    state: '',
    pin: '',
    gstin: '',
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products`);
      return response.json();
    },
  });

  const handleQuantityChange = (productCode, quantity, price) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.product === productCode);
      if (quantity === 0) {
        return prev.filter(item => item.product !== productCode);
      }
      
      if (existing) {
        return prev.map(item => 
          item.product === productCode 
            ? { ...item, quantity, price }
            : item
        );
      } else {
        return [...prev, { product: productCode, quantity, price }];
      }
    });
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const validateOrder = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return false;
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      Alert.alert('Error', 'Please fill in customer name and phone');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(customerInfo.phone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    if (!shippingAddress.address.trim() || !shippingAddress.city.trim() || !shippingAddress.pin.trim()) {
      Alert.alert('Error', 'Please fill in complete shipping address');
      return false;
    }

    if (!/^\d{6}$/.test(shippingAddress.pin)) {
      Alert.alert('Error', 'Please enter a valid 6-digit PIN code');
      return false;
    }

    // Validate billing address if different from shipping
    if (!billingIsSameAsShipping) {
      if (!billingAddress.address.trim() || !billingAddress.city.trim() || !billingAddress.pin.trim()) {
        Alert.alert('Error', 'Please fill in complete billing address');
        return false;
      }

      if (!/^\d{6}$/.test(billingAddress.pin)) {
        Alert.alert('Error', 'Please enter a valid 6-digit PIN code for billing address');
        return false;
      }
    }

    return true;
  };

  const submitOrder = async () => {
    if (!validateOrder()) return;

    setIsLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const orderData = {
        items: selectedItems,
        client: customerInfo,
        shipping: shippingAddress,
        billing: billingIsSameAsShipping ? shippingAddress : billingAddress,
      };

      const response = await axios.post(`${BACKEND_URL}/plumber/place-order`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Order placed successfully! Admin will confirm and provide tracking details.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to place order');
      }
    } catch (error) {
      console.error('Place order error:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Place Order</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Product Selection - Zepto Style */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Rainy Filters</Text>
            
            {products && products.map((product) => (
              <View key={product.code} style={styles.productCard}>
                {/* Square Product Image */}
                <View style={styles.productImageContainer}>
                  {product.image ? (
                    <Image 
                      source={{ uri: product.image }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="water-outline" size={32} color="#00B761" />
                    </View>
                  )}
                </View>
                
                {/* Product Info - Organized Text */}
                <View style={styles.productTextContainer}>
                  <View style={styles.productMainInfo}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productCapacity} numberOfLines={1}>
                      {product.short_desc}
                    </Text>
                    <Text style={styles.productPrice}>
                      ₹{typeof product.mrp === 'number' ? product.mrp.toLocaleString() : "N/A"}
                    </Text>
                  </View>
                  
                  {/* Quantity Controls */}
                  <View style={styles.quantitySection}>
                    {selectedItems.find(item => item.product === product.code)?.quantity > 0 ? (
                      <View style={styles.quantityContainer}>
                        <TouchableOpacity 
                          style={styles.quantityBtn} 
                          onPress={() => {
                            const currentquantity = selectedItems.find(item => item.product === product.code)?.quantity || 0;
                            handleQuantityChange(product.code, Math.max(0, currentquantity - 1), product.mrp);
                          }}
                        >
                          <Text style={styles.quantityBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityDisplay}>
                          {selectedItems.find(item => item.product === product.code)?.quantity || 0}
                        </Text>
                        <TouchableOpacity 
                          style={styles.quantityBtn} 
                          onPress={() => {
                            const currentquantity = selectedItems.find(item => item.product === product.code)?.quantity || 0;
                            handleQuantityChange(product.code, currentquantity + 1, product.mrp);
                          }}
                        >
                          <Text style={styles.quantityBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.addToCartBtn} 
                        onPress={() => handleQuantityChange(product.code, 1, product.mrp)}
                      >
                        <Text style={styles.addBtnText}>ADD</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {selectedItems.length > 0 && (
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {selectedItems.map((item) => {
                  const product = products?.find((p) => p.code === item.product);
                  return (
                    <View key={item.product} style={styles.summaryItem}>
                      <Text style={styles.summaryProduct}>
                        {product?.name} x {item.quantity}
                      </Text>
                      <Text style={styles.summaryPrice}>
                        ₹{(typeof item.quantity * item.price) === 'number' ? (item.quantity * item.price).toLocaleString() : "N/A"}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₹{(typeof calculateTotal === 'number') ? calculateTotal().toLocaleString() : 'N/A'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={customerInfo.name}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, name: text }))}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={customerInfo.phone}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={customerInfo.email}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={shippingAddress.address}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, address: text }))}
                placeholder="Enter complete address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress.city}
                  onChangeText={(text) => setShippingAddress(prev => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>PIN Code *</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress.pin}
                  onChangeText={(text) => setShippingAddress(prev => ({ ...prev, pin: text }))}
                  placeholder="PIN"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>District</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress.district}
                  onChangeText={(text) => setShippingAddress(prev => ({ ...prev, district: text }))}
                  placeholder="District"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress.state}
                  onChangeText={(text) => setShippingAddress(prev => ({ ...prev, state: text }))}
                  placeholder="State"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Billing Address Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Billing same as shipping</Text>
              <Switch
                value={billingIsSameAsShipping}
                onValueChange={setBillingIsSameAsShipping}
                trackColor={{ false: '#E0E0E0', true: '#00B761' }}
                thumbColor={billingIsSameAsShipping ? 'white' : '#f4f3f4'}
              />
            </View>
            
            {/* Show Billing Address Form when toggle is off */}
            {!billingIsSameAsShipping && (
              <>
                <Text style={styles.sectionTitle}>Billing Address</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={billingAddress.address}
                    onChangeText={(text) => setBillingAddress(prev => ({ ...prev, address: text }))}
                    placeholder="Enter billing address"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                      style={styles.input}
                      value={billingAddress.city}
                      onChangeText={(text) => setBillingAddress(prev => ({ ...prev, city: text }))}
                      placeholder="City"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.label}>PIN Code *</Text>
                    <TextInput
                      style={styles.input}
                      value={billingAddress.pin}
                      onChangeText={(text) => setBillingAddress(prev => ({ ...prev, pin: text }))}
                      placeholder="PIN"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>District</Text>
                    <TextInput
                      style={styles.input}
                      value={billingAddress.district}
                      onChangeText={(text) => setBillingAddress(prev => ({ ...prev, district: text }))}
                      placeholder="District"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={billingAddress.state}
                      onChangeText={(text) => setBillingAddress(prev => ({ ...prev, state: text }))}
                      placeholder="State"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GSTIN (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={billingAddress.gstin}
                    onChangeText={(text) => setBillingAddress(prev => ({ ...prev, gstin: text }))}
                    placeholder="GST Number"
                    placeholderTextColor="#999"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Submit Button */}
        {selectedItems.length > 0 && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={submitOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Placing Order...</Text>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    Place Order • ₹{(typeof calculateTotal === 'number ') ? calculateTotal().toLocaleString() : 'N/A'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },

  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },

  productCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productImageContainer: {
    width: 65,
    height: 65,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F0F7ff',
    },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productMainInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  productCapacity: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  quantitySection: {
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00B761',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  quantityBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B761',
  },
  quantityBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  quantityDisplay: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#00B761',
    minWidth: 32,
    textAlign: 'center',
  },
  addToCartBtn: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#00B761',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
  },

  // Order Summary
  orderSummary: {
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryProduct: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B761',
  },

  // Form Inputs
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
    fontSize: 15,
    color: '#333',
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },

  // Submit Button
  submitContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#00B761',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
