import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/client";
import { 
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { clearRequestCache } from "../../utils/apiRetry";

const ProductionReports = () => {
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [windowDays, setWindowDays] = useState(30);
    // const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Production report data states
    // const [productionAnalytics, setProductionAnalytics] = useState(null);
    // const [productionPerformance, setProductionPerformance] = useState(null);
    const [productionOutput, setProductionOutput] = useState(null);
    const [resourceUtilization, setResourceUtilization] = useState(null);
    const [advancedPerformance, setAdvancedPerformance] = useState(null);
    const [dailyOutputData, setDailyOutputData] = useState(null);
    const [stageBreakdown, setStageBreakdown] = useState(null);
    const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);

    // Fetch all production reports
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

            console.log('📊 Fetching production reports with date range:', dateRange);

            // Fetch all production-related data
            const [
                // analyticsResponse,
                // performanceResponse,
                outputResponse,
                utilizationResponse,
                advancedResponse,
                dailyOutputResponse,
                stageResponse,
                efficiencyResponse
            ] = await Promise.all([
                api.get('/production/analytics', { params: dateRange }),
                api.get('/production/performance', { params: dateRange }),
                api.get('/production/output', { params: dateRange }),
                api.get('/production/resource-utilization', { params: dateRange }),
                api.get('/production/advanced-performance', { params: dateRange }),
                api.get('/production/daily-output', { params: dateRange }),
                api.get('/production/stage-breakdown', { params: dateRange }),
                api.get('/production/efficiency-metrics', { params: dateRange })
            ]);

            // setProductionAnalytics(analyticsResponse.data);
            // setProductionPerformance(performanceResponse.data);
            setProductionOutput(outputResponse.data);
            setResourceUtilization(utilizationResponse.data);
            setAdvancedPerformance(advancedResponse.data);
            setDailyOutputData(dailyOutputResponse.data);
            setStageBreakdown(stageResponse.data);
            setEfficiencyMetrics(efficiencyResponse.data);

            console.log('📊 Production reports fetched successfully');
    } catch (err) {
            console.error('❌ Error fetching production reports:', err);
            setError(err.response?.data?.message || 'Failed to fetch production reports');
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

    // Export functions
    const exportReport = (reportName, data) => {
        const csv = convertToCSV(data);
        downloadCSV(csv, `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const convertToCSV = (data) => {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');
    };

    const downloadCSV = (csv, filename) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleProductionExport = async (exportType, format) => {
        try {
            setLoading(true);
            if (format === 'csv') {
                switch (exportType) {
                    case 'output':
                        exportReport('production_output', productionOutput?.output_data || []);
                        break;
                    case 'stage_breakdown':
                        exportReport('stage_breakdown', stageBreakdown?.stages || []);
                        break;
                    case 'daily_output':
                        exportReport('daily_output', dailyOutputData?.daily_data || []);
                        break;
                    default:
                        console.log('Unknown export type');
                }
            } else if (format === 'pdf') {
                await exportProductionDataToPDF(exportType);
            }
        } catch (error) {
            console.error('Export error:', error);
            setError('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    const exportProductionDataToPDF = async (exportType) => {
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error: {error}</p>
                <button 
                    onClick={handleGlobalRefresh}
                    className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Retry
              </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header Controls */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-1" style={{ color: '#2c3e50', fontWeight: '600' }}>
                        Production Reports & Analytics
                    </h4>
                    <p className="text-muted mb-0">Advanced performance metrics and production insights</p>
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
                        { id: 'output', name: 'Production Output', icon: '🏭' },
                        { id: 'stages', name: 'Stage Breakdown', icon: '⚙️' },
                        { id: 'efficiency', name: 'Efficiency Metrics', icon: '📈' },
                        { id: 'utilization', name: 'Resource Utilization', icon: '🔧' },
                        { id: 'analytics', name: 'Advanced Analytics', icon: '🧠' }
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

            {/* Content based on active tab */}
            {activeTab === 'overview' && (
                <div>
                    {/* Production Overview Dashboard */}
                    <div className="row mb-4">
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center">
                                    <div className="d-flex align-items-center justify-content-center mb-2">
                                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-industry text-primary fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-primary fw-bold">2,850</h3>
                                            <small className="text-muted">Total Output</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">units produced</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center">
                                    <div className="d-flex align-items-center justify-content-center mb-2">
                                        <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-chart-line text-success fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-success fw-bold">94.2%</h3>
                                            <small className="text-muted">Avg Efficiency</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">overall efficiency</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center">
                                    <div className="d-flex align-items-center justify-content-center mb-2">
                                        <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-cogs text-info fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-info fw-bold">8</h3>
                                            <small className="text-muted">Active Productions</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">in progress</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center">
                                    <div className="d-flex align-items-center justify-content-center mb-2">
                                        <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                                            <i className="fas fa-check-circle text-warning fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="mb-0 text-warning fw-bold">45</h3>
                                            <small className="text-muted">Completed Today</small>
                                        </div>
                                    </div>
                                    <p className="text-muted small mb-0">units completed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Production Output Chart */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-0">
                            <h5 className="mb-0 fw-semibold">Daily Production Output</h5>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={[
                                    { date: '2024-01-01', target: 30, actual: 28 },
                                    { date: '2024-01-02', target: 30, actual: 32 },
                                    { date: '2024-01-03', target: 30, actual: 29 },
                                    { date: '2024-01-04', target: 30, actual: 31 },
                                    { date: '2024-01-05', target: 30, actual: 27 },
                                    { date: '2024-01-06', target: 30, actual: 33 },
                                    { date: '2024-01-07', target: 30, actual: 30 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="target" stroke="#3B82F6" name="Target" />
                                    <Line type="monotone" dataKey="actual" stroke="#10B981" name="Actual" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Product Performance */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-0">
                            <h5 className="mb-0 fw-semibold">Product Performance</h5>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={[
                                    { product: 'Alkansya', output: 2850, efficiency: 94.2 },
                                    { product: 'Dining Table', output: 45, efficiency: 88.5 },
                                    { product: 'Wooden Chair', output: 120, efficiency: 91.3 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="product" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="output" fill="#3B82F6" name="Output" />
                                    <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}


            {/* Production Output Tab */}
            {activeTab === 'output' && (
                <div className="space-y-6">
                    {productionOutput && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Production Output Trends</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={productionOutput.output_data || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="target" stroke="#3B82F6" name="Target Output" />
                                    <Line type="monotone" dataKey="actual" stroke="#10B981" name="Actual Output" />
                                    <Line type="monotone" dataKey="efficiency" stroke="#EF4444" name="Efficiency %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Output Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Total Output</h4>
                            <p className="text-2xl font-bold text-blue-600">{productionOutput?.summary?.total_output || 0}</p>
                            <p className="text-sm text-gray-500">units produced</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Average Daily</h4>
                            <p className="text-2xl font-bold text-green-600">{productionOutput?.summary?.avg_daily || 0}</p>
                            <p className="text-sm text-gray-500">units per day</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Peak Output</h4>
                            <p className="text-2xl font-bold text-purple-600">{productionOutput?.summary?.peak_output || 0}</p>
                            <p className="text-sm text-gray-500">highest daily output</p>
                </div>
              </div>
            </div>
          )}

            {/* Stage Breakdown Tab */}
            {activeTab === 'stages' && (
                <div className="space-y-6">
                    {stageBreakdown && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Production Stage Breakdown</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={stageBreakdown.stages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="stage_name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                                    <Bar dataKey="duration_hours" fill="#3B82F6" name="Duration (Hours)" />
                                    <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
            </div>
          )}

                    {/* Stage Details Table */}
                    {stageBreakdown && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Stage Performance Details</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                      <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left">Stage</th>
                                            <th className="px-4 py-2 text-left">Duration (Hours)</th>
                                            <th className="px-4 py-2 text-left">Efficiency</th>
                                            <th className="px-4 py-2 text-left">Bottlenecks</th>
                                            <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                                        {stageBreakdown.stages?.map((stage, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2 font-medium">{stage.stage_name}</td>
                                                <td className="px-4 py-2">{stage.duration_hours?.toFixed(1)}</td>
                                                <td className="px-4 py-2">{stage.efficiency?.toFixed(1)}%</td>
                                                <td className="px-4 py-2">{stage.bottlenecks || 'None'}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        stage.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                                                        stage.efficiency >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {stage.efficiency >= 90 ? 'Excellent' :
                                                         stage.efficiency >= 70 ? 'Good' : 'Needs Improvement'}
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

            {/* Efficiency Metrics Tab */}
            {activeTab === 'efficiency' && (
                <div className="space-y-6">
                    {efficiencyMetrics && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Efficiency Trends</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={efficiencyMetrics.trends || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="overall_efficiency" stroke="#3B82F6" name="Overall Efficiency" />
                                    <Line type="monotone" dataKey="labor_efficiency" stroke="#10B981" name="Labor Efficiency" />
                                    <Line type="monotone" dataKey="machine_efficiency" stroke="#EF4444" name="Machine Efficiency" />
                                </LineChart>
                            </ResponsiveContainer>
                          </div>
                    )}

                    {/* Efficiency Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Overall Efficiency</h4>
                            <p className="text-2xl font-bold text-blue-600">{efficiencyMetrics?.summary?.overall_efficiency?.toFixed(1) || 0}%</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Labor Efficiency</h4>
                            <p className="text-2xl font-bold text-green-600">{efficiencyMetrics?.summary?.labor_efficiency?.toFixed(1) || 0}%</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Machine Efficiency</h4>
                            <p className="text-2xl font-bold text-purple-600">{efficiencyMetrics?.summary?.machine_efficiency?.toFixed(1) || 0}%</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Quality Rate</h4>
                            <p className="text-2xl font-bold text-orange-600">{efficiencyMetrics?.summary?.quality_rate?.toFixed(1) || 0}%</p>
                      </div>
                    </div>
                  </div>
            )}

            {/* Resource Utilization Tab */}
            {activeTab === 'utilization' && (
                <div className="space-y-6">
                    {resourceUtilization && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resource Utilization</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={resourceUtilization.resources || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="resource_name" />
                      <YAxis />
                      <Tooltip />
                                    <Legend />
                                    <Bar dataKey="utilization_percentage" fill="#3B82F6" name="Utilization %" />
                                    <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                                </BarChart>
                  </ResponsiveContainer>
                </div>
                    )}

                    {/* Resource Details */}
                    {resourceUtilization && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resource Performance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {resourceUtilization.resources?.map((resource, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-800">{resource.resource_name}</h4>
                                        <p className="text-sm text-gray-600">Utilization: {resource.utilization_percentage?.toFixed(1)}%</p>
                                        <p className="text-sm text-gray-600">Efficiency: {resource.efficiency?.toFixed(1)}%</p>
                                        <p className="text-sm text-gray-600">Status: {resource.status}</p>
                                    </div>
                                ))}
              </div>
            </div>
          )}
                </div>
            )}

            {/* Advanced Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Advanced Performance Analytics Dashboard */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-800">Advanced Performance Analytics</h3>
                            <div className="flex gap-2">
                                <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                                    Generate Report
                                </button>
                                <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                    Export Analytics
                                </button>
                            </div>
                        </div>

                        {advancedPerformance && (
                            <div className="space-y-6">
                                {/* Performance Trend Chart */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Trends Over Time</h4>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={advancedPerformance.analytics || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                      <Tooltip />
                      <Legend />
                                            <Line type="monotone" dataKey="productivity_index" stroke="#3B82F6" name="Productivity Index" strokeWidth={3} />
                                            <Line type="monotone" dataKey="quality_score" stroke="#10B981" name="Quality Score" strokeWidth={3} />
                                            <Line type="monotone" dataKey="cost_efficiency" stroke="#EF4444" name="Cost Efficiency" strokeWidth={3} />
                                            <Line type="monotone" dataKey="roi" stroke="#8B5CF6" name="ROI %" strokeWidth={3} />
                                        </LineChart>
                  </ResponsiveContainer>
                </div>

                                {/* Performance Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium opacity-90">Productivity Index</h4>
                                                <p className="text-3xl font-bold">{advancedPerformance?.metrics?.productivity_index?.toFixed(1) || 0}</p>
                                            </div>
                                            <div className="text-4xl opacity-20">📈</div>
                                        </div>
                                        <div className="mt-2 text-sm opacity-90">
                                            {advancedPerformance?.metrics?.productivity_trend > 0 ? '↗️' : '↘️'} 
                                            {Math.abs(advancedPerformance?.metrics?.productivity_trend || 0).toFixed(1)}% vs last period
              </div>
            </div>
                                    
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium opacity-90">Quality Score</h4>
                                                <p className="text-3xl font-bold">{advancedPerformance?.metrics?.quality_score?.toFixed(1) || 0}</p>
              </div>
                                            <div className="text-4xl opacity-20">⭐</div>
                      </div>
                                        <div className="mt-2 text-sm opacity-90">
                                            {advancedPerformance?.metrics?.quality_trend > 0 ? '↗️' : '↘️'} 
                                            {Math.abs(advancedPerformance?.metrics?.quality_trend || 0).toFixed(1)}% vs last period
                      </div>
                    </div>
                                    
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium opacity-90">Cost Efficiency</h4>
                                                <p className="text-3xl font-bold">{advancedPerformance?.metrics?.cost_efficiency?.toFixed(1) || 0}</p>
                </div>
                                            <div className="text-4xl opacity-20">💰</div>
              </div>
                                        <div className="mt-2 text-sm opacity-90">
                                            {advancedPerformance?.metrics?.cost_trend > 0 ? '↗️' : '↘️'} 
                                            {Math.abs(advancedPerformance?.metrics?.cost_trend || 0).toFixed(1)}% vs last period
            </div>
          </div>

                                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium opacity-90">ROI</h4>
                                                <p className="text-3xl font-bold">{advancedPerformance?.metrics?.roi?.toFixed(1) || 0}%</p>
              </div>
                                            <div className="text-4xl opacity-20">📊</div>
                      </div>
                                        <div className="mt-2 text-sm opacity-90">
                                            {advancedPerformance?.metrics?.roi_trend > 0 ? '↗️' : '↘️'} 
                                            {Math.abs(advancedPerformance?.metrics?.roi_trend || 0).toFixed(1)}% vs last period
                      </div>
                    </div>
                  </div>

                                {/* Detailed Performance Analysis */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Production Efficiency Breakdown */}
                                    <div className="bg-white p-6 rounded-lg shadow border">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Production Efficiency Breakdown</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Overall Efficiency</span>
                                                <div className="flex items-center">
                                                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                                        <div className="bg-blue-500 h-2 rounded-full" style={{width: `${advancedPerformance?.metrics?.overall_efficiency || 0}%`}}></div>
                                                    </div>
                                                    <span className="font-semibold">{advancedPerformance?.metrics?.overall_efficiency?.toFixed(1) || 0}%</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Labor Efficiency</span>
                                                <div className="flex items-center">
                                                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                                        <div className="bg-green-500 h-2 rounded-full" style={{width: `${advancedPerformance?.metrics?.labor_efficiency || 0}%`}}></div>
                                                    </div>
                                                    <span className="font-semibold">{advancedPerformance?.metrics?.labor_efficiency?.toFixed(1) || 0}%</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Machine Efficiency</span>
                                                <div className="flex items-center">
                                                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                                        <div className="bg-purple-500 h-2 rounded-full" style={{width: `${advancedPerformance?.metrics?.machine_efficiency || 0}%`}}></div>
                                                    </div>
                                                    <span className="font-semibold">{advancedPerformance?.metrics?.machine_efficiency?.toFixed(1) || 0}%</span>
                      </div>
                      </div>
                    </div>
                  </div>

                                    {/* Quality Metrics */}
                                    <div className="bg-white p-6 rounded-lg shadow border">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Quality Metrics</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Defect Rate</span>
                                                <span className="font-semibold text-red-600">{advancedPerformance?.metrics?.defect_rate?.toFixed(2) || 0}%</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">First Pass Yield</span>
                                                <span className="font-semibold text-green-600">{advancedPerformance?.metrics?.first_pass_yield?.toFixed(1) || 0}%</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Customer Satisfaction</span>
                                                <span className="font-semibold text-blue-600">{advancedPerformance?.metrics?.customer_satisfaction?.toFixed(1) || 0}/5</span>
                      </div>
                      </div>
                    </div>
                  </div>

                                {/* Performance Comparison Chart */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Comparison</h4>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={advancedPerformance?.comparison_data || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="metric" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="current" fill="#3B82F6" name="Current Period" />
                                            <Bar dataKey="previous" fill="#10B981" name="Previous Period" />
                                            <Bar dataKey="target" fill="#EF4444" name="Target" />
                                        </BarChart>
                                    </ResponsiveContainer>
                      </div>
                      </div>
                        )}
                  </div>
                </div>
            )}

            {/* Export Buttons */}
            <div className="mt-4 d-flex gap-2">
                <button 
                    onClick={() => handleProductionExport('output', 'csv')}
                    className="btn btn-success btn-sm"
                >
                    <i className="fas fa-industry me-1"></i>
                    Export Output CSV
                </button>
                <button 
                    onClick={() => handleProductionExport('stage_breakdown', 'csv')}
                    className="btn btn-primary btn-sm"
                >
                    <i className="fas fa-cogs me-1"></i>
                    Export Stage Breakdown CSV
                </button>
                <button 
                    onClick={() => handleProductionExport('daily_output', 'csv')}
                    className="btn btn-info btn-sm"
                >
                    <i className="fas fa-file-csv me-1"></i>
                    Export Daily Output CSV
                </button>
            </div>
        </div>
    );
};

export default ProductionReports;