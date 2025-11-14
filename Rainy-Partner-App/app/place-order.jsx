import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function PlaceOrderScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [billingIsSameAsShipping, setBillingIsSameAsShipping] = useState(true);
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    district: "",
    state: "",
    pin: "",
  });

  const [billingAddress, setBillingAddress] = useState({
    address: "",
    city: "",
    district: "",
    state: "",
    pin: "",
    gstin: "",
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_URL}/products`);
      return response.json();
    },
  });

  const handleQuantityChange = (productCode, quantity, price) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product === productCode);
      if (quantity === 0) {
        return prev.filter((item) => item.product !== productCode);
      }

      if (existing) {
        return prev.map((item) =>
          item.product === productCode ? { ...item, quantity, price } : item
        );
      } else {
        return [...prev, { product: productCode, quantity, price }];
      }
    });
  };

  const calculateTotal = () => {
    return selectedItems.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
  };

  const validateOrder = () => {
    if (selectedItems.length === 0) {
      Alert.alert("Error", "Please select at least one product");
      return false;
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      Alert.alert("Error", "Please fill in customer name and phone");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(customerInfo.phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return false;
    }

    if (
      !shippingAddress.address.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.pin.trim()
    ) {
      Alert.alert("Error", "Please fill in complete shipping address");
      return false;
    }

    if (!/^\d{6}$/.test(shippingAddress.pin)) {
      Alert.alert("Error", "Please enter a valid 6-digit PIN code");
      return false;
    }

    if (!billingIsSameAsShipping) {
      if (
        !billingAddress.address.trim() ||
        !billingAddress.city.trim() ||
        !billingAddress.pin.trim()
      ) {
        Alert.alert("Error", "Please fill in complete billing address");
        return false;
      }

      if (!/^\d{6}$/.test(billingAddress.pin)) {
        Alert.alert(
          "Error",
          "Please enter a valid 6-digit PIN code for billing address"
        );
        return false;
      }
    }

    return true;
  };

  const submitOrder = async () => {
    if (!validateOrder()) return;

    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        setIsLoading(false);
        return;
      }

      const orderData = {
        items: selectedItems,
        client: customerInfo,
        shipping: shippingAddress,
        billing: billingIsSameAsShipping ? shippingAddress : billingAddress,
      };

      const response = await axios.post(
        `${BACKEND_URL}/plumber/place-order`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          "Success",
          "Order placed successfully! Admin will confirm and provide tracking details.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", response.data?.detail || "Failed to place order");
      }
    } catch (error) {
      console.error("Place order error:", error);

      if (error.response?.status === 401) {
        Alert.alert("Error", "Your session has expired. Please log in again.");
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.detail ||
            "Failed to place order. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Place Order</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Rainy Filters</Text>

            {products &&
              products.map((product) => {
                return (
                  <View key={product.code} style={styles.productCard}>
                    <View style={styles.productImageContainer}>
                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log(
                              `❌ Image load error for ${product.code}:`,
                              error.nativeEvent
                            );
                          }}
                          onLoad={() => {
                            console.log(
                              `✅ Image loaded successfully for ${product.code}`
                            );
                          }}
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons
                            name="water-outline"
                            size={32}
                            color="#00B761"
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.productTextContainer}>
                      <View style={styles.productMainInfo}>
                        <Text style={styles.productTitle} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productCapacity} numberOfLines={1}>
                          {product.short_desc}
                        </Text>
                        <Text style={styles.productPrice}>
                          ₹
                          {typeof product.mrp === "number"
                            ? product.mrp.toLocaleString()
                            : "N/A"}
                        </Text>
                      </View>

                      <View style={styles.quantitySection}>
                        {selectedItems.find(
                          (item) => item.product === product.code
                        )?.quantity > 0 ? (
                          <View style={styles.quantityContainer}>
                            <TouchableOpacity
                              style={styles.quantityBtn}
                              onPress={() => {
                                const currentQuantity =
                                  selectedItems.find(
                                    (item) => item.product === product.code
                                  )?.quantity || 0;
                                handleQuantityChange(
                                  product.code,
                                  Math.max(0, currentQuantity - 1),
                                  product.mrp
                                );
                              }}
                            >
                              <Text style={styles.quantityBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.quantityDisplay}>
                              {selectedItems.find(
                                (item) => item.product === product.code
                              )?.quantity || 0}
                            </Text>
                            <TouchableOpacity
                              style={styles.quantityBtn}
                              onPress={() => {
                                const currentQuantity =
                                  selectedItems.find(
                                    (item) => item.product === product.code
                                  )?.quantity || 0;
                                handleQuantityChange(
                                  product.code,
                                  currentQuantity + 1,
                                  product.mrp
                                );
                              }}
                            >
                              <Text style={styles.quantityBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addToCartBtn}
                            onPress={() =>
                              handleQuantityChange(product.code, 1, product.mrp)
                            }
                          >
                            <Text style={styles.addBtnText}>ADD</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

            {selectedItems.length > 0 && (
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {selectedItems.map((item) => {
                  const product = products?.find(
                    (p) => p.code === item.product
                  );
                  return (
                    <View key={item.product} style={styles.summaryItem}>
                      <Text style={styles.summaryProduct}>
                        {product?.name} x {item.quantity}
                      </Text>
                      <Text style={styles.summaryPrice}>
                        ₹{(item.quantity * item.price).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>
                    ₹{calculateTotal().toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                value={customerInfo.name}
                onChangeText={(text) =>
                  setCustomerInfo({ ...customerInfo, name: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit phone number"
                value={customerInfo.phone}
                onChangeText={(text) =>
                  setCustomerInfo({ ...customerInfo, phone: text })
                }
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={customerInfo.email}
                onChangeText={(text) =>
                  setCustomerInfo({ ...customerInfo, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Enter complete address"
                value={shippingAddress.address}
                onChangeText={(text) =>
                  setShippingAddress({ ...shippingAddress, address: text })
                }
                multiline
              />
            </View>

            <View style={[styles.inputGroup, styles.row]}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={shippingAddress.city}
                  onChangeText={(text) =>
                    setShippingAddress({ ...shippingAddress, city: text })
                  }
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="District"
                  value={shippingAddress.district}
                  onChangeText={(text) =>
                    setShippingAddress({ ...shippingAddress, district: text })
                  }
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.row]}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  value={shippingAddress.state}
                  onChangeText={(text) =>
                    setShippingAddress({ ...shippingAddress, state: text })
                  }
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>PIN Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit PIN"
                  value={shippingAddress.pin}
                  onChangeText={(text) =>
                    setShippingAddress({ ...shippingAddress, pin: text })
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.sectionTitle}>Billing Address</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.toggleLabel}>Same as Shipping</Text>
                <Switch
                  value={billingIsSameAsShipping}
                  onValueChange={setBillingIsSameAsShipping}
                  trackColor={{ false: "#D0D0D0", true: "#00B761" }}
                  thumbColor={"#fff"}
                />
              </View>
            </View>

            {!billingIsSameAsShipping && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Enter billing address"
                    value={billingAddress.address}
                    onChangeText={(text) =>
                      setBillingAddress({ ...billingAddress, address: text })
                    }
                    multiline
                  />
                </View>

                <View style={[styles.inputGroup, styles.row]}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      value={billingAddress.city}
                      onChangeText={(text) =>
                        setBillingAddress({ ...billingAddress, city: text })
                      }
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.label}>District</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="District"
                      value={billingAddress.district}
                      onChangeText={(text) =>
                        setBillingAddress({ ...billingAddress, district: text })
                      }
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.row]}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="State"
                      value={billingAddress.state}
                      onChangeText={(text) =>
                        setBillingAddress({ ...billingAddress, state: text })
                      }
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.label}>PIN Code *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit PIN"
                      value={billingAddress.pin}
                      onChangeText={(text) =>
                        setBillingAddress({ ...billingAddress, pin: text })
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GSTIN (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter GST number"
                    value={billingAddress.gstin}
                    onChangeText={(text) =>
                      setBillingAddress({ ...billingAddress, gstin: text })
                    }
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {selectedItems.length > 0 && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={submitOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Placing Order...</Text>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    Place Order • ₹{calculateTotal().toLocaleString()}
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
  container: { flex: 1, backgroundColor: "#F8F8F8" },
  keyboardView: { flex: 1 },
  header: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: { padding: 4 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  headerSpacer: { width: 32 },
  scrollView: { flex: 1 },
  section: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  productImageContainer: {
    width: 65,
    height: 65,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#F0F7FF",
  },
  productImage: { width: "100%", height: "100%", resizeMode: "contain" },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  productTextContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  productMainInfo: { flex: 1, paddingRight: 8 },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  productCapacity: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
    marginBottom: 6,
  },
  productPrice: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  quantitySection: { alignItems: "center" },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00B761",
    borderRadius: 6,
    backgroundColor: "white",
  },
  quantityBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B761",
  },
  quantityBtnText: { fontSize: 16, fontWeight: "600", color: "white" },
  quantityDisplay: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#00B761",
    minWidth: 32,
    textAlign: "center",
  },
  addToCartBtn: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#00B761",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#00B761" },
  orderSummary: {
    backgroundColor: "#F0F7FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryProduct: { fontSize: 14, color: "#333", flex: 1 },
  summaryPrice: { fontSize: 14, fontWeight: "600", color: "#333" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  totalAmount: { fontSize: 18, fontWeight: "700", color: "#00B761" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "white",
  },
  multilineInput: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { flex: 0.48 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginRight: 8,
  },
  submitContainer: {
    backgroundColor: "white",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  submitButton: {
    backgroundColor: "#00B761",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: { backgroundColor: "#999" },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginRight: 8,
  },
  bottomSpacer: { height: 20 },
});
