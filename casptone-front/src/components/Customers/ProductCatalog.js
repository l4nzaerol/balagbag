// src/components/ProductCatalog.js
import React, { useState, memo } from "react";
import { Form } from "react-bootstrap";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import BuyNowModal from "./BuyNowModal";
import "./product_catalog.css";

const ProductCatalog = ({ products }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(new Set());
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  // Buy Now modal states
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState(null);

  // Debug logging
  console.log("ProductCatalog received products:", products);
  console.log("Products length:", products?.length || 0);

  const handleShowModal = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
  };

  // Buy Now handlers
  const handleBuyNow = (product) => {
    console.log("Buy Now clicked for product:", product);
    setBuyNowProduct(product);
    setShowBuyNowModal(true);
    // Close the view details modal if it's open
    if (showModal) {
      setShowModal(false);
    }
  };

  const handleCloseBuyNowModal = () => {
    console.log("Closing BuyNowModal");
    setShowBuyNowModal(false);
    setBuyNowProduct(null);
  };

  const handleOrderSuccess = (orderData) => {
    toast.success("Order placed successfully!", {
      description: `Your order has been placed and will appear in the admin dashboard.`,
      duration: 5000
    });
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    // Add this product to loading set
    setLoadingProducts(prev => new Set(prev).add(selectedProduct.id));
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You need to be logged in to add to cart.");
        setLoadingProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedProduct.id);
          return newSet;
        });
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/cart",
        {
          product_id: selectedProduct.id,
          quantity: quantity,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Added to cart:", response.data);
      
      // Show toast notification
      setToastMessage(`${selectedProduct.name} added to cart!`);
      setShowToast(true);
      
      // Auto hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      // Remove this product from loading set
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedProduct.id);
        return newSet;
      });
    }
  };

  const handleAddToCartDirect = async (product) => {
    // Add this product to loading set
    setLoadingProducts(prev => new Set(prev).add(product.id));
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You need to be logged in to add to cart.");
        setLoadingProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.id);
          return newSet;
        });
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/cart",
        {
          product_id: product.id,
          quantity: 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Added to cart:", response.data);
      
      // Show toast notification
      setToastMessage(`${product.name} added to cart!`);
      setShowToast(true);
      
      // Auto hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      // Remove this product from loading set
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const ProductCard = ({ product, index, category }) => (
    <motion.div
      key={product.id}
      className={`product-card ${category}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ 
        y: -10, 
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
    >
      <div className="product-image-container">
        
        <img
          src={`http://localhost:8000/${product.image}`}
          alt={product.name}
          className="product-image"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        
        <div className="product-overlay">
          <motion.button
            className="view-details-btn"
            onClick={() => handleShowModal(product)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <i className="fas fa-eye"></i>
            View Details
          </motion.button>
        </div>
        
        {/* Popular Badge */}
        {product.stock > 10 && (
          <div className="stock-badge popular">
            <i className="fas fa-star"></i>
            POPULAR
          </div>
        )}
        
        {product.stock <= 5 && product.stock > 0 && (
          <div className="stock-badge limited">
            <i className="fas fa-fire"></i>
            LIMITED
          </div>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">₱{product.price.toLocaleString()}</p>
        <div className="product-stock">
          <span className={`stock-status ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}`}>
            <i className={`fas ${product.stock > 10 ? 'fa-check-circle' : product.stock > 0 ? 'fa-exclamation-triangle' : 'fa-times-circle'}`}></i>
            {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="product-actions">
          <motion.button
            className="add-to-cart-btn"
            onClick={() => handleAddToCartDirect(product)}
            disabled={loadingProducts.has(product.id) || product.stock === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="fas fa-shopping-cart"></i>
            {loadingProducts.has(product.id) ? 'Adding...' : 'Add to Cart'}
          </motion.button>
          
          <motion.button
            className="buy-now-btn"
            onClick={() => handleBuyNow(product)}
            disabled={product.stock === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="fas fa-bolt"></i>
            Buy Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="products-section">
      <div className="products-container">
        {!products || products.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <p className="loading-text">
              {!products ? 'Loading our amazing products...' : 'No products found. Please check back later.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              className="products-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} category="all" />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Landing Page Style Modal */}
      <AnimatePresence>
        {showModal && selectedProduct && (
          <motion.div 
            className="product-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div 
              className="product-modal-content"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal-btn" onClick={handleCloseModal}>
                <i className="fas fa-times"></i>
              </button>
              
              <div className="product-modal-body">
                <div className="product-modal-image">
                  <img
                    src={`http://localhost:8000/${selectedProduct.image}`}
                    alt={selectedProduct.name}
                    className="modal-product-image"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
                
                <div className="product-modal-info">
                  <h2 className="modal-product-name">{selectedProduct.name}</h2>
                  
                  <div className="modal-product-price">
                    ₱{selectedProduct.price.toLocaleString()}
                  </div>
                  
                  <div className="modal-product-description">
                    <h3>Product Description</h3>
                    <p>
                      {selectedProduct.description || 
                      `Premium quality ${selectedProduct.name.toLowerCase()} made with traditional craftsmanship and modern design. Each piece is carefully crafted to bring warmth and elegance to your home.`}
                    </p>
                  </div>
                  
                  <div className="modal-product-stock">
                    <span className={`stock-status ${selectedProduct.stock > 10 ? 'in-stock' : selectedProduct.stock > 0 ? 'low-stock' : 'out-of-stock'}`}>
                      <i className={`fas ${selectedProduct.stock > 10 ? 'fa-check-circle' : selectedProduct.stock > 0 ? 'fa-exclamation-triangle' : 'fa-times-circle'}`}></i>
                      {selectedProduct.stock > 10 ? 'In Stock' : selectedProduct.stock > 0 ? `Only ${selectedProduct.stock} left` : 'Out of Stock'}
                    </span>
                  </div>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  <Form className="mt-3">
                    <Form.Group>
                      <Form.Label className="fw-bold">
                        <i className="fas fa-calculator me-2"></i>
                        Quantity
                      </Form.Label>
                      <div className="quantity-controls">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                        <Form.Control
                          type="number"
                          min="1"
                          max={selectedProduct.stock}
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="text-center"
                          style={{ width: '60px' }}
                          size="sm"
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                          disabled={quantity >= selectedProduct.stock}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <Form.Text className="text-muted">
                        Total: ₱{(selectedProduct.price * quantity).toLocaleString()}
                      </Form.Text>
                    </Form.Group>
                  </Form>
                  
                  <div className="modal-action-buttons">
                    <motion.button 
                      className="modal-add-to-cart-btn"
                      onClick={handleAddToCart}
                      disabled={loadingProducts.has(selectedProduct.id) || selectedProduct.stock === 0}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className="fas fa-shopping-cart"></i>
                      {loadingProducts.has(selectedProduct.id) ? 'Adding...' : 'Add to Cart'}
                    </motion.button>
                    
                    <motion.button 
                      className="modal-buy-now-btn"
                      onClick={() => handleBuyNow(selectedProduct)}
                      disabled={selectedProduct.stock === 0}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className="fas fa-bolt"></i>
                      Buy Now
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="toast-notification"
          >
            <div className="toast-content">
              <div className="toast-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="toast-message">
                <div className="toast-title">Added to Cart!</div>
                <div className="toast-text">{toastMessage}</div>
              </div>
              <button 
                className="toast-close"
                onClick={() => setShowToast(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="toast-progress"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Now Modal */}
      <BuyNowModal
        show={showBuyNowModal}
        onClose={handleCloseBuyNowModal}
        product={buyNowProduct}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ProductCatalog);
