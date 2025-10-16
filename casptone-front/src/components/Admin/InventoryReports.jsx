import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/client";
import { 
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { downloadStockCsv, downloadUsageCsv, downloadReplenishmentCsv } from "../../api/inventoryApi";
import { clearRequestCache } from "../../utils/apiRetry";

const InventoryReports = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [windowDays, setWindowDays] = useState(30);
    const [materialFilter, setMaterialFilter] = useState('all');
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Inventory report data states
    const [dashboardData, setDashboardData] = useState(null);
    const [inventoryReport, setInventoryReport] = useState(null);
    const [consumptionTrends, setConsumptionTrends] = useState(null);
    const [replenishmentSchedule, setReplenishmentSchedule] = useState(null);
    const [forecastReport, setForecastReport] = useState(null);
    const [turnoverReport, setTurnoverReport] = useState(null);
    const [alkansyaStats, setAlkansyaStats] = useState(null);
    const [materialUsageAnalysis, setMaterialUsageAnalysis] = useState(null);

    // Filter materials based on product type
    const filterMaterials = (items) => {
        if (!items) return [];
        
        let filteredItems;
        switch (materialFilter) {
            case 'alkansya':
                filteredItems = items.filter(item => 
                    item.name.toLowerCase().includes('alkansya') ||
                    item.sku.toLowerCase().includes('alkansya') ||
                    item.sku.includes('PW-') || item.sku.includes('PLY-') || 
                    item.sku.includes('ACR-') || item.sku.includes('PN-') ||
                    item.sku.includes('BS-') || item.sku.includes('STKW-')
                );
                break;
            case 'dining-table':
                filteredItems = items.filter(item => 
                    item.name.toLowerCase().includes('table') ||
                    item.sku.toLowerCase().includes('table') ||
                    item.sku.includes('HW-MAHOG-') || item.sku.includes('PLY-18-') ||
                    item.sku.includes('WS-3') || item.sku.includes('WG-500')
                );
                break;
            case 'wooden-chair':
                filteredItems = items.filter(item => 
                    item.name.toLowerCase().includes('chair') ||
                    item.sku.toLowerCase().includes('chair') ||
                    item.sku.includes('HW-MAHOG-2x2') || item.sku.includes('HW-MAHOG-1x4') ||
                    item.sku.includes('WS-2.5') || item.sku.includes('WD-8MM')
                );
                break;
            default:
                filteredItems = items;
        }
        
        return filteredItems;
    };

    // Fetch all inventory reports with better error handling
    const fetchAllReports = useCallback(async () => {
        setLoading(true);
        setError("");
        
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - windowDays);
            const endDate = new Date();
            
            const dateRange = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            };

            console.log('📊 Fetching inventory reports with date range:', dateRange);

            // Fetch data with individual error handling for each endpoint
            console.log('🔍 Starting API calls...');
            
            // Helper function to safely fetch data
            const safeFetch = async (endpoint, params = {}) => {
                try {
                    const response = await api.get(endpoint, { params });
                    return response.data;
                } catch (error) {
                    console.warn(`⚠️ Failed to fetch ${endpoint}:`, error.message);
                    return null;
                }
            };

            // Fetch all data with individual error handling
            const [
                dashboardData,
                inventoryData,
                consumptionData,
                replenishmentData,
                forecastData,
                turnoverData,
                alkansyaStatsData,
                materialUsageData
            ] = await Promise.allSettled([
                safeFetch('/inventory/dashboard'),
                safeFetch('/inventory/report', dateRange),
                safeFetch('/inventory/consumption-trends', { days: windowDays }),
                safeFetch('/inventory/replenishment-schedule'),
                safeFetch('/inventory/forecast', { forecast_days: 30, historical_days: windowDays }),
                safeFetch('/inventory/turnover-report', { days: windowDays }),
                safeFetch('/inventory/alkansya-daily-output/statistics'),
                safeFetch('/inventory/alkansya-daily-output/materials-analysis')
            ]);

            // Set data with fallbacks
            setDashboardData(dashboardData.value || {
                summary: {
                    total_items: 0,
                    low_stock_items: 0,
                    out_of_stock_items: 0,
                    recent_usage: 0
                },
                critical_items: []
            });
            
            setInventoryReport(inventoryData.value || {
                summary: {
                    total_items: 0,
                    items_needing_reorder: 0,
                    critical_items: 0,
                    total_usage: 0
                },
                items: []
            });
            
            setConsumptionTrends(consumptionData.value || { trends: {}, period_days: windowDays });
            setReplenishmentSchedule(replenishmentData.value || { schedule: [], summary: {} });
            setForecastReport(forecastData.value || { forecasts: [], summary: {} });
            setTurnoverReport(turnoverData.value || { items: [], summary: {} });
            setAlkansyaStats(alkansyaStatsData.value || {
                total_output: 0,
                average_daily: 0,
                last_7_days: 0,
                total_days: 0,
                monthly_output: [],
                production_efficiency: 0,
                period: {
                    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    days: 90
                }
            });
            setMaterialUsageAnalysis(materialUsageData.value || []);

            console.log('📊 Inventory reports fetched successfully');
        } catch (err) {
            console.error('❌ Error fetching inventory reports:', err);
            setError('Failed to fetch inventory reports. Some data may be unavailable.');
            
            // Set comprehensive fallback data
            setDashboardData({
                summary: {
                    total_items: 0,
                    low_stock_items: 0,
                    out_of_stock_items: 0,
                    recent_usage: 0
                },
                critical_items: []
            });
            setInventoryReport({
                summary: {
                    total_items: 0,
                    items_needing_reorder: 0,
                    critical_items: 0,
                    total_usage: 0
                },
                items: []
            });
            setConsumptionTrends({ trends: {}, period_days: windowDays });
            setReplenishmentSchedule({ schedule: [], summary: {} });
            setForecastReport({ forecasts: [], summary: {} });
            setTurnoverReport({ items: [], summary: {} });
            setAlkansyaStats({
                total_output: 0,
                average_daily: 0,
                last_7_days: 0,
                total_days: 0,
                monthly_output: []
            });
            setMaterialUsageAnalysis([]);
        } finally {
            setLoading(false);
        }
    }, [windowDays]);

    useEffect(() => {
        fetchAllReports();
    }, [fetchAllReports, refreshKey]);

    const handleGlobalRefresh = () => {
        clearRequestCache();
        setRefreshKey(prev => prev + 1);
    };

    // Test API connectivity
    const testApiConnectivity = async () => {
        try {
            const response = await api.get('/test-inventory-reports');
            console.log('✅ API connectivity test successful:', response.data);
            return true;
        } catch (error) {
            console.error('❌ API connectivity test failed:', error);
            return false;
        }
    };

    // Generate mock data for testing when API is not available
    const generateMockData = () => {
        console.log('🔄 Generating mock data for testing...');
        
        setDashboardData({
            summary: {
                total_items: 25,
                low_stock_items: 3,
                out_of_stock_items: 1,
                recent_usage: 150
            },
            critical_items: [
                { name: 'Plywood 18mm', sku: 'PLY-18-001', current_stock: 5, reorder_point: 10 }
            ]
        });
        
        setInventoryReport({
            summary: {
                total_items: 25,
                items_needing_reorder: 4,
                critical_items: 1,
                total_usage: 150
            },
            items: [
                { name: 'Plywood 18mm', sku: 'PLY-18-001', current_stock: 5, reorder_point: 10, stock_status: 'critical' },
                { name: 'Hardwood 2x4', sku: 'HW-2X4-001', current_stock: 15, reorder_point: 20, stock_status: 'low' },
                { name: 'Acrylic Sheet', sku: 'ACR-001', current_stock: 8, reorder_point: 5, stock_status: 'in_stock' }
            ]
        });
        
        setAlkansyaStats({
            total_output: 8500,
            average_daily: 31.5,
            last_7_days: 220,
            total_days: 90,
            monthly_output: [
                { month: 'Nov 2024', total: 2850 },
                { month: 'Dec 2024', total: 2950 },
                { month: 'Jan 2025', total: 2700 }
            ],
            production_efficiency: 95.5,
            period: {
                start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                days: 90
            }
        });
        
        setMaterialUsageAnalysis([
            {
                material_name: 'Plywood 18mm',
                sku: 'PLY-18-001',
                qty_per_unit: 2,
                current_stock: 5,
                total_used_3months: 180,
                unit_cost: 2500,
                status: 'reorder'
            },
            {
                material_name: 'Hardwood 2x4',
                sku: 'HW-2X4-001',
                qty_per_unit: 4,
                current_stock: 15,
                total_used_3months: 120,
                unit_cost: 1500,
                status: 'ok'
            }
        ]);
        
        setError(null);
        setLoading(false);
    };


    const handleInventoryExport = async (exportType, format) => {
        try {
            setLoading(true);
            if (format === 'csv') {
                switch (exportType) {
                    case 'stock':
                        await downloadStockCsv();
                        break;
                    case 'usage':
                        await downloadUsageCsv();
                        break;
                    case 'replenishment':
                        await downloadReplenishmentCsv();
                        break;
                    default:
                        console.log('Unknown export type');
                }
            } else if (format === 'pdf') {
                await exportInventoryDataToPDF(exportType);
            }
        } catch (error) {
            console.error('Export error:', error);
            setError('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    const exportInventoryDataToPDF = async (exportType) => {
        // PDF export implementation would go here
        console.log(`Exporting ${exportType} to PDF`);
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center p-5">
                                <div className="mb-4">
                                    <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
                                </div>
                                <h4 className="text-danger mb-3">Unable to Load Inventory Reports</h4>
                                <p className="text-muted mb-4">
                                    {error}
                                </p>
                                <div className="d-flex gap-2 justify-content-center">
                                    <button 
                                        onClick={handleGlobalRefresh}
                                        className="btn btn-primary"
                                    >
                                        <i className="fas fa-sync me-2"></i>
                                        Retry
                                    </button>
                                    <button 
                                        onClick={testApiConnectivity}
                                        className="btn btn-outline-secondary"
                                    >
                                        <i className="fas fa-wifi me-2"></i>
                                        Test Connection
                                    </button>
                                    <button 
                                        onClick={generateMockData}
                                        className="btn btn-outline-info"
                                    >
                                        <i className="fas fa-database me-2"></i>
                                        Use Demo Data
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <small className="text-muted">
                                        If the problem persists, please check:
                                        <br />
                                        • Backend server is running
                                        <br />
                                        • Database connection is active
                                        <br />
                                        • API endpoints are accessible
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>

            {/* Header Controls */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-1" style={{ color: '#2c3e50', fontWeight: '600' }}>
                        Inventory Reports & Predictive Analytics
                    </h4>
                    <p className="text-muted mb-0">Material usage forecasting and inventory management insights</p>
                </div>
                <div className="d-flex gap-2">
                    <select 
                        value={windowDays} 
                        onChange={(e) => setWindowDays(Number(e.target.value))}
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                        <option value={365}>Last year</option>
                    </select>
                    <button 
                        onClick={handleGlobalRefresh}
                        className="btn btn-primary btn-sm"
                    >
                        <i className="fas fa-sync me-1"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-4">
                <ul className="nav nav-pills nav-fill" role="tablist">
                    {[
                        { id: 'overview', name: 'Overview', icon: '📊' },
                        { id: 'stock', name: 'Stock Status', icon: '📦' },
                        { id: 'consumption', name: 'Consumption Trends', icon: '📈' },
                        { id: 'replenishment', name: 'Replenishment', icon: '🛒' },
                        { id: 'forecast', name: 'Forecasting', icon: '📅' },
                        { id: 'turnover', name: 'Stock Turnover', icon: '🔄' },
                        { id: 'alkansya', name: 'Alkansya Analytics', icon: '🐷' }
                    ].map(tab => (
                        <li className="nav-item" key={tab.id}>
                            <button
                                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    border: 'none',
                                    backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#6c757d',
                                    fontWeight: activeTab === tab.id ? '600' : '400'
                                }}
                            >
                                <span className="me-2">{tab.icon}</span>
                                {tab.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Material Filter */}
            <div className="mb-4">
                <div className="d-flex align-items-center gap-3">
                    <label className="form-label mb-0 fw-medium">Filter by Product:</label>
                    <select 
                        value={materialFilter} 
                        onChange={(e) => setMaterialFilter(e.target.value)}
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                    >
                        <option value="all">All Materials</option>
                        <option value="alkansya">Alkansya Materials</option>
                        <option value="dining-table">Dining Table Materials</option>
                        <option value="wooden-chair">Wooden Chair Materials</option>
                    </select>
                </div>
            </div>



            {/* Content based on active tab */}
            {activeTab === 'overview' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {/* Dashboard Overview */}
                    <div className="row mb-4">
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 bg-white">
                                <div className="card-body text-center p-4">
                                    <div className="d-flex align-items-center justify-content-center mb-3">
                                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-boxes text-primary fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-primary fw-bold">
                                                {dashboardData?.summary?.total_items || 0}
                                            </h3>
                                            <small className="text-muted fw-medium">Total Items</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">
                                        {inventoryReport?.summary?.total_items || 0} items tracked
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 bg-white">
                                <div className="card-body text-center p-4">
                                    <div className="d-flex align-items-center justify-content-center mb-3">
                                        <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-exclamation-triangle text-danger fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-danger fw-bold">
                                                {dashboardData?.summary?.low_stock_items || 0}
                                            </h3>
                                            <small className="text-muted fw-medium">Reorder Alerts</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">
                                        {inventoryReport?.summary?.items_needing_reorder || 0} need reordering
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 bg-white">
                                <div className="card-body text-center p-4">
                                    <div className="d-flex align-items-center justify-content-center mb-3">
                                        <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-clock text-warning fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-warning fw-bold">
                                                {dashboardData?.summary?.out_of_stock_items || 0}
                                            </h3>
                                            <small className="text-muted fw-medium">Out of Stock</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">
                                        {inventoryReport?.summary?.critical_items || 0} critical items
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 bg-white">
                                <div className="card-body text-center p-4">
                                    <div className="d-flex align-items-center justify-content-center mb-3">
                                        <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-chart-line text-info fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-info fw-bold">
                                                {inventoryReport?.summary?.total_usage || 0}
                                            </h3>
                                            <small className="text-muted fw-medium">Total Usage</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">
                                        Last {windowDays} days
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Chart */}
                    <div className="card border-0 shadow-sm bg-white">
                        <div className="card-header bg-white border-0 p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-semibold text-dark">Top Inventory Items by Stock Level</h5>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-primary">Current Stock</span>
                                    <span className="badge bg-danger">Reorder Point</span>
                        </div>
                            </div>
                        </div>
                        <div className="card-body p-4">
                            <div className="row">
                                <div className="col-md-8">
                                    <div className="bg-white rounded-3 p-3">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={inventoryReport?.items?.slice(0, 10).map(item => ({
                                                name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
                                                current: item.current_stock,
                                                reorder: item.reorder_point,
                                                usage: item.total_usage
                                            })) || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    angle={-45} 
                                                    textAnchor="end" 
                                                    height={100}
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: 'white', 
                                                        border: '1px solid #e0e0e0',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }} 
                                                />
                                            <Legend />
                                                <Bar dataKey="current" fill="#3B82F6" name="Current Stock" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="reorder" fill="#EF4444" name="Reorder Point" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="d-flex flex-column h-100 justify-content-center">
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center mb-2">
                                                <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="fas fa-chart-bar text-primary"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-0">Stock Analysis</h6>
                                                    <small className="text-muted">Current vs Reorder Points</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center mb-2">
                                                <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="fas fa-check-circle text-success"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-0">Healthy Stock</h6>
                                                    <small className="text-muted">Above reorder points</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center mb-2">
                                                <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="fas fa-exclamation-triangle text-warning"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-0">Attention Needed</h6>
                                                    <small className="text-muted">14 items need reordering</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Consumption Trends Tab */}
            {activeTab === 'consumption' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {consumptionTrends && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="text-xl font-semibold text-dark mb-0">Material Consumption Trends</h3>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-primary">Daily Usage</span>
                                    <span className="badge bg-success">Trend Analysis</span>
                                </div>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-primary text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{consumptionTrends.trends ? Object.keys(consumptionTrends.trends).length : 0}</h3>
                                            <small className="opacity-75">Items Tracked</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-info text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{consumptionTrends.period_days || 0}</h3>
                                            <small className="opacity-75">Analysis Period (Days)</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-success text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">
                                                {consumptionTrends.trends ? 
                                                    Object.values(consumptionTrends.trends).reduce((sum, item) => sum + (item.total_usage_period || 0), 0) : 0
                                                }
                                            </h3>
                                            <small className="opacity-75">Total Usage</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-warning text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">
                                                {consumptionTrends.trends ? 
                                                    Math.round(Object.values(consumptionTrends.trends).reduce((sum, item) => sum + (item.avg_daily_usage || 0), 0) / Math.max(1, Object.keys(consumptionTrends.trends).length)) : 0
                                                }
                                            </h3>
                                            <small className="opacity-75">Avg Daily Usage</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Consumption Chart */}
                            <div className="mb-4">
                                <div className="card border-0 shadow-sm bg-white">
                                    <div className="card-header bg-white border-0 p-4">
                                        <h6 className="fw-semibold mb-0 text-dark">Top Items by Daily Usage</h6>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="bg-white rounded-3 p-3">
                                            <ResponsiveContainer width="100%" height={350}>
                                                <BarChart data={consumptionTrends.trends ? 
                                                    Object.values(consumptionTrends.trends)
                                                        .sort((a, b) => (b.avg_daily_usage || 0) - (a.avg_daily_usage || 0))
                                                        .slice(0, 10)
                                                        .map(item => ({
                                                            name: item.item_name?.length > 15 ? item.item_name.substring(0, 15) + '...' : item.item_name,
                                                            avg_daily_usage: item.avg_daily_usage,
                                                            total_usage: item.total_usage_period,
                                                            days_until_stockout: item.days_until_stockout
                                                        })) : []}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        angle={-45} 
                                                        textAnchor="end" 
                                                        height={100}
                                                        tick={{ fontSize: 12, fill: '#666' }}
                                                    />
                                                    <YAxis 
                                                        tick={{ fontSize: 12, fill: '#666' }}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: 'white', 
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                        }} 
                                                    />
                                        <Legend />
                                                    <Bar dataKey="avg_daily_usage" fill="#3B82F6" name="Avg Daily Usage" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                                            </div>
                                                </div>
                                                </div>

                            {/* Consumption Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-left">SKU</th>
                                            <th className="px-4 py-2 text-left">Avg Daily Usage</th>
                                            <th className="px-4 py-2 text-left">Total Usage</th>
                                            <th className="px-4 py-2 text-left">Days Until Stockout</th>
                                            <th className="px-4 py-2 text-left">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consumptionTrends.trends ? Object.values(consumptionTrends.trends).map((item, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2">{item.item_name}</td>
                                                <td className="px-4 py-2">{item.sku}</td>
                                                <td className="px-4 py-2">{item.avg_daily_usage}</td>
                                                <td className="px-4 py-2">{item.total_usage_period}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`fw-bold ${
                                                        item.days_until_stockout < 7 ? 'text-danger' :
                                                        item.days_until_stockout < 14 ? 'text-warning' :
                                                        'text-success'
                                                    }`}>
                                                        {item.days_until_stockout === 999 ? 'N/A' : `${item.days_until_stockout} days`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        item.trend > 0 ? 'bg-danger text-white' :
                                                        item.trend < 0 ? 'bg-success text-white' :
                                                        'bg-info text-white'
                                                    }`}>
                                                        {item.trend > 0 ? '↗ Increasing' :
                                                         item.trend < 0 ? '↘ Decreasing' : '→ Stable'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : []}
                                    </tbody>
                                </table>
                                            </div>
                                            </div>
                    )}
                                        </div>
            )}

            {/* Enhanced Replenishment Tab */}
            {activeTab === 'replenishment' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {replenishmentSchedule && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="text-xl font-semibold text-dark mb-0">Enhanced Replenishment Schedule</h3>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-primary">Alkansya-Based</span>
                                    <span className="badge bg-success">Accurate Calculations</span>
                                    <span className="badge bg-info">3-Month Data</span>
                                </div>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-danger text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{replenishmentSchedule.summary?.immediate_reorders || 0}</h3>
                                            <small className="opacity-75">Immediate Reorders</small>
                                    </div>
                                </div>
                                            </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-warning text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{replenishmentSchedule.summary?.high_priority || 0}</h3>
                                            <small className="opacity-75">High Priority</small>
                                                </div>
                                                </div>
                                            </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-info text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{replenishmentSchedule.summary?.medium_priority || 0}</h3>
                                            <small className="opacity-75">Medium Priority</small>
                                            </div>
                                        </div>
                                    </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-success text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">₱{replenishmentSchedule.summary?.total_reorder_value?.toLocaleString() || 0}</h3>
                                            <small className="opacity-75">Total Reorder Value</small>
                                </div>
                                            </div>
                                                </div>
                                                </div>

                            {/* Replenishment Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-left">SKU</th>
                                            <th className="px-4 py-2 text-left">Current Stock</th>
                                            <th className="px-4 py-2 text-left">Reorder Point</th>
                                            <th className="px-4 py-2 text-left">Recommended Qty</th>
                                            <th className="px-4 py-2 text-left">Priority</th>
                                            <th className="px-4 py-2 text-left">Reorder Date</th>
                                            <th className="px-4 py-2 text-left">Supplier</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterMaterials(replenishmentSchedule.schedule || []).map((item, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2">{item.name}</td>
                                                <td className="px-4 py-2">{item.sku}</td>
                                                <td className="px-4 py-2">{item.current_stock}</td>
                                                <td className="px-4 py-2">{item.reorder_point}</td>
                                                <td className="px-4 py-2">{item.recommended_order_qty}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        item.priority === 'urgent' ? 'bg-danger text-white' :
                                                        item.priority === 'high' ? 'bg-warning text-white' :
                                                        item.priority === 'medium' ? 'bg-info text-white' :
                                                        'bg-success text-white'
                                                    }`}>
                                                        {item.priority?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`fw-bold ${
                                                        item.needs_immediate_reorder ? 'text-danger' :
                                                        item.days_until_reorder < 7 ? 'text-warning' :
                                                        'text-success'
                                                    }`}>
                                                        {item.needs_immediate_reorder ? 'NOW' : item.estimated_reorder_date}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">{item.supplier || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                            </div>
                                            </div>
                    )}
                                        </div>
            )}

            {/* Enhanced Forecasting Tab */}
            {activeTab === 'forecast' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {forecastReport && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="text-xl font-semibold text-dark mb-0">Enhanced Material Usage Forecast</h3>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-primary">Alkansya-Based</span>
                                    <span className="badge bg-success">3-Month Data</span>
                                    <span className="badge bg-info">Accurate Predictions</span>
                                </div>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-primary text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{forecastReport.forecasts?.length || 0}</h3>
                                            <small className="opacity-75">Items Forecasted</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-danger text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{forecastReport.summary?.items_will_need_reorder || 0}</h3>
                                            <small className="opacity-75">Will Need Reorder</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-warning text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{forecastReport.summary?.items_critical || 0}</h3>
                                            <small className="opacity-75">Critical Items</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-success text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{forecastReport.summary?.total_forecasted_usage || 0}</h3>
                                            <small className="opacity-75">Total Forecasted Usage</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                                {/* Forecast Chart */}
                            <div className="mb-4">
                                <h6 className="fw-semibold mb-3">Top Items by Forecasted Usage</h6>
                                    <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={forecastReport.forecasts?.slice(0, 10).map(item => ({
                                        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
                                        current_stock: item.current_stock,
                                        forecasted_usage: item['forecasted_usage_30_days'],
                                        projected_stock: item.projected_stock
                                    })) || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                        <Bar dataKey="current_stock" fill="#3B82F6" name="Current Stock" />
                                        <Bar dataKey="forecasted_usage" fill="#EF4444" name="Forecasted Usage" />
                                        <Bar dataKey="projected_stock" fill="#10B981" name="Projected Stock" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                            {/* Forecast Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-left">SKU</th>
                                            <th className="px-4 py-2 text-left">Current Stock</th>
                                            <th className="px-4 py-2 text-left">Avg Daily Usage</th>
                                            <th className="px-4 py-2 text-left">Forecasted Usage</th>
                                            <th className="px-4 py-2 text-left">Projected Stock</th>
                                            <th className="px-4 py-2 text-left">Days Until Stockout</th>
                                            <th className="px-4 py-2 text-left">Action Needed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterMaterials(forecastReport.forecasts || []).map((item, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2">{item.name}</td>
                                                <td className="px-4 py-2">{item.sku}</td>
                                                <td className="px-4 py-2">{item.current_stock}</td>
                                                <td className="px-4 py-2">{item.avg_daily_usage}</td>
                                                <td className="px-4 py-2">{item['forecasted_usage_30_days']}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`fw-bold ${
                                                        item.projected_stock < 0 ? 'text-danger' :
                                                        item.projected_stock < item.reorder_point ? 'text-warning' :
                                                        'text-success'
                                                    }`}>
                                                        {item.projected_stock}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`fw-bold ${
                                                        item.days_until_stockout < 7 ? 'text-danger' :
                                                        item.days_until_stockout < 14 ? 'text-warning' :
                                                        'text-success'
                                                    }`}>
                                                        {item.days_until_stockout === 999 ? 'N/A' : `${item.days_until_stockout} days`}
                                                </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {item.will_need_reorder ? (
                                                        <span className="px-2 py-1 rounded text-xs bg-danger text-white">
                                                            REORDER NEEDED
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded text-xs bg-success text-white">
                                                            OK
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                            </div>
                                                </div>
                    )}
                                                </div>
            )}

            {/* Stock Status Tab */}
            {activeTab === 'stock' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {inventoryReport && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="text-xl font-semibold text-dark mb-0">Current Stock Status</h3>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-success">In Stock</span>
                                    <span className="badge bg-warning">Low Stock</span>
                                    <span className="badge bg-danger">Critical</span>
                                                </div>
                                                </div>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="fw-semibold text-dark">Item</th>
                                            <th className="fw-semibold text-dark">SKU</th>
                                            <th className="fw-semibold text-dark">Current Stock</th>
                                            <th className="fw-semibold text-dark">Reorder Point</th>
                                            <th className="fw-semibold text-dark">Status</th>
                                            <th className="fw-semibold text-dark">Days Until Stockout</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterMaterials(inventoryReport.items || []).map((item, index) => (
                                            <tr key={index} className="border-bottom">
                                                <td className="fw-medium text-dark">{item.name}</td>
                                                <td className="text-muted">{item.sku}</td>
                                                <td className="fw-semibold">{item.current_stock}</td>
                                                <td className="text-muted">{item.reorder_point}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        item.stock_status === 'out_of_stock' ? 'bg-danger' :
                                                        item.stock_status === 'critical' ? 'bg-danger' :
                                                        item.stock_status === 'low' ? 'bg-warning' :
                                                        'bg-success'
                                                    }`}>
                                                        {item.stock_status === 'out_of_stock' ? 'Out of Stock' :
                                                         item.stock_status === 'critical' ? 'Critical' :
                                                         item.stock_status === 'low' ? 'Low Stock' : 'In Stock'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`fw-bold ${
                                                        item.days_until_stockout < 7 ? 'text-danger' :
                                                        item.days_until_stockout < 14 ? 'text-warning' :
                                                        'text-success'
                                                    }`}>
                                                        {item.days_until_stockout === 999 ? 'N/A' : `${item.days_until_stockout} days`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                    )}
                            </div>
                        )}

            {/* Stock Turnover Tab */}
            {activeTab === 'turnover' && (
                <div className="space-y-6">
                    {turnoverReport && (
                    <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Stock Turnover Analysis</h3>
                            
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-success text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{turnoverReport.summary?.fast_moving || 0}</h3>
                                            <small className="opacity-75">Fast Moving</small>
                                        </div>
                                </div>
                            </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-warning text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{turnoverReport.summary?.medium_moving || 0}</h3>
                                            <small className="opacity-75">Medium Moving</small>
                    </div>
                        </div>
                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-danger text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{turnoverReport.summary?.slow_moving || 0}</h3>
                                            <small className="opacity-75">Slow Moving</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-info text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{turnoverReport.summary?.avg_turnover_rate || 0}</h3>
                                            <small className="opacity-75">Avg Turnover Rate</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Turnover Chart */}
                            <div className="mb-4">
                                <h6 className="fw-semibold mb-3">Turnover Rate by Item</h6>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={turnoverReport.items?.slice(0, 15).map(item => ({
                                        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
                                        turnover_rate: item.turnover_rate,
                                        turnover_days: item.turnover_days
                                    })) || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                        <Bar dataKey="turnover_rate" fill="#3B82F6" name="Turnover Rate" />
                                    </BarChart>
                            </ResponsiveContainer>
                        </div>

                            {/* Turnover Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-left">Total Usage</th>
                                            <th className="px-4 py-2 text-left">Avg Stock Level</th>
                                            <th className="px-4 py-2 text-left">Turnover Rate</th>
                                            <th className="px-4 py-2 text-left">Turnover Days</th>
                                            <th className="px-4 py-2 text-left">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterMaterials(turnoverReport.items || []).map((item, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2">{item.name}</td>
                                                <td className="px-4 py-2">{item.total_usage}</td>
                                                <td className="px-4 py-2">{item.avg_stock_level}</td>
                                                <td className="px-4 py-2">{item.turnover_rate}</td>
                                                <td className="px-4 py-2">{item.turnover_days}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        item.turnover_category === 'fast' ? 'bg-success text-white' :
                                                        item.turnover_category === 'medium' ? 'bg-warning text-white' :
                                                        'bg-danger text-white'
                                                    }`}>
                                                        {item.turnover_category?.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Alkansya Analytics Tab */}
            {activeTab === 'alkansya' && (
                <div className="bg-white rounded-3 shadow-sm p-4">
                    {alkansyaStats && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="text-xl font-semibold text-dark mb-0">Alkansya Production Analytics</h3>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-primary">3-Month Data</span>
                                    <span className="badge bg-success">Accurate Forecasting</span>
                                </div>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-primary text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{alkansyaStats.total_output || 0}</h3>
                                            <small className="opacity-75">Total Output (3 months)</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-success text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{alkansyaStats.average_daily || 0}</h3>
                                            <small className="opacity-75">Average Daily Output</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-info text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{alkansyaStats.last_7_days || 0}</h3>
                                            <small className="opacity-75">Last 7 Days</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6 mb-3">
                                    <div className="card bg-warning text-white h-100">
                                        <div className="card-body text-center">
                                            <h3 className="mb-0 fw-bold">{alkansyaStats.total_days || 0}</h3>
                                            <small className="opacity-75">Production Days</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Material Usage Analysis */}
                            {materialUsageAnalysis && (
                                <div className="card border-0 shadow-sm bg-white mb-4">
                                    <div className="card-header bg-white border-0 p-4">
                                        <h6 className="fw-semibold mb-0 text-dark">Material Usage Analysis (3 Months)</h6>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th className="fw-semibold text-dark">Material</th>
                                                        <th className="fw-semibold text-dark">SKU</th>
                                                        <th className="fw-semibold text-dark">Qty per Unit</th>
                                                        <th className="fw-semibold text-dark">Current Stock</th>
                                                        <th className="fw-semibold text-dark">Total Used (3M)</th>
                                                        <th className="fw-semibold text-dark">Unit Cost</th>
                                                        <th className="fw-semibold text-dark">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {materialUsageAnalysis.map((material, index) => (
                                                        <tr key={index} className="border-bottom">
                                                            <td className="fw-medium text-dark">{material.material_name}</td>
                                                            <td className="text-muted">{material.sku}</td>
                                                            <td className="fw-semibold">{material.qty_per_unit}</td>
                                                            <td className="fw-semibold">{material.current_stock}</td>
                                                            <td className="fw-semibold text-info">{material.total_used_3months}</td>
                                                            <td className="fw-semibold text-success">₱{material.unit_cost?.toLocaleString()}</td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    material.status === 'reorder' ? 'bg-danger' : 'bg-success'
                                                                }`}>
                                                                    {material.status === 'reorder' ? 'Reorder Needed' : 'OK'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Production Trend Chart */}
                            <div className="card border-0 shadow-sm bg-white">
                                <div className="card-header bg-white border-0 p-4">
                                    <h6 className="fw-semibold mb-0 text-dark">Monthly Production Trends</h6>
                                </div>
                                <div className="card-body p-4">
                                    <div className="bg-white rounded-3 p-3">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <AreaChart data={alkansyaStats.monthly_output || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="month" 
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: 'white', 
                                                        border: '1px solid #e0e0e0',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }} 
                                                />
                                                <Legend />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="total" 
                                                    stroke="#3B82F6" 
                                                    fill="#3B82F6" 
                                                    fillOpacity={0.3}
                                                    name="Monthly Output"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Export Buttons */}
            <div className="mt-4 d-flex gap-2">
                <button 
                    onClick={() => handleInventoryExport('stock', 'csv')}
                    className="btn btn-success btn-sm"
                >
                    <i className="fas fa-file-csv me-1"></i>
                    Export Stock CSV
                </button>
                <button 
                    onClick={() => handleInventoryExport('usage', 'csv')}
                    className="btn btn-primary btn-sm"
                >
                    <i className="fas fa-chart-line me-1"></i>
                    Export Usage CSV
                </button>
                <button 
                    onClick={() => handleInventoryExport('replenishment', 'csv')}
                    className="btn btn-info btn-sm"
                >
                    <i className="fas fa-shopping-cart me-1"></i>
                    Export Replenishment CSV
                </button>
            </div>
        </div>
    );
};

export default InventoryReports;


