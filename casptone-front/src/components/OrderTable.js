// src/components/OrderTable.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Spinner, Badge, Collapse, Card, ProgressBar } from "react-bootstrap";
import { FaBox, FaClock, FaTruck, FaCheckCircle, FaHammer, FaTools, FaPaintBrush, FaCut } from "react-icons/fa";

const API = "http://localhost:8000/api";

// Stage descriptions and estimated days
const stageDetails = {
  "Material Preparation": {
    description: "Selecting and preparing high-quality wood materials, checking inventory, and organizing materials for production.",
    estimatedDays: 1,
    icon: "📦"
  },
  "Cutting & Shaping": {
    description: "Cutting wood pieces to precise measurements and shaping components according to design specifications.",
    estimatedDays: 2,
    icon: "✂️"
  },
  "Assembly": {
    description: "Joining and assembling all components together, ensuring structural integrity and proper alignment.",
    estimatedDays: 3,
    icon: "🔨"
  },
  "Sanding & Surface Preparation": {
    description: "Smoothing all surfaces, removing imperfections, and preparing the furniture for finishing treatments.",
    estimatedDays: 2,
    icon: "⚙️"
  },
  "Finishing": {
    description: "Applying stains, varnish, or paint to protect and enhance the wood's natural beauty.",
    estimatedDays: 3,
    icon: "🎨"
  },
  "Quality Check & Packaging": {
    description: "Thorough inspection for quality assurance, final touch-ups, and careful packaging for delivery.",
    estimatedDays: 1,
    icon: "✅"
  }
};

