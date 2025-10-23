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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [plumbers, setPlumbers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  useEffect(() => {
    fetchData();
  }, [filter, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication required. Please login.");
        redirectToLogin();
        return;
      }

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filter !== "all") {
        params.status = filter;
      }

      const [ordersResponse, plumbersResponse, productsResponse] =
        await Promise.allSettled([
          axios.get(`${backendUrl}/admin/orders`, {
            headers: { Authorization: `Bearer ${token}` },
            params,
          }),
          axios.get(`${backendUrl}/admin/plumbers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${backendUrl}/products`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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
    localStorage.removeItem("authToken");
    localStorage.removeItem("admin");
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  };

  const getFilteredOrders = () => {
    if (!Array.isArray(orders)) return [];
    return orders;
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "badge-pending",
      confirmed: "badge-confirmed",
      shipped: "badge-shipped",
      delivered: "badge-delivered",
      cancelled: "badge-cancelled",
    };
    return statusMap[status?.toLowerCase()] || "badge-pending";
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

    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(newOrder.client_phone.replace(/\s/g, ""))) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate billing address
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

    // Validate PIN code (6 digits)
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(newOrder.billing_pin)) {
      alert("Please enter a valid 6-digit PIN code for billing address");
      return;
    }

    // Validate shipping address
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

    // Validate product and quantity
    if (!newOrder.model) {
      alert("Please select a model");
      return;
    }

    if (!newOrder.quantity || newOrder.quantity < 1) {
      alert("Please enter a valid quantity (minimum 1)");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const product = getSelectedProduct();
      console.log(token);

      if (!product) {
        alert("Selected product not found. Please select again.");
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
            product:
              product.code || product._id || product.id || product.product_id,
            price: product.mrp,
            quantity: Number(newOrder.quantity),
          },
        ],
        total_amount: calculateTotal(),
      };

      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating Order...";
      }

      await axios.post(`${backendUrl}/admin/admin-place-order`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Success - close modal and reset form
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
        quantity: 1,
      });

      // Refresh orders list
      fetchData();
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create order. Please try again.";
      alert(errorMessage);

      // Re-enable button
      const submitButton = e.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Order";
      }
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
                        <td className="order-id" title={order._id || order.id}>
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
                            onChange={async (e) => {
                              const newStatus = e.target.value;

                              try {
                                const token = localStorage.getItem("authToken");
                                await axios.put(
                                  `${backendUrl}/admin/orders/${order._id}/status`,
                                  { status: newStatus },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
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
                      <td className="order-id" title={order._id || order.id}>
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
                              const token = localStorage.getItem("authToken");
                              await axios.put(
                                `${backendUrl}/admin/orders/${order._id}/status`,
                                { status: newStatus },
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                }
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
                      <td className="order-id" title={order._id || order.id}>
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
                              // update locally
                              setOrders((prevOrders) =>
                                prevOrders.map((o) =>
                                  o._id === order._id
                                    ? { ...o, awb_number: value }
                                    : o
                                )
                              );
                            }}
                          />

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
                                const token = localStorage.getItem("authToken");
                                await axios.put(
                                  `${backendUrl}/admin/orders/${order._id}/status`,
                                  {
                                    awb_number: awbNumber,
                                    status: order.status,
                                  },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );

                                alert("AWB number saved successfully ✅");
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
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("authToken");
                              const newStatus = "Fulfilled";

                              await axios.put(
                                `${backendUrl}/admin/orders/${order._id}/status`,
                                {
                                  status: newStatus,
                                  fulfilled_at: new Date().toISOString(),
                                },
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                }
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
                      <td className="order-id" title={order._id || order.id}>
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
                  {/* Plumber Dropdown */}
                  <div className="form-group">
                    <label>Plumber *</label>
                    <select
                      name="plumber_id"
                      value={newOrder.plumber_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Plumber</option>
                      {plumbers.map((plumber) => (
                        <option
                          key={plumber._id || plumber.id}
                          value={plumber._id || plumber.id}
                        >
                          {plumber.name} - {plumber.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client Name */}
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

                  {/* Client Phone */}
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
                  {/* Billing Address */}
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

                    {/* Checkbox for same as billing */}
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

                  {/* Shipping Address */}
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Model *</label>
                    <select
                      name="model"
                      value={newOrder.model}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Model</option>
                      {products.map((product) => (
                        <option
                          key={
                            product.code ||
                            product._id ||
                            product.id ||
                            product.product_id
                          }
                          value={
                            product.code ||
                            product._id ||
                            product.id ||
                            product.product_id
                          }
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
                      name="quantity"
                      value={newOrder.quantity}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
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
    </div>
  );
};

export default Orders;
