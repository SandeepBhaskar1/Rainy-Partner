import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Loader,
  AlertCircle,
  X,
  Package,
  Truck,
  CircleCheckBig,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import "./Orders.css";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      {icons[type]}
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
};

// Confirmation Dialog Component
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel} disabled={loading} className="btn-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="btn-confirm">
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Input validation schemas
const validators = {
  phone: (value) => /^[0-9]{10}$/.test(value.replace(/\s/g, "")),
  pin: (value) => /^[0-9]{6}$/.test(value),
  required: (value) => value && value.trim().length > 0,
  minLength: (value, min) => value && value.trim().length >= min,
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '');
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [plumbers, setPlumbers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignedPlumberIds, setAssignedPlumberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [actionLoading, setActionLoading] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [newOrder, setNewOrder] = useState({
    plumber_id: "",
    client_name: "",
    client_phone: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_pin: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_pin: "",
    sameAsBilling: false,
    model: "",
    quantity: 1,
  });

  const backendUrl = import.meta.env.VITE_APP_BACKEND_URL;
  const abortControllerRef = useRef(null);

  // Toast notification helper
  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // API helper with error handling
  const apiCall = async (method, url, data = null, config = {}) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await axios({
        method,
        url: `${backendUrl}${url}`,
        data,
        ...config,
        headers: {
          Authorization: `Bearer ${token}`,
          ...config.headers,
        },
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        showToast("Session expired. Please login again.", "error");
        redirectToLogin();
      }
      throw error;
    }
  };

  useEffect(() => {
    fetchUserData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (assignedPlumberIds.length > 0) {
      fetchData();
    }
  }, [pagination.page, assignedPlumberIds]);

  const fetchUserData = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        showToast("Authentication required. Please login.", "error");
        redirectToLogin();
        return;
      }

      const response = await apiCall("get", "/coordinator/profile");
      const assignedPlumbers = response.assigned_plumbers || [];
      setAssignedPlumberIds(assignedPlumbers);
    } catch (error) {
      console.error("Error fetching user data:", error);
      showToast("Failed to load user data", "error");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      const [ordersResponse, plumbersResponse, productsResponse] =
        await Promise.allSettled([
          apiCall("get", "/coordinator/orders", null, { params, signal: abortControllerRef.current.signal }),
          apiCall("get", "/coordinator/plumbers", null, { signal: abortControllerRef.current.signal }),
          apiCall("get", "/products", null, { signal: abortControllerRef.current.signal }),
        ]);

      let ordersData = [];
      if (ordersResponse.status === "fulfilled") {
        const response = ordersResponse.value;
        if (response.orders && Array.isArray(response.orders)) {
          ordersData = response.orders;
          if (response.pagination) {
            setPagination(response.pagination);
          }
        } else if (Array.isArray(response)) {
          ordersData = response;
        }
      }

      let plumbersMap = {};
      if (plumbersResponse.status === "fulfilled") {
        const plumbersData = plumbersResponse.value;
        const plumbersList = plumbersData.plumbers || plumbersData || [];
        setPlumbers(plumbersList);

        plumbersList.forEach((plumber) => {
          const plumberId = plumber._id || plumber.id;
          if (plumberId) {
            plumbersMap[plumberId] = plumber;
          }
        });
      }

      if (productsResponse.status === "fulfilled") {
        const productsData = productsResponse.value;
        const productsList = productsData.products || productsData || [];
        setProducts(productsList);
      }

      const ordersWithPlumbers = ordersData.map((order) => {
        const plumberId = order.plumber_id || order.plumberId;
        return {
          ...order,
          plumber: plumbersMap[plumberId] || null,
        };
      });

      // Filter orders for coordinator's assigned plumbers only
      const filteredOrders = ordersWithPlumbers.filter((order) => {
        const plumberId = order.plumber_id || order.plumberId;
        return assignedPlumberIds.includes(plumberId);
      });

      setOrders(filteredOrders);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error("Error fetching orders:", error);
      setError(error.response?.data?.detail || "Failed to load orders");
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  };

  const getFilteredOrders = useCallback(() => {
    if (!Array.isArray(orders)) return [];
    
    if (!searchQuery.trim()) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter((order) => {
      const orderId = (order.id || order._id || "").toString().toLowerCase();
      const plumberName = getPlumberName(order).toLowerCase();
      const customerName = getCustomerName(order).toLowerCase();
      const clientPhone = (order.client?.phone || "").toLowerCase();
      
      return (
        orderId.includes(query) ||
        plumberName.includes(query) ||
        customerName.includes(query) ||
        clientPhone.includes(query)
      );
    });
  }, [orders, searchQuery]);

  const getAvailablePlumbers = useCallback(() => {
    const approvedPlumbers = plumbers.filter(
      (plumber) => plumber.kyc_status === "approved"
    );

    if (assignedPlumberIds.length > 0) {
      return approvedPlumbers.filter((plumber) =>
        assignedPlumberIds.includes(plumber._id || plumber.id)
      );
    }

    return approvedPlumbers;
  }, [plumbers, assignedPlumberIds]);

  const getProductNameById = useCallback((productId) => {
    const product = products.find(
      (p) => (p.code || p._id || p.id || p.product_id) === productId
    );
    return product ? product.name : productId;
  }, [products]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const calculateOrderTotal = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    return items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + price * quantity;
    }, 0);
  };

  const getProductNames = (items) => {
    if (!Array.isArray(items) || items.length === 0) return "N/A";
    return items.map((item) => getProductNameById(item.product)).join(", ");
  };

  const getPlumberName = (order) => {
    if (order.plumber?.name) return order.plumber.name;
    if (order.plumber_name) return order.plumber_name;
    return "N/A";
  };

  const getCustomerName = (order) => {
    if (order.client?.name) return order.client.name;
    if (order.customer_name) return order.customer_name;
    return "N/A";
  };

  const getBillingAddress = (order) => {
    if (order.billing) {
      const b = order.billing;
      const parts = [];
      const seen = new Set();

      if (b.address && typeof b.address === "string" && b.address.trim()) {
        parts.push(b.address);
        seen.add(b.address.toLowerCase().trim());
      }
      if (b.city && b.city.trim() && !seen.has(b.city.toLowerCase().trim())) {
        parts.push(b.city);
        seen.add(b.city.toLowerCase().trim());
      }
      if (b.district && b.district.trim() && !seen.has(b.district.toLowerCase().trim())) {
        parts.push(b.district);
        seen.add(b.district.toLowerCase().trim());
      }
      if (b.state && b.state.trim() && !seen.has(b.state.toLowerCase().trim())) {
        parts.push(b.state);
        seen.add(b.state.toLowerCase().trim());
      }
      if (b.pin && b.pin.trim() && !seen.has(b.pin.toLowerCase().trim())) {
        parts.push(b.pin);
      }

      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
    return "N/A";
  };

  const getShippingAddress = (order) => {
    if (order.shipping) {
      const s = order.shipping;
      const parts = [];
      const seen = new Set();

      if (s.address && typeof s.address === "string" && s.address.trim()) {
        parts.push(s.address);
        seen.add(s.address.toLowerCase().trim());
      }
      if (s.city && s.city.trim() && !seen.has(s.city.toLowerCase().trim())) {
        parts.push(s.city);
        seen.add(s.city.toLowerCase().trim());
      }
      if (s.district && s.district.trim() && !seen.has(s.district.toLowerCase().trim())) {
        parts.push(s.district);
        seen.add(s.district.toLowerCase().trim());
      }
      if (s.state && s.state.trim() && !seen.has(s.state.toLowerCase().trim())) {
        parts.push(s.state);
        seen.add(s.state.toLowerCase().trim());
      }
      if (s.pin && s.pin.trim() && !seen.has(s.pin.toLowerCase().trim())) {
        parts.push(s.pin);
      }

      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
    return "N/A";
  };

  const validateField = (name, value) => {
    const sanitized = sanitizeInput(value);
    
    switch (name) {
      case "client_name":
        return validators.minLength(sanitized, 2) ? null : "Name must be at least 2 characters";
      case "client_phone":
        return validators.phone(sanitized) ? null : "Phone must be 10 digits";
      case "billing_pin":
      case "shipping_pin":
        return validators.pin(sanitized) ? null : "PIN must be 6 digits";
      case "billing_address":
      case "billing_city":
      case "billing_state":
      case "shipping_address":
      case "shipping_city":
      case "shipping_state":
        return validators.required(sanitized) ? null : "This field is required";
      default:
        return null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : sanitizeInput(value);
    
    setNewOrder((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === "sameAsBilling" && checked) {
      setNewOrder((prev) => ({
        ...prev,
        shipping_address: prev.billing_address,
        shipping_city: prev.billing_city,
        shipping_state: prev.billing_state,
        shipping_pin: prev.billing_pin,
      }));
    }
  };

  const getSelectedProduct = () => {
    return products.find(
      (p) =>
        String(p.code || p._id || p.id || p.product_id) ===
        String(newOrder.model)
    );
  };

  const calculateTotal = () => {
    const product = getSelectedProduct();
    if (!product || !product.mrp) {
      return 0;
    }
    const quantity = Number(newOrder.quantity) || 1;
    const price = Number(product.mrp) || 0;
    return price * quantity;
  };

  const validateOrderForm = () => {
    const errors = {};

    // Validate all fields
    Object.keys(newOrder).forEach((key) => {
      if (key === 'sameAsBilling' || key === 'quantity') return;
      const error = validateField(key, newOrder[key]);
      if (error) errors[key] = error;
    });

    // Validate plumber and model selection
    if (!newOrder.plumber_id) errors.plumber_id = "Please select a plumber";
    if (!newOrder.model) errors.model = "Please select a model";
    if (!newOrder.quantity || newOrder.quantity < 1) errors.quantity = "Quantity must be at least 1";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    if (!validateOrderForm()) {
      showToast("Please fix validation errors", "error");
      return;
    }

    setActionLoading((prev) => ({ ...prev, createOrder: true }));

    try {
      const product = getSelectedProduct();
      if (!product) {
        showToast("Selected product not found", "error");
        return;
      }

      const storedUser = localStorage.getItem("user");
      let userId = null;
    
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userId = parsedUser.id || parsedUser._id;
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }

      if (!userId) {
        showToast("User information not found. Please login again.", "error");
        return;
      }

      const orderData = {
        plumber_id: newOrder.plumber_id,
        client: {
          name: newOrder.client_name.trim(),
          phone: newOrder.client_phone.trim(),
        },
        billing: {
          address: newOrder.billing_address.trim(),
          city: newOrder.billing_city.trim(),
          state: newOrder.billing_state.trim(),
          pin: newOrder.billing_pin.trim(),
        },
        shipping: {
          address: newOrder.shipping_address.trim(),
          city: newOrder.shipping_city.trim(),
          state: newOrder.shipping_state.trim(),
          pin: newOrder.shipping_pin.trim(),
        },
        items: [
          {
            product: product.code || product._id || product.id || product.product_id,
            price: product.mrp,
            quantity: Number(newOrder.quantity),
          },
        ],
        total_amount: calculateTotal(), 
        order_created_by: userId
      };

      await apiCall("post", "/coordinator/coordinator-place-order", orderData);

      showToast("Order created successfully!", "success");
      setShowCreateModal(false);
      setNewOrder({
        plumber_id: "",
        client_name: "",
        client_phone: "",
        billing_address: "",
        billing_city: "",
        billing_state: "",
        billing_pin: "",
        shipping_address: "",
        shipping_city: "",
        shipping_state: "",
        shipping_pin: "",
        sameAsBilling: false,
        model: "",
        quantity: 1,
      });
      setValidationErrors({});
      
      fetchData();
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create order";
      showToast(errorMessage, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, createOrder: false }));
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Status Change",
      message: `Are you sure you want to change the status to "${newStatus}"?`,
      onConfirm: async () => {
        setActionLoading((prev) => ({ ...prev, [`status-${order._id}`]: true }));
        
        try {
          await apiCall("put", `/coordinator/orders/${order._id}/status`, {
            status: newStatus,
          });

          setOrders((prevOrders) =>
            prevOrders.map((o) =>
              o._id === order._id ? { ...o, status: newStatus } : o
            )
          );

          showToast("Status updated successfully", "success");
        } catch (err) {
          console.error("Failed to update status:", err);
          showToast("Failed to update status", "error");
        } finally {
          setActionLoading((prev) => ({ ...prev, [`status-${order._id}`]: false }));
          setConfirmDialog({ isOpen: false });
        }
      },
      onCancel: () => setConfirmDialog({ isOpen: false }),
    });
  };

  const handleSaveAWB = async (order) => {
    const awbNumber = order.awb_number?.trim();
    if (!awbNumber) {
      showToast("Please enter an AWB number", "error");
      return;
    }

    setActionLoading((prev) => ({ ...prev, [`awb-${order._id}`]: true }));

    try {
      await apiCall("put", `/coordinator/orders/${order._id}/status`, {
        awb_number: awbNumber,
        status: order.status,
      });

      showToast("AWB number saved successfully", "success");
      
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === order._id ? { ...o, awb_changed: false } : o
        )
      );
    } catch (err) {
      console.error("Failed to update AWB number:", err);
      showToast("Failed to update AWB number", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`awb-${order._id}`]: false }));
    }
  };

  const handleMarkFulfilled = async (order) => {
    setConfirmDialog({
      isOpen: true,
      title: "Mark Order as Fulfilled",
      message: "Are you sure you want to mark this order as fulfilled?",
      onConfirm: async () => {
        setActionLoading((prev) => ({ ...prev, [`fulfilled-${order._id}`]: true }));
        
        try {
          await apiCall("put", `/coordinator/orders/${order._id}/status`, {
            status: "Fulfilled",
            fulfilled_at: new Date().toISOString(),
          });

          setOrders((prevOrders) =>
            prevOrders.map((o) =>
              o._id === order._id ? { ...o, status: "Fulfilled" } : o
            )
          );

          showToast("Order marked as fulfilled", "success");
        } catch (err) {
          console.error("Failed to mark order as fulfilled:", err);
          showToast("Failed to mark order as fulfilled", "error");
        } finally {
          setActionLoading((prev) => ({ ...prev, [`fulfilled-${order._id}`]: false }));
          setConfirmDialog({ isOpen: false });
        }
      },
      onCancel: () => setConfirmDialog({ isOpen: false }),
    });
  };

  const handleInvoiceUpload = async (order, file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5MB limit', 'error');
      return;
    }

    setActionLoading((prev) => ({ ...prev, [`invoice-${order._id}`]: true }));

    try {
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        showToast("Authentication required. Please login again.", "error");
        return;
      }

      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('docType', 'invoice');
      formData.append('fileType', 'pdf');

      const response = await axios.post(
        `${backendUrl}/coordinator/order/upload-invoice/${order._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      showToast('Invoice uploaded successfully', 'success');
      
      if (selectedOrder && selectedOrder._id === order._id) {
        setSelectedOrder({
          ...selectedOrder,
          invoiceKey: response.data.data.invoiceKey
        });
        console.log(selectedOrder);
        
      }

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === order._id
            ? { ...o, invoiceKey: response.data.data.invoiceKey }
            : o
        )
      );
    } catch (err) {
      console.error('Failed to upload invoice:', err);
      showToast(err.response?.data?.message || 'Failed to upload invoice', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`invoice-${order._id}`]: false }));
    }
  };

  const handleInvoiceDownload = async (order) => {
    setActionLoading((prev) => ({ ...prev, [`download-${order._id}`]: true }));

    try {
      const response = await apiCall("post", `/coordinator/order/get-invoice/${order._id}`, {
        key: order.invoiceKey
      });
      window.open(response.url, '_blank');
    } catch (err) {
      console.error('Failed to download invoice:', err);
      showToast('Failed to download invoice', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`download-${order._id}`]: false }));
    }
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="loading-spinner">
            <Loader size={32} className="spinner-icon" />
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog {...confirmDialog} />

      <div className="orders-container">
        <div className="orders-header">
          <h2>Orders</h2>
          <div className="header-actions">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by Order ID, Plumber, Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search orders"
              />
            </div>
            <button
              className="create-order-btn"
              onClick={() => setShowCreateModal(true)}
              aria-label="Create new order"
            >
              Create Order
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Order Sections */}
        {["Order-Placed", "Payment-Completed", "Dispatched", "Fulfilled", "Cancelled"].map((status) => {
          const sectionOrders = filteredOrders.filter(order => order.status === status);
          const sectionTitles = {
            "Order-Placed": "Order Placed",
            "Payment-Completed": "Payment Done",
            "Dispatched": "Dispatched",
            "Fulfilled": "Order Fulfilled",
            "Cancelled": "Cancelled Orders"
          };
          const sectionIcons = {
            "Order-Placed": <Package size={20} />,
            "Payment-Completed": <Package size={20} />,
            "Dispatched": <Truck size={20} />,
            "Fulfilled": <CircleCheckBig size={20} />,
            "Cancelled": <X size={20} />
          };

          return (
            <div key={status} className="orders-section" style={{ marginTop: "20px" }}>
              <div className="section-header">
                {sectionIcons[status]}
                <h3>{sectionTitles[status]}</h3>
                <span className="order-count">({sectionOrders.length})</span>
              </div>

              <div className="table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Plumber</th>
                      <th>Client</th>
                      <th>Billing</th>
                      <th>Shipping</th>
                      <th>Item</th>
                      <th>Total</th>
                      {status === "Dispatched" && <th>AWB/Tracking ID</th>}
                      {status === "Dispatched" && <th>Fulfilment</th>}
                      {(status === "Order-Placed" || status === "Payment-Completed") && <th>Status</th>}
                      {(status === "Fulfilled" || status === "Cancelled") && <th>{status === "Fulfilled" ? "Delivered On" : "Cancelled On"}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionOrders.length > 0 ? (
                      sectionOrders.map((order) => (
                        <tr key={order._id || order.id}>
                          <td 
                            className="order-id" 
                            title={order._id || order.id} 
                            onClick={() => setSelectedOrder(order)}
                            style={{ cursor: 'pointer' }}
                            tabIndex={0}
                            role="button"
                            aria-label={`View details for order ${order.id || order._id}`}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedOrder(order);
                              }
                            }}
                          >
                            #{order.id || order._id || "N/A"}
                          </td>
                          <td className="order-date">
                            {formatDate(order.created_at || order.createdAt)}
                          </td>
                          <td className="plumber-name">{getPlumberName(order)}</td>
                          <td className="customer-name">{getCustomerName(order)}</td>
                          <td className="address">{getBillingAddress(order)}</td>
                          <td className="address">{getShippingAddress(order)}</td>
                          <td className="product-name">
                            {getProductNames(order.items)} x {order.items?.length || 0}
                          </td>
                          <td className="amount">
                            ₹{calculateOrderTotal(order.items).toLocaleString("en-IN")}
                          </td>

                          {status === "Dispatched" && (
                            <>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <input
                                    type="text"
                                    value={order.awb_number || ""}
                                    placeholder="Enter AWB Number"
                                    className="awb-input"
                                    aria-label="AWB tracking number"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setOrders((prevOrders) =>
                                        prevOrders.map((o) =>
                                          o._id === order._id
                                            ? { ...o, awb_number: value, awb_changed: true }
                                            : o
                                        )
                                      );
                                    }}
                                  />
                                  {order.awb_changed && (
                                    <button
                                      className="save-awb-btn"
                                      onClick={() => handleSaveAWB(order)}
                                      disabled={actionLoading[`awb-${order._id}`]}
                                      aria-label="Save AWB number"
                                    >
                                      {actionLoading[`awb-${order._id}`] ? "Saving..." : "Save"}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td>
                                <button
                                  onClick={() => handleMarkFulfilled(order)}
                                  className="mark-fulfilled-btn"
                                  disabled={order.status === "Fulfilled" || actionLoading[`fulfilled-${order._id}`]}
                                  aria-label="Mark order as fulfilled"
                                >
                                  {actionLoading[`fulfilled-${order._id}`] 
                                    ? "Processing..." 
                                    : order.status === "Fulfilled" 
                                    ? "Fulfilled" 
                                    : "Mark Fulfilled"}
                                </button>
                              </td>
                            </>
                          )}

                          {(status === "Order-Placed" || status === "Payment-Completed") && (
                            <td>
                              <select
                                value={order.status || "Order-Placed"}
                                className="status-dropdown"
                                onChange={(e) => handleStatusChange(order, e.target.value)}
                                disabled={actionLoading[`status-${order._id}`]}
                                aria-label="Change order status"
                              >
                                {["Order-Placed", "Payment-Completed", "Dispatched", "Fulfilled", "Cancelled"].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}

                          {(status === "Fulfilled" || status === "Cancelled") && (
                            <td>
                              {formatDate(
                                status === "Fulfilled" 
                                  ? (order.fulfilled_at || order.fulfilledAt)
                                  : (order.cancelled_at || order.cancelledAt)
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", padding: "2rem" }}>
                          No orders found in this section.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination" role="navigation" aria-label="Pagination">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCreateModal(false);
            setValidationErrors({});
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="create-order-title">
            <div className="modal-header">
              <h3 id="create-order-title">Create Order</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  setValidationErrors({});
                }}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="order-form">
              <div className="form-section">
                <h4>Plumber & Client Details</h4>

                <div className="form-row same-line">
                  <div className="form-group">
                    <label htmlFor="plumber_id">Plumber *</label>
                    <select
                      id="plumber_id"
                      name="plumber_id"
                      value={newOrder.plumber_id}
                      onChange={handleInputChange}
                      required
                      aria-required="true"
                      aria-invalid={!!validationErrors.plumber_id}
                    >
                      <option value="">Select Plumber</option>
                      {getAvailablePlumbers().map((plumber) => (
                        <option
                          key={plumber._id || plumber.id}
                          value={plumber._id || plumber.id}
                        >
                          {plumber.name} - {plumber.phone}
                        </option>
                      ))}
                    </select>
                    {validationErrors.plumber_id && (
                      <span className="error-text" role="alert">{validationErrors.plumber_id}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="client_name">Client Name *</label>
                    <input
                      id="client_name"
                      type="text"
                      name="client_name"
                      value={newOrder.client_name}
                      onChange={handleInputChange}
                      placeholder="Client Name"
                      required
                      aria-required="true"
                      aria-invalid={!!validationErrors.client_name}
                    />
                    {validationErrors.client_name && (
                      <span className="error-text" role="alert">{validationErrors.client_name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="client_phone">Client Phone *</label>
                    <input
                      id="client_phone"
                      type="tel"
                      name="client_phone"
                      value={newOrder.client_phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      required
                      aria-required="true"
                      aria-invalid={!!validationErrors.client_phone}
                    />
                    {validationErrors.client_phone && (
                      <span className="error-text" role="alert">{validationErrors.client_phone}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Address Details</h3>
                <div className="address-row">
                  <div className="address-half">
                    <div className="form-group">
                      <label htmlFor="billing_address">Billing Address *</label>
                      <input
                        id="billing_address"
                        type="text"
                        name="billing_address"
                        value={newOrder.billing_address}
                        onChange={handleInputChange}
                        placeholder="Street Address"
                        required
                        aria-required="true"
                        aria-invalid={!!validationErrors.billing_address}
                      />
                      {validationErrors.billing_address && (
                        <span className="error-text" role="alert">{validationErrors.billing_address}</span>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="city-state-pin">
                        <label htmlFor="billing_city">City *</label>
                        <input
                          id="billing_city"
                          type="text"
                          name="billing_city"
                          value={newOrder.billing_city}
                          onChange={handleInputChange}
                          placeholder="City"
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.billing_city}
                        />
                        {validationErrors.billing_city && (
                          <span className="error-text" role="alert">{validationErrors.billing_city}</span>
                        )}
                      </div>
                      <div className="city-state-pin">
                        <label htmlFor="billing_state">State *</label>
                        <input
                          id="billing_state"
                          type="text"
                          name="billing_state"
                          value={newOrder.billing_state}
                          onChange={handleInputChange}
                          placeholder="State"
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.billing_state}
                        />
                        {validationErrors.billing_state && (
                          <span className="error-text" role="alert">{validationErrors.billing_state}</span>
                        )}
                      </div>
                      <div className="city-state-pin">
                        <label htmlFor="billing_pin">PIN *</label>
                        <input
                          id="billing_pin"
                          type="text"
                          name="billing_pin"
                          value={newOrder.billing_pin}
                          onChange={handleInputChange}
                          placeholder="PIN Code"
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.billing_pin}
                        />
                        {validationErrors.billing_pin && (
                          <span className="error-text" role="alert">{validationErrors.billing_pin}</span>
                        )}
                      </div>
                    </div>

                    <div className="checkbox-container">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="sameAsBilling"
                          checked={newOrder.sameAsBilling}
                          onChange={handleInputChange}
                        />
                        Shipping same as billing
                      </label>
                    </div>
                  </div>

                  <div className="address-half">
                    <div className="form-group">
                      <label htmlFor="shipping_address">Shipping Address *</label>
                      <input
                        id="shipping_address"
                        type="text"
                        name="shipping_address"
                        value={newOrder.shipping_address}
                        onChange={handleInputChange}
                        placeholder="Street Address"
                        disabled={newOrder.sameAsBilling}
                        required
                        aria-required="true"
                        aria-invalid={!!validationErrors.shipping_address}
                      />
                      {validationErrors.shipping_address && (
                        <span className="error-text" role="alert">{validationErrors.shipping_address}</span>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="city-state-pin">
                        <label htmlFor="shipping_city">City *</label>
                        <input
                          id="shipping_city"
                          type="text"
                          name="shipping_city"
                          value={newOrder.shipping_city}
                          onChange={handleInputChange}
                          placeholder="City"
                          disabled={newOrder.sameAsBilling}
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.shipping_city}
                        />
                        {validationErrors.shipping_city && (
                          <span className="error-text" role="alert">{validationErrors.shipping_city}</span>
                        )}
                      </div>
                      <div className="city-state-pin">
                        <label htmlFor="shipping_state">State *</label>
                        <input
                          id="shipping_state"
                          type="text"
                          name="shipping_state"
                          value={newOrder.shipping_state}
                          onChange={handleInputChange}
                          placeholder="State"
                          disabled={newOrder.sameAsBilling}
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.shipping_state}
                        />
                        {validationErrors.shipping_state && (
                          <span className="error-text" role="alert">{validationErrors.shipping_state}</span>
                        )}
                      </div>
                      <div className="city-state-pin">
                        <label htmlFor="shipping_pin">PIN *</label>
                        <input
                          id="shipping_pin"
                          type="text"
                          name="shipping_pin"
                          value={newOrder.shipping_pin}
                          onChange={handleInputChange}
                          placeholder="PIN Code"
                          disabled={newOrder.sameAsBilling}
                          required
                          aria-required="true"
                          aria-invalid={!!validationErrors.shipping_pin}
                        />
                        {validationErrors.shipping_pin && (
                          <span className="error-text" role="alert">{validationErrors.shipping_pin}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="model">Model *</label>
                    <select
                      id="model"
                      name="model"
                      value={newOrder.model}
                      onChange={handleInputChange}
                      required
                      aria-required="true"
                      aria-invalid={!!validationErrors.model}
                    >
                      <option value="">Select Model</option>
                      {products.map((product) => (
                        <option
                          key={product.code || product._id || product.id || product.product_id}
                          value={product.code || product._id || product.id || product.product_id}
                        >
                          {product.name} — ₹{product.mrp}
                        </option>
                      ))}
                    </select>
                    {validationErrors.model && (
                      <span className="error-text" role="alert">{validationErrors.model}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantity">Quantity *</label>
                    <input
                      id="quantity"
                      type="number"
                      name="quantity"
                      value={newOrder.quantity}
                      onChange={handleInputChange}
                      min="1"
                      required
                      aria-required="true"
                      aria-invalid={!!validationErrors.quantity}
                    />
                    {validationErrors.quantity && (
                      <span className="error-text" role="alert">{validationErrors.quantity}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="order-total">
                  <h4>Order Total</h4>
                  <div className="total-amount">
                    ₹{calculateTotal().toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowCreateModal(false);
                    setValidationErrors({});
                  }}
                  disabled={actionLoading.createOrder}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={actionLoading.createOrder}
                >
                  {actionLoading.createOrder ? "Creating..." : "Save Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-details-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="order-details-title"
          >
            <div className="order-modal-header">
              <h3 id="order-details-title">Order Details</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={24} />
              </button>
            </div>

            <div className="order-modal-body">
              <div className="order-top-section">
                <div className="order-id-badge">
                  <span className="label">Order ID</span>
                  <span className="value">#{selectedOrder.id || selectedOrder._id}</span>
                </div>
                <div className={`status-badge-large status-${selectedOrder.status?.toLowerCase().replace('-', '_')}`}>
                  <span className="status-dot"></span>
                  {selectedOrder.status}
                </div>
              </div>

              <div className="info-cards-row">
                <div className="info-card customer-card">
                  <div className="icon-circle customer-icon">👤</div>
                  <div className="info-content">
                    <span className="info-label">Customer</span>
                    <span className="info-name">{getCustomerName(selectedOrder)}</span>
                    <span className="info-detail">{selectedOrder.client?.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="info-card plumber-card">
                  <div className="icon-circle plumber-icon">🔧</div>
                  <div className="info-content-01">
                    <span className="info-label">Plumber</span>
                    <span className="info-name">{getPlumberName(selectedOrder)}</span>
                    <span className="info-detail">{selectedOrder.plumber?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="addresses-row">
                <div className="address-card billing-card">
                  <div className="address-header">📍 Billing Address</div>
                  <div className="address-content">
                    {getBillingAddress(selectedOrder)}
                  </div>
                </div>
                <div className="address-card shipping-card">
                  <div className="address-header">🚚 Shipping Address</div>
                  <div className="address-content">
                    {getShippingAddress(selectedOrder)}
                  </div>
                </div>
              </div>

              <div className="items-section">
                <h4 className="section-title">Order Items</h4>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="order-item-card">
                    <div className="item-icon">📦</div>
                    <div className="item-details">
                      <span className="item-name">{getProductNameById(item.product)}</span>
                      <span className="item-quantity">Quantity: {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="item-price">₹{(item.quantity * item.price).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              {(selectedOrder.status === 'Dispatched' || selectedOrder.status === 'Fulfilled') && selectedOrder.awb_number && (
                <div className="tracking-card">
                  <div className="tracking-label">📍 Tracking Number</div>
                  <div className="tracking-number">{selectedOrder.awb_number}</div>
                </div>
              )}

              {selectedOrder.status === 'Dispatched' && (
                <div className="invoice-upload-section">
                  <h4 className="section-title">Invoice</h4>
                  {selectedOrder.invoiceKey ? (
                    <div className="invoice-card">
                      <div className="invoice-info">
                        <span className="invoice-icon">📄</span>
                        <span className="invoice-text">Invoice uploaded</span>
                      </div>
                      <button
                        className="btn-download-invoice"
                        onClick={() => handleInvoiceDownload(selectedOrder)}
                        disabled={actionLoading[`download-${selectedOrder._id}`]}
                        aria-label="Download invoice"
                      >
                        <Download size={16} />
                        {actionLoading[`download-${selectedOrder._id}`] ? "Downloading..." : "Download Invoice"}
                      </button>
                    </div>
                  ) : (
                    <div className="invoice-upload-card">
                      <input
                        type="file"
                        accept="application/pdf"
                        id={`modal-invoice-${selectedOrder._id}`}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleInvoiceUpload(selectedOrder, file);
                          e.target.value = '';
                        }}
                        aria-label="Upload invoice PDF"
                      />
                      <label
                        htmlFor={`modal-invoice-${selectedOrder._id}`}
                        className="btn-upload-invoice"
                      >
                        <span>📤</span> 
                        {actionLoading[`invoice-${selectedOrder._id}`] 
                          ? "Uploading..." 
                          : "Upload Invoice (PDF)"}
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="dates-row">
                <div className="date-card order-date-card">
                  <span className="date-label">Order Date</span>
                  <span className="date-value">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                {selectedOrder.fulfilled_at && (
                  <div className="date-card fulfilled-date-card">
                    <span className="date-label">Fulfilled On</span>
                    <span className="date-value">{formatDate(selectedOrder.fulfilled_at )}</span>
                  </div>
                )}
              </div>

              <div className="order-total-section">
                <span className="total-label">Total Amount</span>
                <span className="total-amount">₹{calculateOrderTotal(selectedOrder.items).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;