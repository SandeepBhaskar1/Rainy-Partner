import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ClipboardList,
  Loader,
  AlertCircle,
  PlusCircle,
  X,
  Package,
  Truck,
  CircleCheckBig,
} from "lucide-react";
import "./Orders.css";
import api from "../../api/axiosInstence";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [plumbers, setPlumbers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
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
    products: [{ model: "", quantity: 1 }],
  });

  const backendUrl = import.meta.env.VITE_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, [filter, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filter !== "all") {
        params.status = filter;
      }

      const [ordersResponse, plumbersResponse, productsResponse] =
        await Promise.allSettled([
          api.get(`/admin/orders`, {
            params,
          }),
          api.get(`/admin/plumbers`),
          api.get(`/products`),
        ]);

      let ordersData = [];
      if (ordersResponse.status === "fulfilled") {
        const response = ordersResponse.value.data;

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
        const plumbersData = plumbersResponse.value.data;
        const plumbersList = plumbersData.plumbers || plumbersData || [];
        setPlumbers(plumbersList);
        console.log(plumbersList);
        

        plumbersList.forEach((plumber) => {
          const plumberId = plumber._id || plumber.id;
          if (plumberId) {
            plumbersMap[plumberId] = plumber;
          }
        });
      }

      if (productsResponse.status === "fulfilled") {
        const productsData = productsResponse.value.data;
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

      setOrders(ordersWithPlumbers);
    } catch (error) {
      console.error("Error fetching orders:", error);

      if (error.response?.status === 401) {
        setError("Session expired. Please login again.");
        redirectToLogin();
      } else if (error.response?.status === 403) {
        setError("Access denied. Admin privileges required.");
      } else {
        setError(error.response?.data?.detail || "Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  };

  const getFilteredOrders = () => {
    if (!Array.isArray(orders)) return [];
    return orders;
  };

  const getProductNameById = (productId) => {
    const product = products.find(
      (p) => (p.code || p._id || p.id || p.product_id) === productId
    );
    return product ? product.name : productId;
  };

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
      if (
        b.district &&
        b.district.trim() &&
        !seen.has(b.district.toLowerCase().trim())
      ) {
        parts.push(b.district);
        seen.add(b.district.toLowerCase().trim());
      }
      if (
        b.state &&
        b.state.trim() &&
        !seen.has(b.state.toLowerCase().trim())
      ) {
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
      if (
        s.district &&
        s.district.trim() &&
        !seen.has(s.district.toLowerCase().trim())
      ) {
        parts.push(s.district);
        seen.add(s.district.toLowerCase().trim());
      }
      if (
        s.state &&
        s.state.trim() &&
        !seen.has(s.state.toLowerCase().trim())
      ) {
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewOrder((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

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

  const handleStatusChange = async (order, newStatus) => {
    if (newStatus === "Cancelled") {
      setOrderToCancel(order);
      setShowCancelModal(true);
      return;
    }

    try {
      const orderId = order._id || order.id;

      await api.put(
        `/admin/orders/${orderId}/status`,
        { status: newStatus }
      );

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === order._id || o.id === order.id
            ? { ...o, status: newStatus }
            : o
        )
      );

      alert("Status updated successfully!");
    } catch (err) {
      console.error("Failed to update status:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update status. Try again.";
      alert(errorMsg);
    }
  };

  const handleProductChange = (index, field, value) => {
    if (!Array.isArray(newOrder.products)) return;
    const updatedProducts = [...newOrder.products];
    updatedProducts[index][field] = value;
    setNewOrder((prev) => ({ ...prev, products: updatedProducts }));
  };

  const addProductRow = () => {
    setNewOrder((prev) => ({
      ...prev,
      products: Array.isArray(prev.products)
        ? [...prev.products, { model: "", quantity: 1 }]
        : [{ model: "", quantity: 1 }],
    }));
  };

  const removeProductRow = (index) => {
    setNewOrder((prev) => ({
      ...prev,
      products: Array.isArray(prev.products)
        ? prev.products.filter((_, i) => i !== index)
        : [],
    }));
  };

  const handleCancelReasonSubmit = () => {
    if (!cancelReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }
    setShowCancelModal(false);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async (confirmed) => {
    if (!confirmed) {
      setShowCancelConfirm(false);
      setCancelReason("");
      setOrderToCancel(null);
      return;
    }

    try {
      await api.put(
        `/admin/orders/${orderToCancel._id}/status`,
        {
          status: "Cancelled",
          cancelled_reason: cancelReason.trim(),
        },
      );

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === orderToCancel._id
            ? {
                ...o,
                status: "Cancelled",
                cancelled_reason: cancelReason.trim(),
              }
            : o
        )
      );

      alert("Order cancelled successfully");
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert(
        err.response?.data?.message || "Failed to cancel order. Try again."
      );
    } finally {
      setShowCancelConfirm(false);
      setCancelReason("");
      setOrderToCancel(null);
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
    if (!Array.isArray(newOrder.products) || newOrder.products.length === 0)
      return 0;

    return newOrder.products.reduce((total, item) => {
      const product = products.find(
        (p) => String(p.code) === String(item.model)
      );
      if (!product) return total;

      const qty = Number(item.quantity) || 1;
      const price = Number(product.mrp) || 0;
      return total + qty * price;
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    // Validate all required fields
    if (!newOrder.plumber_id) {
      alert("Please select a plumber");
      return;
    }

    if (!newOrder.client_name.trim()) {
      alert("Please enter client name");
      return;
    }

    if (!newOrder.client_phone.trim()) {
      alert("Please enter client phone number");
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(newOrder.client_phone.replace(/\s/g, ""))) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    if (!newOrder.billing_address.trim()) {
      alert("Please enter billing address");
      return;
    }
    if (!newOrder.billing_city.trim()) {
      alert("Please enter billing city");
      return;
    }
    if (!newOrder.billing_state.trim()) {
      alert("Please enter billing state");
      return;
    }
    if (!newOrder.billing_pin.trim()) {
      alert("Please enter billing PIN code");
      return;
    }

    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(newOrder.billing_pin)) {
      alert("Please enter a valid 6-digit PIN code for billing address");
      return;
    }

    if (!newOrder.shipping_address.trim()) {
      alert("Please enter shipping address");
      return;
    }
    if (!newOrder.shipping_city.trim()) {
      alert("Please enter shipping city");
      return;
    }
    if (!newOrder.shipping_state.trim()) {
      alert("Please enter shipping state");
      return;
    }
    if (!newOrder.shipping_pin.trim()) {
      alert("Please enter shipping PIN code");
      return;
    }

    if (!pinRegex.test(newOrder.shipping_pin)) {
      alert("Please enter a valid 6-digit PIN code for shipping address");
      return;
    }

    if (!Array.isArray(newOrder.products) || newOrder.products.length === 0) {
      alert("Please add at least one product");
      return;
    }

    for (const [i, item] of newOrder.products.entries()) {
      if (!item.model) {
        alert(`Please select a model for product #${i + 1}`);
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        alert(`Please enter a valid quantity (≥1) for product #${i + 1}`);
        return;
      }
    }

    try {
      const product = getSelectedProduct();

      const items = newOrder.products.map((item) => {
        const product = products.find(
          (p) => p.code?.toString() === item.model?.toString()
        );

        if (!product) throw new Error(`Product not found for ID ${item.model}`);

        return {
          product: product.code,
          price: product.mrp,
          quantity: Number(item.quantity),
        };
      });

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
        items,
      };

      const submitButton = e.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating Order...";
      }

      await api.post(`/admin/admin-place-order`, orderData);

      alert("Order created successfully!");
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
        products: [{ model: "", quantity: 1 }],
      });

      fetchData();
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create order. Please try again.";
      alert(errorMessage);

      const submitButton = e.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Order";
      }
    }
  };

  const filteredOrders = getFilteredOrders();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Order-Placed":
        return "Order-Placed";
      case "Payment-Completed":
        return "Payment-Completed";
      case "Dispatched":
        return "Dispatched";
      case "Fulfilled":
        return "Fulfilled";
      case "Cancelled":
        return "Cancelled";
      default:
        return "";
    }
  };

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
      <div className="orders-container">
        <div className="orders-header">
          <h2>Orders</h2>
          <button
            className="create-order-btn"
            onClick={() => setShowCreateModal(true)}
          >
            Create Order
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="orders-section">
          <div className="section-header">
            <Package size={20} />
            <h3>Order Placed</h3>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.filter(
                  (order) => order.status === "Order-Placed"
                ).length > 0 ? (
                  filteredOrders
                    .filter((order) => order.status === "Order-Placed")
                    .map((order) => (
                      <tr key={order._id || order.id}>
                        <td
                          className="order-id"
                          title={order._id || order.id}
                          onClick={() => setSelectedOrder(order)}
                        >
                          #{order.id || order._id || "N/A"}
                        </td>
                        <td className="order-date">
                          {formatDate(order.created_at || order.createdAt)}
                        </td>
                        <td className="plumber-name">
                          {getPlumberName(order)}
                        </td>
                        <td className="customer-name">
                          {getCustomerName(order)}
                        </td>
                        <td className="address">{getBillingAddress(order)}</td>
                        <td className="address">{getShippingAddress(order)}</td>
                        <td className="product-name">
                          {getProductNames(order.items)} x
                          {order.items?.length || 0}
                        </td>
                        <td className="amount">
                          ₹
                          {calculateOrderTotal(order.items).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td>
                          <select
                            value={order.status || "Order-Placed"}
                            className={`status-dropdown ${getStatusBadgeClass(
                              order.status
                            )}`}
                            onChange={(e) =>
                              handleStatusChange(order, e.target.value)
                            }
                          >
                            {[
                              "Order-Placed",
                              "Payment-Completed",
                              "Dispatched",
                              "Fulfilled",
                              "Cancelled",
                            ].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center" }}>
                      No Orders Found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="orders-section" style={{ marginTop: "20px" }}>
        <div className="section-header">
          <Package size={20} />
          <h3>Payment Done</h3>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.filter(
                (order) => order.status === "Payment-Completed"
              ).length > 0 ? (
                filteredOrders
                  .filter((order) => order.status === "Payment-Completed")
                  .map((order) => (
                    <tr key={order._id || order.id}>
                      <td
                        className="order-id"
                        title={order._id || order.id}
                        onClick={() => setSelectedOrder(order)}
                      >
                        #{order.id || order._id || "N/A"}
                      </td>
                      <td className="order-date">
                        {formatDate(order.created_at || order.createdAt)}
                      </td>
                      <td className="plumber-name">{getPlumberName(order)}</td>
                      <td className="customer-name">
                        {getCustomerName(order)}
                      </td>
                      <td className="address">{getBillingAddress(order)}</td>
                      <td className="address">{getShippingAddress(order)}</td>
                      <td className="product-name">
                        {getProductNames(order.items)} x
                        {order.items?.length || 0}
                      </td>
                      <td className="amount">
                        ₹
                        {calculateOrderTotal(order.items).toLocaleString(
                          "en-IN"
                        )}
                      </td>
                      <td>
                        <select
                          value={order.status || "Order-Placed"}
                          className={`status-dropdown ${getStatusBadgeClass(
                            order.status
                          )}`}
                          onChange={async (e) => {
                            const newStatus = e.target.value;

                            try {
                              await api.put(
                                `/admin/orders/${order._id}/status`,
                                { status: newStatus }
                              );

                              setOrders((prevOrders) =>
                                prevOrders.map((o) =>
                                  o._id === order._id
                                    ? { ...o, status: newStatus }
                                    : o
                                )
                              );
                            } catch (err) {
                              console.error("Failed to update status:", err);
                              alert("Failed to update status. Try again.");
                            }
                          }}
                        >
                          {[
                            "Order-Placed",
                            "Payment-Completed",
                            "Dispatched",
                            "Fulfilled",
                            "Cancelled",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No Orders Found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="orders-section" style={{ marginTop: "20px" }}>
        <div className="section-header">
          <Truck size={20} />
          <h3>Dispatched</h3>
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
                <th>AWB/Tracking ID</th>
                <th>Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.filter((order) => order.status === "Dispatched")
                .length > 0 ? (
                filteredOrders
                  .filter((order) => order.status === "Dispatched")
                  .map((order) => (
                    <tr key={order._id || order.id}>
                      <td
                        className="order-id"
                        title={order._id || order.id}
                        onClick={() => setSelectedOrder(order)}
                      >
                        #{order.id || order._id || "N/A"}
                      </td>
                      <td className="order-date">
                        {formatDate(order.created_at || order.createdAt)}
                      </td>
                      <td className="plumber-name">{getPlumberName(order)}</td>
                      <td className="customer-name">
                        {getCustomerName(order)}
                      </td>
                      <td className="address">{getBillingAddress(order)}</td>
                      <td className="address">{getShippingAddress(order)}</td>
                      <td className="product-name">
                        {getProductNames(order.items)} x
                        {order.items?.length || 0}
                      </td>
                      <td className="amount">
                        ₹
                        {calculateOrderTotal(order.items).toLocaleString(
                          "en-IN"
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <input
                            type="text"
                            value={order.awb_number || ""}
                            placeholder="Enter AWB Number"
                            className="awb-input"
                            onChange={(e) => {
                              const value = e.target.value;
                              setOrders((prevOrders) =>
                                prevOrders.map((o) =>
                                  o._id === order._id
                                    ? {
                                        ...o,
                                        awb_number: value,
                                        awb_changed: true,
                                      }
                                    : o
                                )
                              );
                            }}
                          />

                          {order.awb_changed && (
                            <button
                              className="save-awb-btn"
                              onClick={async () => {
                                const awbNumber = order.awb_number?.trim();
                                if (!awbNumber) {
                                  alert(
                                    "Please enter an AWB number before saving."
                                  );
                                  return;
                                }

                                try {
                                  await api.put(
                                    `/admin/orders/${order._id}/status`,
                                    {
                                      awb_number: awbNumber,
                                      status: order.status,
                                    },
                                  );

                                  alert("AWB number saved successfully ✅");

                                  setOrders((prevOrders) =>
                                    prevOrders.map((o) =>
                                      o._id === order._id
                                        ? { ...o, awb_changed: false }
                                        : o
                                    )
                                  );
                                } catch (err) {
                                  console.error(
                                    "Failed to update AWB number:",
                                    err
                                  );
                                  alert(
                                    "Failed to update AWB number. Try again."
                                  );
                                }
                              }}
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={async () => {
                            try {
                              const newStatus = "Fulfilled";

                              await api.put(
                                `/admin/orders/${order._id}/status`,
                                {
                                  status: newStatus,
                                  fulfilled_at: new Date().toISOString(),
                                },
                              );

                              setOrders((prevOrders) =>
                                prevOrders.map((o) =>
                                  o._id === order._id
                                    ? { ...o, status: newStatus }
                                    : o
                                )
                              );
                            } catch (err) {
                              console.error(
                                "Failed to mark order as fulfilled:",
                                err
                              );
                              alert(
                                "Failed to mark order as fulfilled. Try again."
                              );
                            }
                          }}
                          className="mark-fulfilled-btn"
                          disabled={order.status === "Fulfilled"}
                        >
                          {order.status === "Fulfilled"
                            ? "Fulfilled"
                            : "Mark Fulfilled"}
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No Orders Found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="orders-section" style={{ marginTop: "20px" }}>
        <div className="section-header">
          <CircleCheckBig size={20} />
          <h3>Order Fulfilled</h3>
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
                <th>Delivered On</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.filter((order) => order.status === "Fulfilled")
                .length > 0 ? (
                filteredOrders
                  .filter((order) => order.status === "Fulfilled")
                  .map((order) => (
                    <tr key={order._id || order.id}>
                      <td
                        className="order-id"
                        title={order._id || order.id}
                        onClick={() => setSelectedOrder(order)}
                      >
                        #{order.id || order._id || "N/A"}
                      </td>
                      <td className="order-date">
                        {formatDate(order.created_at || order.createdAt)}
                      </td>
                      <td className="plumber-name">{getPlumberName(order)}</td>
                      <td className="customer-name">
                        {getCustomerName(order)}
                      </td>
                      <td className="address">{getBillingAddress(order)}</td>
                      <td className="address">{getShippingAddress(order)}</td>
                      <td className="product-name">
                        {getProductNames(order.items)} x
                        {order.items?.length || 0}
                      </td>
                      <td className="amount">
                        ₹
                        {calculateOrderTotal(order.items).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        {formatDate(order.fulfilled_at || order.fulfilledAt)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No Orders Found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="orders-section" style={{ marginTop: "20px" }}>
        <div className="section-header">
          <CircleCheckBig size={20} />
          <h3>Cancelled Orders</h3>
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
                <th>Cancelled On</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.filter((order) => order.status === "Cancelled")
                .length > 0 ? (
                filteredOrders
                  .filter((order) => order.status === "Cancelled")
                  .map((order) => (
                    <tr key={order._id || order.id}>
                      <td
                        className="order-id"
                        title={order._id || order.id}
                        onClick={() => setSelectedOrder(order)}
                      >
                        #{order.id || order._id || "N/A"}
                      </td>
                      <td className="order-date">
                        {formatDate(order.created_at || order.createdAt)}
                      </td>
                      <td className="plumber-name">{getPlumberName(order)}</td>
                      <td className="customer-name">
                        {getCustomerName(order)}
                      </td>
                      <td className="address">{getBillingAddress(order)}</td>
                      <td className="address">{getShippingAddress(order)}</td>
                      <td className="product-name">
                        {getProductNames(order.items)} x
                        {order.items?.length || 0}
                      </td>
                      <td className="amount">
                        ₹
                        {calculateOrderTotal(order.items).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        {formatDate(order.fulfilled_at || order.fulfilledAt)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No Orders Found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Order</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="order-form">
              <div className="form-section">
                <h4>Plumber & Client Details</h4>

                <div className="form-row same-line">
                  <div className="form-group">
                    <label>Plumber *</label>
                    <select
                      name="plumber_id"
                      value={newOrder.plumber_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Plumber</option>
                      {plumbers
                        .filter((plumber) => plumber.kyc_status === "approved")
                        .map((plumber) => (
                          <option
                            key={plumber._id || plumber.id}
                            value={plumber._id || plumber.id}
                          >
                            {plumber.name} - {plumber.phone}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Client Name *</label>
                    <input
                      type="text"
                      name="client_name"
                      value={newOrder.client_name}
                      onChange={handleInputChange}
                      placeholder="Client Name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Client Phone *</label>
                    <input
                      type="tel"
                      name="client_phone"
                      value={newOrder.client_phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Address Details</h3>
                <div className="address-row">
                  <div className="address-half">
                    <div className="form-group">
                      <label>Billing Address:</label>
                      <input
                        type="text"
                        name="billing_address"
                        value={newOrder.billing_address}
                        onChange={handleInputChange}
                        placeholder="Street Address"
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="city-state-pin">
                        <label>City:</label>
                        <input
                          type="text"
                          name="billing_city"
                          value={newOrder.billing_city}
                          onChange={handleInputChange}
                          placeholder="City"
                          required
                        />
                      </div>
                      <div className="city-state-pin">
                        <label>State:</label>
                        <input
                          type="text"
                          name="billing_state"
                          value={newOrder.billing_state}
                          onChange={handleInputChange}
                          placeholder="State"
                          required
                        />
                      </div>
                      <div className="city-state-pin">
                        <label>PIN:</label>
                        <input
                          type="text"
                          name="billing_pin"
                          value={newOrder.billing_pin}
                          onChange={handleInputChange}
                          placeholder="PIN Code"
                          required
                        />
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
                      <label>Shipping Address:</label>
                      <input
                        type="text"
                        name="shipping_address"
                        value={newOrder.shipping_address}
                        onChange={handleInputChange}
                        placeholder="Street Address"
                        disabled={newOrder.sameAsBilling}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="city-state-pin">
                        <label>City:</label>
                        <input
                          type="text"
                          name="shipping_city"
                          value={newOrder.shipping_city}
                          onChange={handleInputChange}
                          placeholder="City"
                          disabled={newOrder.sameAsBilling}
                          required
                        />
                      </div>
                      <div className="city-state-pin">
                        <label>State:</label>
                        <input
                          type="text"
                          name="shipping_state"
                          value={newOrder.shipping_state}
                          onChange={handleInputChange}
                          placeholder="State"
                          disabled={newOrder.sameAsBilling}
                          required
                        />
                      </div>
                      <div className="city-state-pin">
                        <label>PIN:</label>
                        <input
                          type="text"
                          name="shipping_pin"
                          value={newOrder.shipping_pin}
                          onChange={handleInputChange}
                          placeholder="PIN Code"
                          disabled={newOrder.sameAsBilling}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Products</h4>
                {Array.isArray(newOrder.products) &&
                newOrder.products.length > 0 ? (
                  newOrder.products.map((item, index) => (
                    <div key={index} className="form-row same-line">
                      <div className="form-group">
                        <label>Model *</label>
                        <select
                          value={item.model}
                          onChange={(e) =>
                            handleProductChange(index, "model", e.target.value)
                          }
                          required
                        >
                          <option value="">Select Model</option>
                          {products.map((product, idx) => (
                            <option
                              key={product._id || product.code || idx}
                              value={product._id || product.code}
                            >
                              {product.name} — ₹{product.mrp}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          required
                        />
                      </div>

                      {newOrder.products.length > 1 && (
                        <button
                          type="button"
                          className="product-remove-btn"
                          onClick={() => removeProductRow(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    No product added yet. Click “+ Add Product” below to start.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="add-product-btn"
                onClick={addProductRow}
                style={{ marginTop: "10px" }}
              >
                + Add Product
              </button>

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
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="order-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-modal-header">
              <h3>Order Details</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="order-modal-body">
              <div className="order-top-section">
                <div className="order-id-badge">
                  <span className="label">Order ID</span>
                  <span className="value">
                    #{selectedOrder.id || selectedOrder._id}
                  </span>
                </div>
                <div
                  className={`status-badge-large status-${selectedOrder.status
                    ?.toLowerCase()
                    .replace("-", "_")}`}
                >
                  <span className="status-dot"></span>
                  {selectedOrder.status}
                </div>
              </div>

              {/* Customer and Plumber Info Cards */}
              <div className="info-cards-row">
                <div className="info-card customer-card">
                  <div className="icon-circle customer-icon">👤</div>
                  <div className="info-content">
                    <span className="info-label">Customer</span>
                    <span className="info-name">
                      {getCustomerName(selectedOrder)}
                    </span>
                    <span className="info-detail">
                      {selectedOrder.client?.phone || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="info-card plumber-card">
                  <div className="icon-circle plumber-icon">🔧</div>
                  <div className="info-content-01">
                    <span className="info-label">Plumber</span>
                    <span className="info-name">
                      {getPlumberName(selectedOrder)}
                    </span>
                    <span className="info-detail">
                      {selectedOrder.plumber?.phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Addresses Section */}
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

              {/* Order Items Section */}
              <div className="items-section">
                <h4 className="section-title">Order Items</h4>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="order-item-card">
                    <div className="item-icon">📦</div>
                    <div className="item-details">
                      <span className="item-name">
                        {getProductNameById(item.product)}
                      </span>
                      <span className="item-quantity">
                        Quantity: {item.quantity} × ₹
                        {item.price?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="item-price">
                      ₹{(item.quantity * item.price).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracking Info - Only show for Dispatched or Fulfilled status */}
              {(selectedOrder.status === "Dispatched" ||
                selectedOrder.status === "Fulfilled") &&
                selectedOrder.awb_number && (
                  <div className="tracking-card">
                    <div className="tracking-label">📍 Tracking Number</div>
                    <div className="tracking-number">
                      {selectedOrder.awb_number}
                    </div>
                  </div>
                )}

              {/* Invoice Upload Section - Only show for Dispatched status */}
              {selectedOrder.status === "Dispatched" && (
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
                        onClick={async () => {
                          try {
                            const response = await api.post(
                              `/admin/order/get-invoice/${selectedOrder._id}`,
                              { key: selectedOrder.invoiceKey }
                            );
                            window.open(response.data.url, "_blank");
                          } catch (err) {
                            console.error("Failed to download invoice:", err);
                            alert("Failed to download invoice. Try again.");
                          }
                        }}
                      >
                        Download Invoice
                      </button>
                    </div>
                  ) : (
                    <div className="invoice-upload-card">
                      <input
                        type="file"
                        accept="application/pdf"
                        id={`modal-invoice-${selectedOrder._id}`}
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          if (file.type !== "application/pdf") {
                            alert("Only PDF files are allowed");
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            alert("File size exceeds 5MB limit");
                            return;
                          }

                          try {
                            const formData = new FormData();
                            formData.append("invoice", file);
                            formData.append("docType", "invoice");
                            formData.append("fileType", "pdf");

                            const response = await api.post(
                              `/admin/order/upload-invoice/${selectedOrder._id}`,
                              formData,
                            );

                            alert("Invoice uploaded successfully ✅");

                            setSelectedOrder({
                              ...selectedOrder,
                              invoiceKey: response.data.data.invoiceKey,
                            });

                            setOrders((prevOrders) =>
                              prevOrders.map((o) =>
                                o._id === selectedOrder._id
                                  ? {
                                      ...o,
                                      invoiceKey: response.data.data.invoiceKey,
                                    }
                                  : o
                              )
                            );

                            e.target.value = "";
                          } catch (err) {
                            console.error("Failed to upload invoice:", err);
                            alert(
                              err.response?.data?.message ||
                                "Failed to upload invoice. Try again."
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`modal-invoice-${selectedOrder._id}`}
                        className="btn-upload-invoice"
                      >
                        <span>📤</span> Upload Invoice (PDF)
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Dates Section */}
              <div className="dates-row">
                <div className="date-card order-date-card">
                  <span className="date-label">Order Date</span>
                  <span className="date-value">
                    {formatDate(
                      selectedOrder.created_at || selectedOrder.createdAt
                    )}
                  </span>
                </div>
                {selectedOrder.fulfilled_at && (
                  <div className="date-card fulfilled-date-card">
                    <span className="date-label">Fulfilled On</span>
                    <span className="date-value">
                      {formatDate(
                        selectedOrder.fulfilled_at || selectedOrder.fulfilledAt
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Section */}
              <div className="order-total-section">
                <span className="total-label">Total Amount</span>
                <span className="total-amount">
                  ₹
                  {calculateOrderTotal(selectedOrder.items).toLocaleString(
                    "en-IN"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3>Cancel Order</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                  setOrderToCancel(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "15px", color: "#666" }}>
                Please provide a reason for cancelling this order:
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows="4"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>
            <div
              className="modal-footer"
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                  setOrderToCancel(null);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f0f0f0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleCancelReasonSubmit}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>Confirm Cancellation</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "10px" }}>
                Are you sure you want to cancel this order?
              </p>
              <p style={{ fontSize: "14px", color: "#666" }}>
                <strong>Reason:</strong> {cancelReason}
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => handleCancelConfirm(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f0f0f0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                No
              </button>
              <button
                onClick={() => handleCancelConfirm(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
