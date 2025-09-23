import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/Context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRoute } from '@react-navigation/native';
import KYCProtected from '../../src/Context/KYC-Page';
export default function OrdersScreen() {

const auth = useAuth();
const user = auth?.user;

const route = useRoute();
const params = route.params || {};
const [activeTab, setActiveTab] = useState(
  params?.tab === 'track' ? 'track' : 'place'
);

  const [cart, setCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Customer Information
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });
  
  // Shipping Address (no GSTIN)
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
  
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);
  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

  // Fetch products function
  const fetchProducts = async () => {
    if (activeTab !== 'place') return;
    
    setProductsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch orders function
  const fetchOrders = async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (activeTab !== 'track' || !user?.access_token) return;
    
    setOrdersLoading(true);
    try {
      const response = await axios.get(
        `${process.env.BACKEND_URL_LOCAL}/plumber/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch data when activeTab changes
  useEffect(() => {
    if (activeTab === 'place') {
      fetchProducts();
    } else if (activeTab === 'track') {
      fetchOrders();
    }
  }, [activeTab, user?.access_token]);

  const addToCart = (productCode) => {
    setCart(prev => ({
      ...prev,
      [productCode]: (prev[productCode] || 0) + 1
    }));
  };

  const removeFromCart = (productCode) => {
    setCart(prev => ({
      ...prev,
      [productCode]: Math.max(0, (prev[productCode] || 0) - 1)
    }));
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [code, quantity]) => {
      const product = products?.find((p) => p.code === code);
      return total + (product ? product.mrp * quantity : 0);
    }, 0);
  };

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.short_desc.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const validateOrder = () => {
    if (Object.values(cart).every(quantity => quantity === 0)) {
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
  const token = await AsyncStorage.getItem("access_token");

  setIsLoading(true);

  try {
    const selectedItems = Object.entries(cart)
      .filter(([_, quantity]) => quantity > 0)
      .map(([code, quantity]) => {
        const product = products?.find((p) => p.code === code);
        return { product: code, quantity, price: product?.mrp || 0 };
      });

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product to the cart.');
      setIsLoading(false);
      return;
    }

    const orderData = {
      items: selectedItems,
      client: customerInfo,
      shipping: shippingAddress,
      billing: billingIsSameAsShipping ? shippingAddress : billingAddress,
    };

    console.log('Order Data:', JSON.stringify(orderData, null, 2));
    console.log('Token:', token);

    const response = await axios.post(
      `${BACKEND_URL}/plumber/place-order`,
      orderData,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    const result = await response.json();
    console.log(result);
    

    Alert.alert(
      'Success',
      'Order placed successfully! Admin will confirm and provide tracking details.',
      [{
        text: 'OK',
        onPress: () => {
          setCart({});
          setCustomerInfo({ name: '', phone: '', email: '' });
          setShippingAddress({ address: '', city: '', district: '', state: '', pin: '' });
          setBillingAddress({ address: '', city: '', district: '', state: '', pin: '', gstin: '' });
          setBillingIsSameAsShipping(true);
          setActiveTab('track');
          fetchOrders();
        }
      }]
    );

  } catch (error) {
    console.error('Place order error:', error);
    const errorMessage = error.response?.data?.detail || 'Failed to place order. Please try again.';
    Alert.alert('Error', errorMessage);
  } finally {
    setIsLoading(false);
  }
};


  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#FF9500';
      case 'Processing': return '#007AFF';
      case 'Dispatched': return '#5856D6';
      case 'Delivered': return '#34C759';
      case 'Fulfilled': return '#00B761';
      case 'Cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  return (
    <KYCProtected>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'place' && styles.activeTab]}
            onPress={() => setActiveTab('place')}
          >
            <Ionicons 
              name="add-circle" 
              size={20} 
              color={activeTab === 'place' ? 'white' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'place' && styles.activeTabText]}>
              Place Order
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'track' && styles.activeTab]}
            onPress={() => setActiveTab('track')}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={activeTab === 'track' ? 'white' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'track' && styles.activeTabText]}>
              Track Orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'place' ? (
          <View style={styles.placeOrderContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search filters..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Products Grid - Zepto Style */}
            <ScrollView style={styles.productsContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.productsGrid}>
                {productsLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading products...</Text>
                  </View>
                ) : (
                  filteredProducts.map((product) => (
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
                            <Ionicons name="water-outline" size={32} color="#4A90E2" />
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
                            ₹{(typeof product.mrp === 'number') ? product.mrp.toLocaleString() : 'N/A'}
                          </Text>
                        </View>
                        
                        {/* Quantity Controls */}
                        <View style={styles.quantitySection}>
                          {cart[product.code] > 0 ? (
                            <View style={styles.quantityContainer}>
                              <TouchableOpacity 
                                style={styles.quantityBtn} 
                                onPress={() => removeFromCart(product.code)}
                              >
                                <Text style={styles.quantityBtnText}>−</Text>
                              </TouchableOpacity>
                              <Text style={styles.quantityDisplay}>
                                {cart[product.code]}
                              </Text>
                              <TouchableOpacity 
                                style={styles.quantityBtn} 
                                onPress={() => addToCart(product.code)}
                              >
                                <Text style={styles.quantityBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.addToCartBtn} 
                              onPress={() => addToCart(product.code)}
                            >
                              <Text style={styles.addBtnText}>ADD</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Customer Information Section */}
            {Object.values(cart).some(quantity => quantity > 0) && (
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.customerSection}
              >
                <ScrollView style={styles.customerForm} showsVerticalScrollIndicator={false}>
                  {/* Customer Information */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Customer Information</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Customer Name *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={customerInfo.name}
                        onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, name: text }))}
                        placeholder="Enter customer name"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Phone Number *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={customerInfo.phone}
                        onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone: text }))}
                        placeholder="Enter phone number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={customerInfo.email}
                        onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, email: text }))}
                        placeholder="Enter email address"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  {/* Shipping Address */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Shipping Address</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Address *</Text>
                      <TextInput
                        style={[styles.formInput, styles.multilineInput]}
                        value={shippingAddress.address}
                        onChangeText={(text) => setShippingAddress(prev => ({ ...prev, address: text }))}
                        placeholder="Enter complete address"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.halfInputGroup}>
                        <Text style={styles.inputLabel}>City *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={shippingAddress.city}
                          onChangeText={(text) => setShippingAddress(prev => ({ ...prev, city: text }))}
                          placeholder="City"
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View style={styles.halfInputGroup}>
                        <Text style={styles.inputLabel}>PIN Code *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={shippingAddress.pin}
                          onChangeText={(text) => setShippingAddress(prev => ({ ...prev, pin: text }))}
                          placeholder="PIN"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                          maxLength={6}
                        />
                      </View>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.halfInputGroup}>
                        <Text style={styles.inputLabel}>District</Text>
                        <TextInput
                          style={styles.formInput}
                          value={shippingAddress.district}
                          onChangeText={(text) => setShippingAddress(prev => ({ ...prev, district: text }))}
                          placeholder="District"
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View style={styles.halfInputGroup}>
                        <Text style={styles.inputLabel}>State</Text>
                        <TextInput
                          style={styles.formInput}
                          value={shippingAddress.state}
                          onChangeText={(text) => setShippingAddress(prev => ({ ...prev, state: text }))}
                          placeholder="State"
                          placeholderTextColor="#999"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Billing Address Toggle */}
                  <View style={styles.formSection}>
                    <View style={styles.toggleContainer}>
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
                        <Text style={styles.formSectionTitle}>Billing Address</Text>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Address *</Text>
                          <TextInput
                            style={[styles.formInput, styles.multilineInput]}
                            value={billingAddress.address}
                            onChangeText={(text) => setBillingAddress(prev => ({ ...prev, address: text }))}
                            placeholder="Enter billing address"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                          />
                        </View>

                        <View style={styles.inputRow}>
                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>City *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={billingAddress.city}
                              onChangeText={(text) => setBillingAddress(prev => ({ ...prev, city: text }))}
                              placeholder="City"
                              placeholderTextColor="#999"
                            />
                          </View>

                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>PIN Code *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={billingAddress.pin}
                              onChangeText={(text) => setBillingAddress(prev => ({ ...prev, pin: text }))}
                              placeholder="PIN"
                              placeholderTextColor="#999"
                              keyboardType="numeric"
                              maxLength={6}
                            />
                          </View>
                        </View>

                        <View style={styles.inputRow}>
                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>District</Text>
                            <TextInput
                              style={styles.formInput}
                              value={billingAddress.district}
                              onChangeText={(text) => setBillingAddress(prev => ({ ...prev, district: text }))}
                              placeholder="District"
                              placeholderTextColor="#999"
                            />
                          </View>

                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>State</Text>
                            <TextInput
                              style={styles.formInput}
                              value={billingAddress.state}
                              onChangeText={(text) => setBillingAddress(prev => ({ ...prev, state: text }))}
                              placeholder="State"
                              placeholderTextColor="#999"
                            />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
                          <TextInput
                            style={styles.formInput}
                            value={billingAddress.gstin}
                            onChangeText={(text) => setBillingAddress(prev => ({ ...prev, gstin: text }))}
                            placeholder="GST Number"
                            placeholderTextColor="#999"
                          />
                        </View>
                      </>
                    )}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            )}

            {/* Place Order Button */}
            {Object.values(cart).some(quantity => quantity > 0) && (
              <View style={styles.orderButtonContainer}>
                <TouchableOpacity
                  style={[styles.placeOrderBtn, isLoading && styles.placeOrderBtnDisabled]}
                  onPress={submitOrder}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Text style={styles.placeOrderBtnText}>Placing Order...</Text>
                  ) : (
                    <>
                      <Text style={styles.placeOrderBtnText}>
                        Place Order • ₹{getCartTotal().toLocaleString()}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Track Orders Content */
          <ScrollView style={styles.trackOrderContent}>
            {ordersLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : orders && orders.length > 0 ? (
              <View style={styles.ordersList}>
                {orders?.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View>
                        <Text style={styles.orderNumber}>
                          #{order.id ? order.id.slice(-6).toUpperCase() : ' '}
                        </Text>
                        <Text style={styles.orderDate}>
                          {formatDate(order.created_at)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Text style={styles.statusText}>{order.status}</Text>
                      </View>
                    </View>

                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{order.client.name}</Text>
                      <Text style={styles.clientPhone}>{order.client.phone}</Text>
                    </View>

                    <View style={styles.orderTotal}>
                      <Text style={styles.totalLabel}>Total: </Text>
                      <Text style={styles.totalAmount}>₹{calculateTotal(order.items)}</Text>
                    </View>

                    {order.awb_number && (
                      <View style={styles.trackingInfo}>
                        <Ionicons name="cube-outline" size={16} color="#4A90E2" />
                        <Text style={styles.trackingText}>
                          Tracking: {order.awb_number}
                        </Text>
                      </View>
                    )}

                    {/* Removed Mark as Fulfilled - Admin only feature */}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyOrders}>
                <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyOrdersTitle}>No Orders Yet</Text>
                <Text style={styles.emptyOrdersText}>
                  Your order history will appear here
                </Text>
              </View>
            )}
          </ScrollView>
        )}
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
    backgroundColor: '#00B761',
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

  // Place Order Content
  placeOrderContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },

  productsContainer: {
    flex: 1,
  },
  productsGrid: {
    paddingBottom: 100,
  },

  // Zepto-Style Product Cards
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // Square Product Image (Zepto Style)
  productImageContainer: {
    width: 65,
    height: 65,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F8F8F8',
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
    backgroundColor: '#F0F7FF',
  },

  // Organized Text Container
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

  // Quantity Section (Zepto Style)
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

  // Cart Summary (Zepto Style)
  cartSummary: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#00B761',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartDetails: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cartTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 6,
  },

  // Track Orders Content
  trackOrderContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  ordersList: {
    paddingVertical: 8,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  orderDate: {
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
  clientInfo: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clientPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  orderTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B761',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 8,
    borderRadius: 6,
  },
  trackingText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Empty State
  emptyOrders: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyOrdersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Customer Information Form Styles
  customerSection: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  customerForm: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formSection: {
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
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputGroup: {
    flex: 0.48,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderButtonContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  placeOrderBtn: {
    backgroundColor: '#00B761',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#999',
    elevation: 0,
    shadowOpacity: 0,
  },
  placeOrderBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
});