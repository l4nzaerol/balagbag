import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AppLayout from "../Header";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBox,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaSpinner,
  FaEdit,
  FaEye,
  FaFilter,
  FaSync
} from "react-icons/fa";

const UnifiedOrderManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State Management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('all'); // pending, all, accepted, rejected
  const [productTypeFilter, setProductTypeFilter] = useState('all'); // all, furniture, alkansya
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [productionStatus, setProductionStatus] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    acceptanceStatus: '',
    startDate: '',
    endDate: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    processing: 0,
    ready_for_delivery: 0,
    delivered: 0
  });

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Read URL parameters and set filters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    if (status) {
      setFilters(prev => ({ ...prev, status: status }));
    }
  }, [location.search]);

  useEffect(() => {
    applyFilters();
  }, [orders, activeView, productTypeFilter, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/orders");
      const ordersData = response.data || [];
      setOrders(ordersData);
      
      // Calculate statistics
      const statistics = {
        pending: ordersData.filter(o => o.acceptance_status === 'pending').length,
        accepted: ordersData.filter(o => o.acceptance_status === 'accepted').length,
        rejected: ordersData.filter(o => o.acceptance_status === 'rejected').length,
        processing: ordersData.filter(o => o.status === 'processing').length,
        ready_for_delivery: ordersData.filter(o => o.status === 'ready_for_delivery').length,
        delivered: ordersData.filter(o => o.status === 'delivered').length
      };
      setStats(statistics);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // View filter
    if (activeView === 'pending') {
      filtered = filtered.filter(o => o.acceptance_status === 'pending');
    } else if (activeView === 'accepted') {
      filtered = filtered.filter(o => o.acceptance_status === 'accepted');
    } else if (activeView === 'rejected') {
      filtered = filtered.filter(o => o.acceptance_status === 'rejected');
    }
    // If activeView is 'all', don't filter by acceptance status

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toString().includes(searchLower) ||
        o.user?.name?.toLowerCase().includes(searchLower) ||
        o.user?.email?.toLowerCase().includes(searchLower) ||
        o.contact_phone?.includes(filters.search)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(o => o.status === filters.status);
    }

    // Payment method filter
    if (filters.paymentMethod) {
      filtered = filtered.filter(o => o.payment_method === filters.paymentMethod);
    }

    // Acceptance status filter
    if (filters.acceptanceStatus) {
      filtered = filtered.filter(o => o.acceptance_status === filters.acceptanceStatus);
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.checkout_date).getTime();
        return orderDate >= start && orderDate <= end;
      });
    }

    // Product type filter
    if (productTypeFilter === 'furniture') {
      filtered = filtered.filter(o => {
        // Check if order has items with products that are NOT Alkansya
        return o.items?.some(item => 
          item.product?.name && !item.product.name.toLowerCase().includes('alkansya')
        );
      });
    } else if (productTypeFilter === 'alkansya') {
      filtered = filtered.filter(o => {
        // Check if order has items with Alkansya products
        return o.items?.some(item => 
          item.product?.name && item.product.name.toLowerCase().includes('alkansya')
        );
      });
    }

    setFilteredOrders(filtered);
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const response = await api.post(`/orders/${selectedOrder.id}/accept`, {
        admin_notes: adminNotes
      });

      const productionsCreated = response.data.productions_created || 0;
      toast.success(`Order #${selectedOrder.id} accepted! ${productionsCreated} production(s) created.`);
      
      setShowAcceptModal(false);
      setAdminNotes('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Failed to accept order: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectionReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/orders/${selectedOrder.id}/reject`, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes
      });

      toast.success(`Order #${selectedOrder.id} rejected`);
      
      setShowRejectModal(false);
      setRejectionReason('');
      setAdminNotes('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error("Failed to reject order: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  // Check if production is completed for table and chair orders
  const checkProductionCompletion = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/production-status`);
      return response.data;
    } catch (error) {
      console.error("Error checking production status:", error);
      return { isCompleted: false, message: "Unable to check production status" };
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      // Check if trying to update to statuses that require production completion
      if (['ready_for_delivery', 'delivered', 'completed'].includes(newStatus)) {
        const productionStatus = await checkProductionCompletion(selectedOrder.id);
        
        if (!productionStatus.isCompleted) {
          toast.error(`Cannot mark as ${newStatus.replace('_', ' ')}: ${productionStatus.message}`);
          setProcessing(false);
          return;
        }
      }

      await api.put(`/orders/${selectedOrder.id}/status`, { status: newStatus });
      toast.success(`Order #${selectedOrder.id} status updated to ${newStatus.replace('_', ' ')}`);
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: '⏳', label: 'Pending' },
      processing: { color: 'primary', icon: '⚙️', label: 'Processing' },
      ready_for_delivery: { color: 'info', icon: '📦', label: 'Ready for Delivery' },
      delivered: { color: 'success', icon: '✅', label: 'Delivered' },
      completed: { color: 'success', icon: '🎉', label: 'Completed' },
      cancelled: { color: 'danger', icon: '❌', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge bg-${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getAcceptanceBadge = (status) => {
    const config = {
      pending: { color: 'warning', icon: <FaClock />, label: 'Pending' },
      accepted: { color: 'success', icon: <FaCheckCircle />, label: 'Accepted' },
      rejected: { color: 'danger', icon: <FaTimesCircle />, label: 'Rejected' }
    };
    const badge = config[status] || config.pending;
    return (
      <span className={`badge bg-${badge.color} d-flex align-items-center gap-1`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          
          {/* Header */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <button className="btn btn-outline-secondary" onClick={() => navigate("/dashboard")}>
                    ← Back to Dashboard
                  </button>
                </div>
                <button className="btn btn-outline-primary" onClick={fetchOrders}>
                  <FaSync className="me-2" />
                  Refresh
                </button>
              </div>
              
              <div className="card border-0 shadow-sm">
                <div className=" bg-gradient" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>

                </div>
              </div>
            </div>
          </div>

          <h2 className="mb-0">Orders</h2>

          {/* Statistics Cards */}
          <div className="row mb-4">
            <div className="col-md-2">
              <div className={`card border-0 shadow-sm ${activeView === 'pending' ? 'border-warning border-3' : ''}`} 
                   style={{ cursor: 'pointer' }}
                   onClick={() => setActiveView('pending')}>
                <div className="card-body text-center">
                  <FaClock className="text-warning mb-2" size={24} />
                  <h3 className="mb-0">{stats.pending}</h3>
                  <small className="text-muted">Pending Acceptance</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className={`card border-0 shadow-sm ${activeView === 'accepted' ? 'border-success border-3' : ''}`}
                   style={{ cursor: 'pointer' }}
                   onClick={() => setActiveView('accepted')}>
                <div className="card-body text-center">
                  <FaCheckCircle className="text-success mb-2" size={24} />
                  <h3 className="mb-0">{stats.accepted}</h3>
                  <small className="text-muted">Accepted</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className={`card border-0 shadow-sm ${activeView === 'rejected' ? 'border-danger border-3' : ''}`}
                   style={{ cursor: 'pointer' }}
                   onClick={() => setActiveView('rejected')}>
                <div className="card-body text-center">
                  <FaTimesCircle className="text-danger mb-2" size={24} />
                  <h3 className="mb-0">{stats.rejected}</h3>
                  <small className="text-muted">Rejected</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="text-primary mb-2">⚙️</div>
                  <h3 className="mb-0">{stats.processing}</h3>
                  <small className="text-muted">Processing</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <FaBox className="text-info mb-2" size={24} />
                  <h3 className="mb-0">{stats.ready_for_delivery}</h3>
                  <small className="text-muted">Ready</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className={`card border-0 shadow-sm ${activeView === 'all' ? 'border-primary border-3' : ''}`}
                   style={{ cursor: 'pointer' }}
                   onClick={() => setActiveView('all')}>
                <div className="card-body text-center">
                  <FaBox className="text-secondary mb-2" size={24} />
                  <h3 className="mb-0">{orders.length}</h3>
                  <small className="text-muted">All Orders</small>
                </div>
              </div>
            </div>
          </div>

          {/* Product Type Filter */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setProductTypeFilter('all')}
                    >
                      <FaBox className="me-2" />
                      All Orders
                    </button>
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'furniture' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setProductTypeFilter('furniture')}
                    >
                      🪑 Table & Chair Orders
                    </button>
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'alkansya' ? 'btn-info' : 'btn-outline-info'}`}
                      onClick={() => setProductTypeFilter('alkansya')}
                    >
                      🐷 Alkansya Orders
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search orders..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="ready_for_delivery">Ready for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                      >
                        <option value="">All Payment</option>
                        <option value="cod">COD</option>
                        <option value="Maya">Maya</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <input
                        type="date"
                        className="form-control"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        type="date"
                        className="form-control"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-1">
                      <button
                        className="btn btn-outline-secondary w-100"
                        onClick={() => setFilters({
                          search: '',
                          status: '',
                          paymentMethod: '',
                          acceptanceStatus: '',
                          startDate: '',
                          endDate: ''
                        })}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light border-0">
                  <h5 className="mb-0">
                    {activeView === 'pending' && '⏳ Pending Orders - Awaiting Acceptance'}
                    {activeView === 'accepted' && '✅ Accepted Orders'}
                    {activeView === 'rejected' && '❌ Rejected Orders'}
                    {activeView === 'all' && '📋 All Orders'}
                    <span className="badge bg-primary ms-2">{filteredOrders.length}</span>
                  </h5>
                </div>
                <div className="card-body p-0">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="display-1 text-muted">📦</div>
                      <h4 className="text-muted mt-3">No orders found</h4>
                      <p className="text-muted">Try adjusting your filters or check back later.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Acceptance</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <div className="fw-bold text-primary">#{order.id}</div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-semibold">{order.user?.name || 'Unknown'}</div>
                                  <small className="text-muted">{order.user?.email}</small>
                                </div>
                              </td>
                              <td>
                                <small>{order.items?.length || 0} items</small>
                              </td>
                              <td>
                                <div className="fw-bold text-success">
                                  ₱{parseFloat(order.total_price).toFixed(2)}
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-secondary">
                                  {order.payment_method === 'cod' ? '💵 COD' : '💳 ' + order.payment_method}
                                </span>
                              </td>
                              <td>{getAcceptanceBadge(order.acceptance_status)}</td>
                              <td>{getStatusBadge(order.status)}</td>
                              <td>
                                <small>{new Date(order.checkout_date).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowDetailsModal(true);
                                    }}
                                    title="View Details"
                                  >
                                    <FaEye />
                                  </button>
                                  
                                  {order.acceptance_status === 'pending' && (
                                    <>
                                      <button
                                        className="btn btn-outline-success"
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowAcceptModal(true);
                                        }}
                                        title="Accept Order"
                                      >
                                        <FaCheckCircle />
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowRejectModal(true);
                                        }}
                                        title="Reject Order"
                                      >
                                        <FaTimesCircle />
                                      </button>
                                    </>
                                  )}
                                  
                                  {order.acceptance_status === 'accepted' && (
                                    <button
                                      className="btn btn-outline-info"
                                      onClick={async () => {
                                        setSelectedOrder(order);
                                        
                                        // Always check production status - let the backend determine if tracking is needed
                                        try {
                                          const status = await checkProductionCompletion(order.id);
                                          setProductionStatus(status);
                                        } catch (error) {
                                          console.error("Error checking production status:", error);
                                          setProductionStatus({ 
                                            isCompleted: false, 
                                            message: "Unable to check production status",
                                            details: "Error occurred while checking production status"
                                          });
                                        }
                                        
                                        setShowStatusModal(true);
                                      }}
                                      title="Update Status"
                                    >
                                      <FaEdit />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      </motion.div>

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Order #{selectedOrder.id} Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary">Customer Information</h6>
                    <div className="card bg-light border-0 mb-3">
                      <div className="card-body">
                        <p className="mb-1"><FaUser className="me-2" /><strong>Name:</strong> {selectedOrder.user?.name}</p>
                        <p className="mb-1"><strong>Email:</strong> {selectedOrder.user?.email}</p>
                        <p className="mb-1"><FaPhone className="me-2" /><strong>Phone:</strong> {selectedOrder.contact_phone}</p>
                        <p className="mb-0"><FaMapMarkerAlt className="me-2" /><strong>Address:</strong> {selectedOrder.shipping_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary">Order Information</h6>
                    <div className="card bg-light border-0 mb-3">
                      <div className="card-body">
                        <p className="mb-1"><strong>Date:</strong> {new Date(selectedOrder.checkout_date).toLocaleString()}</p>
                        <p className="mb-1"><FaMoneyBillWave className="me-2" /><strong>Total:</strong> <span className="text-success fw-bold">₱{parseFloat(selectedOrder.total_price).toFixed(2)}</span></p>
                        <p className="mb-1"><strong>Payment:</strong> {selectedOrder.payment_method}</p>
                        <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                        <p className="mb-0"><strong>Acceptance:</strong> {getAcceptanceBadge(selectedOrder.acceptance_status)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h6 className="fw-bold text-primary">Order Items</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product?.name}</td>
                          <td>{item.quantity}</td>
                          <td>₱{parseFloat(item.price).toFixed(2)}</td>
                          <td className="fw-bold">₱{(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Accept Order #{selectedOrder.id}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAcceptModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <FaCheckCircle className="me-2" />
                  Accepting this order will create production records and notify the customer.
                </div>
                <div className="mb-3">
                  <label className="form-label">Admin Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this order..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAcceptModal(false)} disabled={processing}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={handleAcceptOrder} disabled={processing}>
                  {processing ? <FaSpinner className="spinner-border spinner-border-sm me-2" /> : <FaCheckCircle className="me-2" />}
                  Accept Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Reject Order #{selectedOrder.id}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRejectModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <FaTimesCircle className="me-2" />
                  Please provide a reason for rejecting this order. The customer will be notified.
                </div>
                <div className="mb-3">
                  <label className="form-label">Rejection Reason *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this order is being rejected..."
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Admin Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)} disabled={processing}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleRejectOrder} disabled={processing || !rejectionReason}>
                  {processing ? <FaSpinner className="spinner-border spinner-border-sm me-2" /> : <FaTimesCircle className="me-2" />}
                  Reject Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
        {showStatusModal && selectedOrder && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Update Order Status</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowStatusModal(false)}></button>
              </div>
              <div className="modal-body p-3">
                {/* Order Info Header */}
                <div className="text-center mb-3">
                  <h6 className="text-muted mb-1">Order #{selectedOrder.id}</h6>
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <span className="text-muted">Current Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>

                {/* Production Status Section */}
                {productionStatus && (
                  <div className={`alert ${productionStatus.isCompleted ? 'alert-success' : 'alert-warning'} border-0 mb-3`}>
                    <div className="d-flex align-items-start">
                      <div className="me-2">
                        {productionStatus.isCompleted ? (
                          <i className="fas fa-check-circle text-success fs-6"></i>
                        ) : (
                          <i className="fas fa-clock text-warning fs-6"></i>
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-semibold small">
                          {productionStatus.isCompleted ? 'Production Complete' : 'Production In Progress'}
                        </h6>
                        <p className="mb-0 text-muted small">{productionStatus.message}</p>
                        {productionStatus.stage && (
                          <small className="text-primary d-block mt-1">
                            <i className="fas fa-cog me-1"></i>
                            Current Stage: {productionStatus.stage}
                          </small>
                        )}
                        {productionStatus.progress !== undefined && productionStatus.progress > 0 && (
                          <small className="text-info d-block mt-1">
                            <i className="fas fa-chart-line me-1"></i>
                            Progress: {productionStatus.progress}%
                          </small>
                        )}
                        {productionStatus.details && (
                          <small className="text-info d-block mt-1">
                            <i className="fas fa-info-circle me-1"></i>
                            {productionStatus.details}
                          </small>
                        )}
                        {!productionStatus.isCompleted && (
                          <small className="text-warning d-block mt-1">
                            <i className="fas fa-clock me-1"></i>
                            Complete production before marking as ready for delivery
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status Selection */}
                <div className="mb-2">
                  <h6 className="fw-semibold text-dark mb-2 small">Update Status</h6>
                  <div className="row g-1">
                    {['processing', 'ready_for_delivery', 'delivered', 'completed', 'cancelled'].map((status) => {
                      const requiresProductionCompletion = ['ready_for_delivery', 'delivered', 'completed'].includes(status);
                      const isDisabled = selectedOrder.status === status || processing ||
                        (requiresProductionCompletion && productionStatus && !productionStatus.isCompleted);
                      const isCurrentStatus = selectedOrder.status === status;
                      
                      const statusConfig = {
                        processing: { icon: '⚙️', label: 'Processing', color: 'primary' },
                        ready_for_delivery: { icon: '📦', label: 'Ready for Delivery', color: 'info' },
                        delivered: { icon: '✅', label: 'Delivered', color: 'success' },
                        completed: { icon: '🎉', label: 'Completed', color: 'success' },
                        cancelled: { icon: '❌', label: 'Cancelled', color: 'danger' }
                      };
                      
                      const config = statusConfig[status];
                      
                      return (
                        <div key={status} className="col-12">
                          <button
                            className={`btn w-100 text-start p-2 border-0 rounded-2 ${
                              isCurrentStatus 
                                ? 'bg-primary text-white' 
                                : isDisabled 
                                  ? 'bg-light text-muted' 
                                  : 'bg-white border hover-shadow'
                            }`}
                            onClick={() => !isDisabled && handleUpdateStatus(status)}
                            disabled={isDisabled}
                            style={{
                              transition: 'all 0.2s ease',
                              boxShadow: isCurrentStatus ? '0 2px 8px rgba(13, 110, 253, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div className="d-flex align-items-center">
                              <span className="me-2 fs-6">{config.icon}</span>
                              <div className="flex-grow-1">
                                <div className="fw-semibold small">{config.label}</div>
                                <small className={`${isCurrentStatus ? 'text-white-50' : 'text-muted'} small`}>
                                  {status === 'processing' && 'Order is accepted and in production'}
                                  {status === 'ready_for_delivery' && (
                                    isDisabled && productionStatus && !productionStatus.isCompleted
                                      ? 'Production must be completed first'
                                      : 'Order is ready to be delivered'
                                  )}
                                  {status === 'delivered' && (
                                    isDisabled && productionStatus && !productionStatus.isCompleted
                                      ? 'Production must be completed first'
                                      : 'Order has been delivered to customer'
                                  )}
                                  {status === 'completed' && (
                                    isDisabled && productionStatus && !productionStatus.isCompleted
                                      ? 'Production must be completed first'
                                      : 'Order is fully completed'
                                  )}
                                  {status === 'cancelled' && 'Order has been cancelled'}
                                </small>
                              </div>
                              {isCurrentStatus && (
                                <i className="fas fa-check-circle text-white small"></i>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-light p-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowStatusModal(false)}>
                  <i className="fas fa-times me-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default UnifiedOrderManagement;
