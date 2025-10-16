import React, { useEffect, useState } from "react";
import api from "../../api/client";
import KPICards from "./Analytics/KPICards";
import DailyOutputChart from "./Analytics/DailyOutputChart";
import TopProductsChart from "./Analytics/TopProductsChart";
import TopUsersChart from "./Analytics/TopUsersChart";
import TopStaffChart from "./Analytics/TopStaffChart";

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch order analytics
      let orderData = {
        pending_orders: 0,
        completed_orders: 0,
        total_sales_revenue: 0,
        completed_productions: 0,
        in_progress: 0
      };

      try {
        // Try to fetch order data from API
        const ordersResponse = await api.get('/orders');
        const orders = ordersResponse.data || [];
        
        // Calculate order metrics
        const pendingOrders = orders.filter(order => 
          order.status === 'pending' || order.status === 'processing'
        ).length;
        
        const completedOrders = orders.filter(order => 
          order.status === 'completed' || order.status === 'delivered'
        ).length;
        
        const totalRevenue = orders
          .filter(order => order.payment_status === 'paid')
          .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
        
        orderData = {
          pending_orders: pendingOrders,
          completed_orders: completedOrders,
          total_sales_revenue: totalRevenue,
          completed_productions: 0,
          in_progress: 0
        };
      } catch (orderError) {
        console.warn('Order API not available, using zero values');
        orderData = {
          pending_orders: 0,
          completed_orders: 0,
          total_sales_revenue: 0,
          completed_productions: 0,
          in_progress: 0
        };
      }

      // Fetch production analytics data
      let productionData = {
        daily_output: [],
        top_products: [],
        alkansya_stats: { total: 0, avg: 0 },
        furniture_stats: { total: 0, avg: 0 }
      };

      try {
        // Fetch production output analytics
        const productionResponse = await api.get('/analytics/production-output');
        const productionAnalytics = productionResponse.data || {};
        
        if (productionAnalytics.products) {
          // Transform Alkansya data
          const alkansyaData = productionAnalytics.products.alkansya;
          if (alkansyaData && alkansyaData.output_trend) {
            productionData.daily_output = alkansyaData.output_trend.map(item => ({
              date: item.period,
              alkansya: item.output,
              furniture: 0, // Will be updated with furniture data
              quantity: item.output
            }));
          }

          // Transform furniture data (tables and chairs)
          const tableData = productionAnalytics.products.table;
          const chairData = productionAnalytics.products.chair;
          
          if (tableData && tableData.output_trend) {
            tableData.output_trend.forEach(item => {
              const existingItem = productionData.daily_output.find(d => d.date === item.period);
              if (existingItem) {
                existingItem.furniture += item.output;
                existingItem.quantity += item.output;
              } else {
                productionData.daily_output.push({
                  date: item.period,
                  alkansya: 0,
                  furniture: item.output,
                  quantity: item.output
                });
              }
            });
          }

          if (chairData && chairData.output_trend) {
            chairData.output_trend.forEach(item => {
              const existingItem = productionData.daily_output.find(d => d.date === item.period);
              if (existingItem) {
                existingItem.furniture += item.output;
                existingItem.quantity += item.output;
              } else {
                productionData.daily_output.push({
                  date: item.period,
                  alkansya: 0,
                  furniture: item.output,
                  quantity: item.output
                });
              }
            });
          }

          // Calculate stats
          const totalAlkansya = alkansyaData?.totals?.total_output || 0;
          const totalFurniture = (tableData?.totals?.total_output || 0) + (chairData?.totals?.total_output || 0);
          
          productionData.alkansya_stats = {
            total: totalAlkansya,
            avg: alkansyaData?.totals?.avg_per_period || 0
          };
          
          productionData.furniture_stats = {
            total: totalFurniture,
            avg: Math.round(totalFurniture / Math.max(1, productionData.daily_output.length))
          };

          // Create top products data
          productionData.top_products = productionAnalytics.top_performing || [];
        }
      } catch (productionError) {
        console.warn('Production analytics API not available:', productionError);
        // Keep empty arrays for production data
      }
      
      // Transform the API response to match the expected dashboard structure
      const transformedData = {
        kpis: {
          total: productionData.alkansya_stats.total + productionData.furniture_stats.total,
          completed_productions: orderData.completed_productions,
          in_progress: orderData.in_progress,
          pending_orders: orderData.pending_orders,
          completed_orders: orderData.completed_orders,
          total_sales_revenue: orderData.total_sales_revenue
        },
        daily_output: productionData.daily_output,
        top_products: productionData.top_products,
        top_users: [],
        top_staff: []
      };
      
      setAnalytics(transformedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set fallback data if all APIs fail
      setAnalytics({
        kpis: {
          total: 0,
          completed_productions: 0,
          in_progress: 0,
          pending_orders: 0,
          completed_orders: 0,
          total_sales_revenue: 0
        },
        daily_output: [],
        top_products: [],
        top_users: [],
        top_staff: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    
    return () => clearInterval(interval);
  }, []); // fetch on mount

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'transparent' }}>
      {/* Simple Brown Header */}
      <div style={{ 
        backgroundColor: '#8b5e34',
        padding: '1.5rem 0',
        marginBottom: '2rem'
      }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-center flex-grow-1">
              <h1 className="fw-bold mb-0" style={{ 
                fontSize: '2rem',
                letterSpacing: '1px',
                color: '#ffffff'
              }}>
                UNICK FURNITURE DASHBOARD
              </h1>
            </div>
            <div>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={fetchAnalytics}
                disabled={loading}
                style={{ 
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#ffffff'
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics - No container background */}
      <div className="container-fluid" style={{ maxWidth: '100%', padding: '0 1rem' }}>
        {!analytics ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#8b5e34' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-3" style={{ fontSize: '0.9rem', color: '#6b4423' }}>Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <KPICards kpis={analytics?.kpis || {}} />

            {/* Main Charts Row */}
            <div className="row mt-4">
              {/* Daily Output - Full Width */}
              <div className="col-12 mb-4">
                <DailyOutputChart data={analytics?.daily_output || []} />
              </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="row mb-4">
              <div className="col-lg-4 mb-4">
                <TopStaffChart data={analytics?.top_staff || []} />
              </div>
              <div className="col-lg-4 mb-4">
                <TopProductsChart data={analytics?.top_products || []} />
              </div>
              <div className="col-lg-4 mb-4">
                <TopUsersChart data={analytics?.top_users || []} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
