import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../Header";
import InventoryReports from "./InventoryReports";
import ProductionReports from "./ProductionReports";
import SalesAnalytics from "./SalesAnalytics";

// Simple CSS for clean white theme
const simpleStyles = `
    .nav-tabs .nav-link {
        border: none;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
    }
    
    .nav-tabs .nav-link.active {
        border-bottom: 3px solid #007bff;
        background-color: #007bff;
        color: white;
    }
    
    .nav-tabs .nav-link:hover {
        border-bottom: 3px solid #0056b3;
        background-color: #f8f9fa;
    }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = simpleStyles;
    document.head.appendChild(styleSheet);
}

const Report = () => {
    const navigate = useNavigate();
    const [activeReport, setActiveReport] = useState("inventory");

    const reportTabs = [
        { 
            id: "inventory", 
            name: "Inventory Reports", 
            component: InventoryReports,
            icon: "📊",
            description: "Predictive analytics for material usage and inventory management"
        },
        { 
            id: "production", 
            name: "Production Reports", 
            component: ProductionReports,
            icon: "🏭",
            description: "Advanced performance metrics and production analytics"
        },
        { 
            id: "sales", 
            name: "Sales Analytics", 
            component: SalesAnalytics,
            icon: "💰",
            description: "Revenue analysis and customer behavior insights"
        }
    ];


    return (
        <AppLayout>
            <div className="container-fluid py-4">
                {/* Header Section */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <button 
                                    className="btn btn-outline-secondary btn-sm mb-2"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    ← Back to Dashboard
                                </button>
                                <h2 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
                                    Reports & Analytics Dashboard
                                </h2>
                                <p className="text-muted mb-0">
                                    Comprehensive reporting and predictive analytics for Unick Enterprises Inc.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-primary btn-sm">
                                    <i className="fas fa-download me-1"></i>
                                    Export Report
                                </button>
                                <button className="btn btn-success btn-sm">
                                    <i className="fas fa-sync me-1"></i>
                                    Refresh Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* New separate container with border design */}
                <div className="bg-white rounded-3 shadow-sm border p-4">
                    {/* Report Tabs - Aligned in One Row */}
                <div className="row mb-4">
                    <div className="col-12">
                                <ul className="nav nav-tabs nav-fill border-0" role="tablist">
                                    {reportTabs.map((tab, index) => (
                                        <li className="nav-item" key={tab.id}>
                                            <button
                                            className={`nav-link ${activeReport === tab.id ? 'active' : ''}`}
                                                onClick={() => setActiveReport(tab.id)}
                                                style={{
                                                    border: 'none',
                                                borderBottom: activeReport === tab.id ? '3px solid #007bff' : 'none',
                                                color: activeReport === tab.id ? '#007bff' : '#6c757d',
                                                fontWeight: activeReport === tab.id ? '600' : 'normal',
                                                backgroundColor: 'transparent',
                                                transition: 'all 0.3s ease',
                                                    padding: '1rem 1.5rem',
                                                fontSize: '1.05rem'
                                            }}
                                        >
                                            {tab.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                            </div>
                                        </div>

                    {/* Report Content */}
                    <div className="row">
                        <div className="col-12">
                            {activeReport === 'inventory' && <InventoryReports />}
                            {activeReport === 'production' && <ProductionReports />}
                            {activeReport === 'sales' && <SalesAnalytics />}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Report;