const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [tracking, setTracking] = useState({}); // store tracking data per order

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated.");

      const response = await axios.get(`${API}/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(response.data || []);
    } catch (err) {
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      console.log(`🔍 [OrderTable] Fetching tracking for order #${orderId}...`);
      const res = await axios.get(`${API}/orders/${orderId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`✅ [OrderTable] Tracking data received for order #${orderId}:`, res.data);
      
      // Log process details
      if (res.data.trackings) {
        res.data.trackings.forEach(tracking => {
          console.log(`📦 Product: ${tracking.product_name}`, {
            is_tracked: tracking.is_tracked_product,
            has_processes: !!tracking.processes,
            process_count: tracking.processes?.length || 0
          });
          
          if (tracking.processes) {
            const delayed = tracking.processes.filter(p => p.delay_reason);
            if (delayed.length > 0) {
              console.log(`⚠️ DELAYED PROCESSES FOUND:`, delayed.map(p => ({
                name: p.process_name,
                reason: p.delay_reason,
                completed_by: p.completed_by_name
              })));
            }
          }
        });
      }
      
      setTracking((prev) => ({ ...prev, [orderId]: res.data }));
    } catch (e) {
      console.error(`❌ [OrderTable] Failed to fetch tracking for order #${orderId}:`, e);
      setTracking((prev) => ({ ...prev, [orderId]: { error: "Failed to fetch tracking" } }));
    }
  };

  const toggleExpand = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      fetchTracking(orderId);
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center mt-4">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading your orders...</span>
      </div>
    );

  if (error) return <p className="text-danger text-center fw-bold">{error}</p>;

  return (
    <div className="order-container">
      {orders.length > 0 ? (
        orders.map((order) => {
          const track = tracking[order.id] || {};
          return (
            <Card key={order.id} className="mb-4 shadow-sm order-card">
              <Card.Header
                className="d-flex justify-content-between align-items-center order-header"
                onClick={() => toggleExpand(order.id)}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <FaBox className="me-2 text-primary" />
                  <span className="fw-bold">Order #{order.id}</span>
                </div>
                <div>
                  <Badge bg={getStatusVariant(order.status)} className="me-2">{order.status}</Badge>
                  {order.payment_status && (
                    <Badge bg={order.payment_status==='paid' ? 'success' : (order.payment_status==='cod_pending' ? 'warning' : 'secondary')}>
                      {order.payment_status}
                    </Badge>
                  )}
                </div>
              </Card.Header>

              <Collapse in={expandedOrder === order.id}>
                <div>
                  <Card.Body>
                    {/* === STATUS TRACKER === */}
                    <div className="mb-3">
                      <strong>Status Tracker:</strong>
                      <div className="d-flex align-items-center mt-2 status-tracker">
                        {renderStatusSteps(order.status)}
                      </div>
                    </div>

                    {/* === ORDER ITEMS === */}
                    <h6 className="fw-bold">Order Items</h6>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="d-flex justify-content-between border-bottom py-2"
                      >
                        <span>
                          {item.product?.name || "Unknown Product"} ×{" "}
                          {item.quantity}
                        </span>
                        <span className="fw-bold text-success">
                          ₱
                          {(item.product?.price * item.quantity).toLocaleString(
                            "en-PH",
                            { minimumFractionDigits: 2 }
                          )}
                        </span>
                      </div>
                    ))}

                    {/* === BASIC INFO === */}
                    <div className="mt-3 text-muted small">
                      <p>
                        <FaClock className="me-2" />
                        Placed on: {new Date(order.created_at).toLocaleString()}
                      </p>
                      <p>
                        Payment: <strong>{(order.payment_method || 'cod').toUpperCase()}</strong> · Status: <strong>{order.payment_status || 'unpaid'}</strong>
                        {order.transaction_ref && (<span className="ms-2">Ref: {order.transaction_ref}</span>)}
                      </p>
                      <p>
                        <FaTruck className="me-2" />
                        Estimated Delivery:{" "}
                        {order.delivery_date ||
                          new Date(
                            new Date(order.created_at).getTime() +
                              14 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()}
                      </p>
                    </div>

                    {/* === ACCEPTANCE STATUS === */}
                    {order.acceptance_status && (
                      <div className="mt-3">
                        <h6 className="fw-bold">Order Acceptance Status</h6>
                        <div className={`alert ${order.acceptance_status === 'accepted' ? 'alert-success' : order.acceptance_status === 'rejected' ? 'alert-danger' : 'alert-info'}`}>
                          {order.acceptance_status === 'pending' && (
                            <>
                              <FaClock className="me-2" />
                              Your order is <strong>pending acceptance</strong> by our team. Production will start once accepted.
                            </>
                          )}
                          {order.acceptance_status === 'accepted' && (
                            <>
                              <FaCheckCircle className="me-2" />
                              Your order has been <strong>accepted</strong> and is now in production!
                            </>
                          )}
                          {order.acceptance_status === 'rejected' && (
                            <>
                              ❌ Your order has been <strong>rejected</strong>.
                              {order.rejection_reason && <div className="mt-2">Reason: {order.rejection_reason}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* === PRODUCTION TRACKING === */}
                    {/* Show current production stage for Table and Chair orders */}
                    {track && !track.error && order.acceptance_status === 'accepted' && track.trackings && (
                      <div className="mt-4">
                        <h6 className="fw-bold">Production Tracking</h6>

                        {/* Current Production Stage for each item */}
                        {track.trackings.filter(t => t.is_tracked_product).length > 0 && (
                          <div className="mt-3">
                            {track.trackings
                              .filter(t => t.is_tracked_product)
                              .map((item, idx) => {
                                const currentStage = item.current_stage || 'Pending';
                                const stageInfo = stageDetails[currentStage] || {
                                  description: 'Production in progress',
                                  estimatedDays: 1,
                                  icon: '🔧'
                                };

                                return (
                                  <div key={idx} className="card border-primary mb-3">
                                    <div className="card-header bg-primary text-white">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                          <strong>{item.product_name}</strong>
                                        </div>
                                        <Badge bg={item.status === 'completed' ? 'success' : item.status === 'in_production' ? 'light' : 'secondary'}>
                                          {item.status === 'in_production' ? 'In Progress' : item.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="card-body">
                                      <div className="mb-3">
                                        <h5 className="text-primary mb-2">
                                          <span className="me-2" style={{ fontSize: '1.5rem' }}>{stageInfo.icon}</span>
                                          Current Stage: {currentStage}
                                        </h5>
                                        <p className="text-muted mb-2">
                                          {stageInfo.description}
                                        </p>
                                        <div className="d-flex align-items-center">
                                          <FaClock className="me-2 text-info" />
                                          <span className="fw-bold">
                                            Estimated Duration: {stageInfo.estimatedDays} {stageInfo.estimatedDays === 1 ? 'day' : 'days'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {item.estimated_completion_date && (
                                        <div className="alert alert-info mb-0">
                                          <FaTruck className="me-2" />
                                          <strong>Estimated Completion:</strong> {new Date(item.estimated_completion_date).toLocaleDateString()}
                                        </div>
                                      )}

                                      {/* === PREVIOUS COMPLETED STAGES WITH DELAYS === */}
                                      {item.processes && item.processes.length > 0 && (
                                        <div className="mt-3">
                                          <h6 className="text-muted mb-2">
                                            <FaHammer className="me-2" />
                                            Previous Stages
                                          </h6>
                                          {item.processes
                                            .filter(p => p.status === 'completed')
                                            .map((process, pidx) => {
                                              const isDelayed = process.delay_reason && process.delay_reason.trim();
                                              return (
                                                <div key={pidx} className={`card mb-2 ${isDelayed ? 'border-warning' : 'border-success'}`}>
                                                  <div className="card-body p-2">
                                                    <div className="d-flex align-items-start">
                                                      <div className="me-2">
                                                        {isDelayed ? (
                                                          <span className="text-warning">⚠️</span>
                                                        ) : (
                                                          <FaCheckCircle className="text-success" />
                                                        )}
                                                      </div>
                                                      <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                          <strong className="small">{process.process_name}</strong>
                                                          {isDelayed && (
                                                            <Badge bg="danger">DELAYED</Badge>
                                                          )}
                                                        </div>
                                                        {process.completed_at && (
                                                          <div className="small text-muted">
                                                            Completed: {new Date(process.completed_at).toLocaleDateString()}
                                                          </div>
                                                        )}
                                                        {isDelayed && (
                                                          <div className="alert alert-warning p-2 mt-2 mb-0">
                                                            <div className="small">
                                                              <strong>Delay Reason:</strong> {process.delay_reason}
                                                            </div>
                                                            {process.completed_by_name && (
                                                              <div className="small text-muted">
                                                                Completed by: {process.completed_by_name}
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Show message if no tracked products */}
                        {track.trackings.filter(t => t.is_tracked_product).length === 0 && (
                          <div className="alert alert-info">
                            <FaClock className="me-2" />
                            This order contains items that don't require detailed production tracking.
                          </div>
                        )}
                      </div>
                    )}

                    {track && track.error && (
                      <p className="text-danger small mt-2">{track.error}</p>
                    )}
                  </Card.Body>
                </div>
              </Collapse>
            </Card>
          );
        })
      ) : (
        <p className="text-center text-muted fw-bold">No orders found.</p>
      )}
    </div>
  );
};

const getStatusVariant = (status) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "warning";
    case "processing":
      return "info";
    case "completed":
      return "success";
    case "canceled":
      return "danger";
    default:
      return "secondary";
  }
};

const renderStatusSteps = (status) => {
  const steps = ["Pending", "Processing", "Ready for Delivery", "Delivered"];
  const statusIndex = steps.findIndex(
    (s) => s.toLowerCase() === status.toLowerCase().replace('_', ' ')
  );

  return steps.map((step, idx) => (
    <div key={step} className="me-3 d-flex align-items-center">
      {idx < statusIndex ? (
        <FaCheckCircle className="text-success me-1" />
      ) : idx === statusIndex ? (
        <FaClock className="text-warning me-1" />
      ) : (
        <FaBox className="text-muted me-1" />
      )}
      <small
        className={idx <= statusIndex ? "fw-bold text-dark" : "text-muted"}
      >
        {step}
      </small>
    </div>
  ));
};

export default OrderTable;

