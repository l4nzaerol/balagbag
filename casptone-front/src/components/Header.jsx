import React, { useEffect, useState, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, User } from "lucide-react";
import { LayoutDashboard, Package, ClipboardList, Boxes, Factory, BarChart } from "lucide-react";
import NotificationBell from "./Customers/NotificationBell";



// 🧠 Get role and username from localStorage
const getUserData = () => ({
    username: localStorage.getItem("username") || "Guest",
    role: localStorage.getItem("role") || "User",
    token: localStorage.getItem("token") || null,
});

// 📱 Sidebar Context for minimize functionality
const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        // Return default values if not within provider (for customer pages)
        return { isMinimized: false, toggleSidebar: () => {} };
    }
    return context;
};

// 🔷 Header Component
const Header = ({ role, username }) => {
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (role === "customer") {
            const fetchCartCount = async () => {
                try {
                    const token = localStorage.getItem("token");
                    if (!token) throw new Error("User not authenticated.");

                    const response = await axios.get("http://localhost:8000/api/cart", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const totalItems = response.data.reduce((sum, item) => sum + item.quantity, 0);
                    setCartCount(totalItems);
                } catch (err) {
                    console.error("Failed to fetch cart count:", err);
                    // If we get rate limited, stop making requests for a while
                    if (err.response?.status === 429) {
                        console.warn("Rate limited - stopping cart count requests temporarily");
                        return;
                    }
                }
            };

            fetchCartCount();
            // Reduced frequency to prevent rate limiting - every 30 seconds instead of 1 second
            const interval = setInterval(fetchCartCount, 5000);
            return () => clearInterval(interval);
        }
    }, [role]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    return (
        <header style={role === "customer" ? styles.headerTransparent : styles.headerWood}>
            <div style={styles.left} onClick={() => navigate("/dashboard")}>
                <h2 style={styles.logo}>UNICK FURNITURE</h2>
            </div>

            <div style={styles.right}>
                {role === "customer" && (
                    <>
                    <NotificationBell />
                    <button style={styles.iconBtn} onClick={() => navigate("/cart")}>
                        <ShoppingCart size={24} />
                        {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
                    </button>
                    </>
                )}
                <div style={styles.userSection}>
                    <span 
                        style={styles.username} 
                        onClick={() => navigate("/profile")}
                        title="Click to view your profile"
                        onMouseEnter={(e) => {
                            e.target.style.background = "rgba(255,255,255,0.2)";
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = "rgba(255,255,255,0.1)";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                        }}
                    >
                        <User size={20} /> {username}
                    </span>
                </div>
                
                <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>
        </header>
    );
};

// 🔸 Sidebar for Admin with minimize functionality
const Sidebar = ({ isMinimized, toggleSidebar }) => {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const [hoveredItem, setHoveredItem] = useState(null);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    const navItems = [
        { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["employee", "admin"] },
        { path: "/product", icon: Package, label: "Products", roles: ["employee"] },
        { path: "/orders", icon: ClipboardList, label: "Orders", roles: ["employee"] },
        { path: "/inventory", icon: Boxes, label: "Inventory", roles: ["employee"] },
        { path: "/productions", icon: Factory, label: "Productions", roles: ["employee", "admin"] },
        { path: "/reports", icon: BarChart, label: "Reports", roles: ["employee"] },
    ];

    const filteredNavItems = navItems.filter(item => 
        item.roles.includes(role) || item.roles.includes("admin")
    );

    return (
        <div style={{
            ...styles.sidebarModern,
            width: isMinimized ? "80px" : "280px",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
            <div>
                {/* Brand Section with Simple Toggle Button */}
                <div style={styles.brandSection}>
                    <div 
                        style={{
                            ...styles.brandModern,
                            padding: isMinimized ? "1rem 0.5rem" : "2rem 1.5rem 2rem 1.5rem",
                            justifyContent: isMinimized ? "center" : "flex-start",
                            cursor: "default", // Make non-clickable
                            position: "relative",
                            paddingRight: isMinimized ? "0.5rem" : "4rem" // Add space for button
                        }}
                        onMouseEnter={(e) => {
                            if (!isMinimized) {
                                e.target.style.transform = "scale(1.02)";
                                e.target.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isMinimized) {
                                e.target.style.transform = "scale(1)";
                                e.target.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)";
                            }
                        }}
                    >
                        {/* Removed Factory icon - text only */}
                        {!isMinimized && <span>Unick Furniture</span>}
                    </div>
                    
                    {/* Simple Toggle Button - Positioned to avoid overlap */}
                    <button 
                        style={{
                            ...styles.simpleToggleButton,
                            ...(isMinimized ? styles.simpleToggleButtonMinimized : {})
                        }}
                        onClick={toggleSidebar}
                        title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
                        onMouseEnter={(e) => {
                            e.target.style.background = "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
                            e.target.style.transform = "scale(1.1)";
                            e.target.style.boxShadow = "0 4px 12px rgba(255, 215, 0, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = isMinimized 
                                ? "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)"
                                : "linear-gradient(135deg, #2C1810 0%, #3D2817 100%)";
                            e.target.style.transform = "scale(1)";
                            e.target.style.boxShadow = isMinimized 
                                ? "0 2px 8px rgba(139, 69, 19, 0.3)"
                                : "0 3px 10px rgba(139, 69, 19, 0.2)";
                        }}
                    >
                        {isMinimized ? "→" : "←"}
                    </button>
                </div>

                <nav style={{
                    ...styles.navModern,
                    padding: isMinimized ? "1rem 0.5rem" : "1.5rem"
                }}>
                    {filteredNavItems.map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                            <button 
                                key={index}
                                style={{
                                    ...styles.navItem,
                                    ...(hoveredItem === index ? styles.navItemHover : {}),
                                    padding: isMinimized ? "1rem 0.5rem" : "1rem 1.25rem",
                                    justifyContent: isMinimized ? "center" : "flex-start"
                                }}
                                onClick={() => navigate(item.path)}
                                onMouseEnter={() => setHoveredItem(index)}
                                onMouseLeave={() => setHoveredItem(null)}
                                title={isMinimized ? item.label : ""}
                            >
                                <IconComponent size={20} style={{ 
                                    color: hoveredItem === index ? "#FFD700" : "#FFF8DC",
                                    transition: "color 0.3s ease"
                                }} />
                                {!isMinimized && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <button 
                style={{
                    ...styles.logoutModern,
                    padding: isMinimized ? "1rem 0.5rem" : "1rem 1.5rem",
                    margin: isMinimized ? "1.5rem 0.5rem" : "1.5rem",
                    justifyContent: isMinimized ? "center" : "flex-start"
                }}
                onClick={handleLogout}
                title={isMinimized ? "Logout" : ""}
                onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 8px 24px rgba(139, 69, 19, 0.4)";
                    e.target.style.background = "linear-gradient(135deg, #8B4513 0%, #2C1810 100%)";
                    e.target.style.borderColor = "#FFD700";
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 16px rgba(139, 69, 19, 0.3)";
                    e.target.style.background = "linear-gradient(135deg, #2C1810 0%, #3D2817 100%)";
                    e.target.style.borderColor = "#F4E4BC";
                }}
            >
                {!isMinimized && "Logout"}
            </button>
        </div>
    );
};

// 📦 Sidebar Provider Component
const SidebarProvider = ({ children }) => {
    // Load initial state from localStorage or default to false
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const toggleSidebar = () => {
        const newState = !isMinimized;
        setIsMinimized(newState);
        // Save to localStorage
        localStorage.setItem('sidebarMinimized', JSON.stringify(newState));
    };

    return (
        <SidebarContext.Provider value={{ isMinimized, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};

// 📦 Final Layout
const AppLayout = ({ children }) => {
    const { role, username } = getUserData();
    const { isMinimized, toggleSidebar } = useSidebar();

    return (
        <>
            {/* Show header only for customer */}
            {role === "customer" && <Header role={role} username={username} />}
            
            {/* Show sidebar only for employees/admins */}
            {role !== "customer" && <Sidebar isMinimized={isMinimized} toggleSidebar={toggleSidebar} />}

            {/* Adjust layout spacing depending on role */}
            <div
                style={{
                    marginLeft: role !== "customer" ? (isMinimized ? "80px" : "280px") : 0,
                    marginTop: role === "customer" ? "60px" : 0,
                    padding: "1rem",
                    transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    minHeight: "100vh"
                }}
            >
                {children}
            </div>
            <footer className="footer-wood text-center" style={{ 
                marginLeft: role !== "customer" ? (isMinimized ? "80px" : "280px") : 0,
                transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <div className="container">
                    <small>© {new Date().getFullYear()} Unick Furniture — Crafted with care</small>
                </div>
            </footer>
        </>
    );
};

// 📦 Main App Layout with Sidebar Provider
const AppLayoutWithProvider = ({ children }) => {
    const { role } = getUserData();
    
    if (role === "customer") {
        return <AppLayout>{children}</AppLayout>;
    }
    
    return (
        <SidebarProvider>
            <AppLayout>{children}</AppLayout>
        </SidebarProvider>
    );
};

const styles = {
    headerTransparent: {
        width: "100%",
        height: "60px",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999,
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    },
    headerWood: {
        width: "100%",
        height: "60px",
        background: "linear-gradient(180deg, #e8d9c6, #d9c7ae)",
        color: "#2f2a26",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
    left: {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
    },
    logo: {
        fontSize: "1.5rem",
        fontWeight: "bold",
        color: "#333",
    },
    userSection: {
        display: "flex",
        alignItems: "center",
    },
    username: {
        display: "flex",
        alignItems: "center",
        fontSize: "1rem",
        gap: "0.5rem",
        color: "#333",
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        transition: "all 0.3s ease",
        fontWeight: "500",
        userSelect: "none",
    },
    iconBtn: {
        background: "none",
        border: "none",
        position: "relative",
        cursor: "pointer",
    },
    cartBadge: {
        position: "absolute",
        top: "-6px",
        right: "-8px",
        backgroundColor: "#ff2e2e",
        color: "#fff",
        fontSize: "0.75rem",
        borderRadius: "50%",
        padding: "2px 6px",
    },
    logoutBtn: {
        background: "linear-gradient(180deg, #b5835a, #8b5e34)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        boxShadow: "0 8px 16px rgba(139,94,52,0.25)",
    },
    themeBtn: {
        background: "linear-gradient(180deg, #d9c7ae, #cbb79a)",
        color: "#2f2a26",
        border: "none",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
    },

    
    sidebarModern: {
        background: "linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #D2691E 100%)",
        color: "#FFF8DC",
        width: "280px",
        height: "100vh",
        padding: "0",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "8px 0 32px rgba(139, 69, 19, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backdropFilter: "blur(20px)",
        borderRight: "2px solid #F4E4BC",
        zIndex: 1000,
    },
    
    brandModern: {
        display: "flex",
        alignItems: "center",
        fontSize: "1.8rem",
        fontWeight: "700",
        color: "#FFF8DC",
        marginBottom: "0",
        cursor: "pointer",
        gap: "0.75rem",
        padding: "2rem 1.5rem",
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)",
        borderBottom: "2px solid #F4E4BC",
        position: "relative",
        transition: "all 0.3s ease",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    },
    
    userModern: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "1rem",
        color: "#ffeccc",
        marginBottom: "2rem",
        paddingLeft: "2px",
        borderBottom: "1px dashed rgba(255,255,255,0.15)",
        paddingBottom: "0.5rem",
    },
    
    navModern: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1.5rem",
        flex: 1,
    },
    
    navItem: {
        background: "transparent",
        color: "#FFF8DC",
        border: "none",
        padding: "1rem 1.25rem",
        borderRadius: "12px",
        fontSize: "0.95rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        fontWeight: "500",
        letterSpacing: "0.2px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        borderLeft: "3px solid transparent",
    },
    navItemHover: {
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)",
        transform: "translateX(8px)",
        color: "#FFF8DC",
        borderLeft: "3px solid #FFD700",
        boxShadow: "0 4px 20px rgba(139, 69, 19, 0.2)",
    },
    
    logoutModern: {
        background: "linear-gradient(135deg, #2C1810 0%, #3D2817 100%)",
        color: "#FFF8DC",
        border: "2px solid #F4E4BC",
        padding: "1rem 1.5rem",
        fontSize: "0.95rem",
        fontWeight: "600",
        borderRadius: "12px",
        cursor: "pointer",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        letterSpacing: "0.3px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        margin: "1.5rem",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(139, 69, 19, 0.3)",
    },
    
    brandSection: {
        position: "relative",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
    },
    
    simpleToggleButton: {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        background: "linear-gradient(135deg, #2C1810 0%, #3D2817 100%)",
        color: "#FFF8DC",
        border: "1px solid #F4E4BC",
        borderRadius: "4px",
        padding: "0.5rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        boxShadow: "0 3px 10px rgba(139, 69, 19, 0.2)",
        zIndex: 10,
        width: "32px",
        height: "32px",
        fontSize: "14px",
        fontWeight: "bold"
    },
    
    simpleToggleButtonMinimized: {
        top: "0.5rem",
        right: "0.5rem",
        width: "28px",
        height: "28px",
        background: "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)",
        border: "1px solid #FFD700",
        boxShadow: "0 2px 8px rgba(139, 69, 19, 0.3)",
        fontSize: "12px"
    },
    
    toggleButtonIntegrated: {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)",
        color: "#FFF8DC",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "6px",
        padding: "0.4rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 8px rgba(139, 69, 19, 0.3)",
        zIndex: 10,
        width: "32px",
        height: "32px"
    },
    
    toggleContainer: {
        display: "flex",
        justifyContent: "flex-end",
        padding: "1rem 1rem 0.5rem 1rem",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
    },
    
    toggleButton: {
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        color: "#FFF8DC",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "8px",
        padding: "0.5rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 8px rgba(139, 69, 19, 0.2)"
    }
};


export default AppLayoutWithProvider;
