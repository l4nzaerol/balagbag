import React from "react";
import { useNavigate } from "react-router-dom";

export default function KPICards({ kpis }) {
  const navigate = useNavigate();
  
  const allMetrics = [
    { 
      label: "Completed Productions OF Table and Chair", 
      value: kpis.completed_productions, 
      icon: "fa-check-circle",
      isPrimary: false,
      route: "/productions?status=completed",
      description: "View completed table and chair productions"
    },
    { 
      label: "In Progress", 
      value: kpis.in_progress, 
      icon: "fa-spinner",
      isPrimary: false,
      route: "/productions",
      description: "View productions currently in progress"
    },
    { 
      label: "Pending Orders", 
      value: kpis.pending_orders, 
      icon: "fa-clock",
      isPrimary: false,
      route: "/orders?status=pending",
      description: "View pending customer orders"
    },
    { 
      label: "Completed Orders", 
      value: kpis.completed_orders, 
      icon: "fa-box-check",
      isPrimary: false,
      route: "/orders?status=completed",
      description: "View completed customer orders"
    },
    { 
      label: "Total Sales Revenue", 
      value: kpis.total_sales_revenue ? `₱${kpis.total_sales_revenue.toLocaleString()}` : "₱0", 
      icon: "fa-dollar-sign",
      isPrimary: false,
      route: "/reports?tab=sales",
      description: "View sales dashboard and revenue analytics"
    },
  ];

  return (
    <div className="row">
      {allMetrics.map((item, i) => (
        <div className="col-lg col-md-4 col-sm-6 mb-3" key={i}>
          <div 
            className="card h-100"
            style={{ 
              backgroundColor: item.isPrimary ? '#8b5e34' : 'rgba(255, 255, 255, 0.1)',
              border: item.isPrimary ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              boxShadow: item.isPrimary ? '0 4px 12px rgba(139, 94, 52, 0.2)' : '0 2px 8px rgba(139, 94, 52, 0.1)',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
            onClick={() => navigate(item.route)}
            title={item.description}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = item.isPrimary 
                ? '0 8px 20px rgba(139, 94, 52, 0.3)' 
                : '0 4px 12px rgba(139, 94, 52, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = item.isPrimary 
                ? '0 4px 12px rgba(139, 94, 52, 0.2)' 
                : 'none';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ 
                    width: 48, 
                    height: 48, 
                    backgroundColor: item.isPrimary ? 'rgba(255,255,255,0.2)' : 'rgba(139, 69, 19, 0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'rotate(15deg) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                  }}
                >
                  <i 
                    className={`fas ${item.icon} fa-lg ${item.icon === 'fa-spinner' ? 'fa-pulse' : ''}`}
                    style={{ 
                      color: item.isPrimary ? '#ffffff' : '#8b5e34',
                      transition: 'all 0.3s ease'
                    }}
                  ></i>
                </div>
              </div>
              <div 
                className="small mb-2" 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: item.isPrimary ? 'rgba(255,255,255,0.9)' : '#2C1810',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {item.label}
              </div>
              <div 
                className="display-6 mb-0 fw-bold" 
                style={{ color: item.isPrimary ? '#ffffff' : '#2C1810' }}
              >
                {item.value || 0}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
