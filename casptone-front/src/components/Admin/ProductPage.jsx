import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductsTable from "./AdminProductsTable";
import api from "../../api/client";
import { motion } from "framer-motion";
import { Modal, Button, Form, Table, Alert } from "react-bootstrap"; //
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "sonner";
import AppLayout from "../Header";

const ProductPage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);
  const [refreshProducts, setRefreshProducts] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  
  // Price Calculator States
  const [priceCalculation, setPriceCalculation] = useState(null);
  const [laborPercentage, setLaborPercentage] = useState(30);
  const [profitMargin, setProfitMargin] = useState(25);
  const [calculating, setCalculating] = useState(false);

  const navigate = useNavigate();

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (showAddModal) {
      fetchInventoryItems();
    }
  }, [showAddModal]);

  const fetchInventoryItems = async () => {
    try {
      const response = await api.get("/inventory");
      setInventoryItems(response.data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const handleAddBomItem = () => {
    setShowMaterialSelector(true);
  };

  const handleMaterialToggle = (materialId) => {
    if (selectedMaterials.includes(materialId)) {
      setSelectedMaterials(selectedMaterials.filter(id => id !== materialId));
    } else {
      setSelectedMaterials([...selectedMaterials, materialId]);
    }
  };

  const handleConfirmMaterials = () => {
    const newBomItems = selectedMaterials.map(materialId => ({
      inventory_item_id: materialId,
      qty_per_unit: "1"
    }));
    setBomItems([...bomItems, ...newBomItems]);
    setSelectedMaterials([]);
    setShowMaterialSelector(false);
  };

  const handleRemoveBomItem = (index) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleBomItemChange = (index, field, value) => {
    const updated = [...bomItems];
    updated[index][field] = value;
    setBomItems(updated);
  };

  // Calculate price based on BOM
  const calculatePrice = async () => {
    if (bomItems.length === 0) {
      setPriceCalculation(null);
      return;
    }

    setCalculating(true);
    try {
      const materialsForCalc = bomItems
        .filter(item => item.inventory_item_id && item.qty_per_unit > 0)
        .map(item => {
          const material = inventoryItems.find(m => m.id === parseInt(item.inventory_item_id));
          return {
            sku: material?.sku,
            quantity: parseFloat(item.qty_per_unit)
          };
        })
        .filter(m => m.sku);

      if (materialsForCalc.length === 0) {
        setPriceCalculation(null);
        return;
      }

      const response = await api.post('/price-calculator/calculate', {
        materials: materialsForCalc,
        labor_percentage: laborPercentage,
        profit_margin: profitMargin
      });

      setPriceCalculation(response.data);
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-calculate when BOM changes
  useEffect(() => {
    if (showAddModal && bomItems.length > 0) {
      const timer = setTimeout(() => calculatePrice(), 500);
      return () => clearTimeout(timer);
    } else {
      setPriceCalculation(null);
    }
  }, [bomItems, laborPercentage, profitMargin, showAddModal]);

  // Auto-suggest price when calculation is available and price field is empty
  useEffect(() => {
    if (priceCalculation && !newProduct.price) {
      setNewProduct({ ...newProduct, price: Math.round(priceCalculation.suggested_price) });
    }
  }, [priceCalculation]);

  // Apply suggested price
  const applySuggestedPrice = () => {
    if (priceCalculation) {
      setNewProduct({ ...newProduct, price: Math.round(priceCalculation.suggested_price) });
    }
  };

  // Auto-suggest price when user focuses on price field
  const handlePriceFieldFocus = () => {
    if (priceCalculation && !newProduct.price) {
      setNewProduct({ ...newProduct, price: Math.round(priceCalculation.suggested_price) });
    }
  };

  // Auto-suggest price when user starts typing in price field
  const handlePriceFieldChange = (e) => {
    const { value } = e.target;
    setNewProduct({ ...newProduct, price: value });
    
    // If price field is empty and we have a calculation, suggest the price
    if (!value && priceCalculation) {
      setTimeout(() => {
        setNewProduct({ ...newProduct, price: Math.round(priceCalculation.suggested_price) });
      }, 100);
    }
  };

  const getInventoryItemName = (id) => {
    const item = inventoryItems.find(item => item.id === parseInt(id));
    return item ? `${item.name} (${item.sku})` : "Unknown";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddProduct = async () => {
    // Basic client-side validation
    if (!newProduct.name?.trim() || !newProduct.price || !newProduct.stock) {
      toast.error("Product Creation Failed", {
        description: "Please fill in Name, Price, and Stock fields.",
        duration: 4000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#dc2626'
        }
      });
      return;
    }

    // Validate BOM items if any are added
    const validBomItems = bomItems.filter(
      item => item.inventory_item_id && item.qty_per_unit && item.qty_per_unit > 0
    );

    setLoading(true);
    try {
      // Create product first
      const productResponse = await api.post("/products", {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
      });

      // If valid BOM items exist, save them
      if (validBomItems.length > 0) {
        const bomData = validBomItems.map(item => ({
          inventory_item_id: parseInt(item.inventory_item_id),
          qty_per_unit: parseInt(item.qty_per_unit)
        }));
        
        await api.post(`/products/${productResponse.data.id}/materials`, {
          items: bomData
        });
      }

      setShowAddModal(false);
      setNewProduct({ name: "", description: "", price: "", stock: "", image: "" });
      setBomItems([]);
      setRefreshProducts((prev) => !prev);
      
      // Unique success toast for product creation
      toast.success("🎉 Product Created Successfully!", {
        description: validBomItems.length > 0 
          ? `"${newProduct.name}" has been added with ${validBomItems.length} material(s) configured.`
          : `"${newProduct.name}" has been added to the product catalog.`,
        duration: 5000,
        style: {
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#166534'
        }
      });
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("❌ Product Creation Failed", {
        description: "Unable to create the product. Please check your inputs and try again.",
        duration: 5000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#dc2626'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
    <div className="container-fluid py-4 wood-animated" role="region" aria-labelledby="prod-track-heading">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* Back Button */}
        <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>

        {/* Page Header */}
        <div className="text-center mb-4">
          <h2 id="prod-heading" className="fw-bold">Unick Furniture Products</h2>

        </div>

        {/* Content */}
        <div className="card shadow-lg border-0 wood-card">
  <div className="card-header d-flex justify-content-between align-items-center wood-header">
    <h5 className="mb-0 fw-bold">📦 Product List</h5>
    <button className="btn btn-light btn-sm btn-wood" onClick={() => setShowAddModal(true)}>
      + Add Product
    </button>
  </div>
  <div className="card-body">
    <AdminProductsTable key={refreshProducts} />
  </div>
</div>


        {/* ✅ Functional Modal with React-Bootstrap */}
        <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setBomItems([]); }} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Add New Product</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Product Name *</Form.Label>
                <Form.Control required type="text" name="name" value={newProduct.name} onChange={handleInputChange} placeholder="e.g., Oak Chair" />
              </Form.Group>
              
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Price *</Form.Label>
                    <div className="input-group">
                      <Form.Control 
                        required 
                        min="0" 
                        step="0.01" 
                        type="number" 
                        name="price" 
                        value={newProduct.price} 
                        onChange={handlePriceFieldChange}
                        onFocus={handlePriceFieldFocus}
                        placeholder={priceCalculation ? `Suggested: ₱${Math.round(priceCalculation.suggested_price)}` : "0.00"}
                        className={priceCalculation ? "border-success" : ""}
                      />
                      {priceCalculation && newProduct.price && (
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => setNewProduct({ ...newProduct, price: "" })}
                          title="Clear price"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    {priceCalculation && (
                      <Form.Text className="text-success small">
                        💡 Suggested price: ₱{Math.round(priceCalculation.suggested_price)} (auto-calculated from BOM)
                        <br />
                        <small className="text-muted">
                          Material: ₱{priceCalculation.material_cost.toFixed(2)} + 
                          Labor: ₱{priceCalculation.labor_cost.toFixed(2)} + 
                          Profit: ₱{priceCalculation.profit_amount.toFixed(2)}
                        </small>
                      </Form.Text>
                    )}
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Stock *</Form.Label>
                    <Form.Control required min="0" step="1" type="number" name="stock" value={newProduct.stock} onChange={handleInputChange} placeholder="0" />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Description</Form.Label>
                <Form.Control as="textarea" rows={2} name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Optional description" />
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold">Image URL</Form.Label>
                <Form.Control type="text" name="image" value={newProduct.image} onChange={handleInputChange} placeholder="https://..." />
              </Form.Group>

              {/* BOM Section - Always Visible */}
              <div className="border-top pt-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold">📦 Materials Needed (BOM)</h6>
                  <Button variant="success" size="sm" onClick={handleAddBomItem}>
                    + Add Materials
                  </Button>
                </div>

                {/* Material Selector Modal */}
                {showMaterialSelector && (
                  <div className="card mb-3 border-success">
                    <div className="card-header bg-success text-white">
                      <strong>Select Materials</strong>
                      <span className="float-end small">
                        {selectedMaterials.length} selected
                      </span>
                    </div>
                    <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {inventoryItems.length === 0 ? (
                        <p className="text-muted text-center">No inventory items available</p>
                      ) : (
                        <div className="row">
                          {inventoryItems.map(item => (
                            <div key={item.id} className="col-md-6 mb-2">
                              <Form.Check
                                type="checkbox"
                                id={`material-${item.id}`}
                                label={`${item.name} (${item.sku}) - ${item.unit}`}
                                checked={selectedMaterials.includes(item.id)}
                                onChange={() => handleMaterialToggle(item.id)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="card-footer d-flex justify-content-end gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => { setShowMaterialSelector(false); setSelectedMaterials([]); }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={handleConfirmMaterials}
                        disabled={selectedMaterials.length === 0}
                      >
                        Add {selectedMaterials.length} Material{selectedMaterials.length !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                )}
                
                {bomItems.length === 0 ? (
                  <Alert variant="light" className="text-center small mb-0">
                    <span className="text-muted">No materials added. Click "+ Add Materials" to select multiple materials at once.</span>
                  </Alert>
                ) : (
                  <Table bordered hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '60%' }}>Material</th>
                        <th style={{ width: '30%' }}>Quantity per Unit</th>
                        <th style={{ width: '10%' }} className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item, index) => {
                        const material = inventoryItems.find(inv => inv.id === parseInt(item.inventory_item_id));
                        return (
                          <tr key={index}>
                            <td className="align-middle">
                              <strong>{material ? material.name : 'Unknown Material'}</strong>
                              {material && (
                                <div className="small text-muted">
                                  {material.sku} - {material.unit}
                                </div>
                              )}
                            </td>
                            <td className="align-middle">
                              <Form.Control
                                size="sm"
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={item.qty_per_unit == null || item.qty_per_unit === '' ? '' : 
                                  (parseFloat(item.qty_per_unit) === Math.floor(parseFloat(item.qty_per_unit)) ? 
                                    parseFloat(item.qty_per_unit).toString() : 
                                    parseFloat(item.qty_per_unit).toString().replace(/\.?0+$/, ''))}
                                onChange={(e) => handleBomItemChange(index, 'qty_per_unit', e.target.value)}
                                placeholder="Qty"
                                style={{ maxWidth: '120px' }}
                              />
                            </td>
                            <td className="align-middle text-center">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveBomItem(index)}
                                title="Remove material"
                              >
                                🗑️
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}

                {/* Price Calculator Section */}
                {bomItems.length > 0 && (
                  <div className="mt-4 border-top pt-3">
                    <h6 className="mb-3">💰 Price Calculator</h6>
                    
                    {/* Pricing Controls */}
                    <div className="row g-2 mb-3">
                      <div className="col-md-3">
                        <Form.Label className="small">Preset</Form.Label>
                        <Form.Select 
                          size="sm"
                          onChange={(e) => {
                            const presets = {
                              alkansya: { labor: 25, profit: 30 },
                              table: { labor: 40, profit: 35 },
                              chair: { labor: 35, profit: 30 },
                              custom: { labor: 30, profit: 25 }
                            };
                            const preset = presets[e.target.value];
                            if (preset) {
                              setLaborPercentage(preset.labor);
                              setProfitMargin(preset.profit);
                            }
                          }}
                        >
                          <option value="custom">Custom</option>
                          <option value="alkansya">Alkansya (25% labor, 30% profit)</option>
                          <option value="table">Table (40% labor, 35% profit)</option>
                          <option value="chair">Chair (35% labor, 30% profit)</option>
                        </Form.Select>
                      </div>
                      <div className="col-md-3">
                        <Form.Label className="small">Labor %</Form.Label>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={laborPercentage}
                          onChange={(e) => setLaborPercentage(Number(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-md-3">
                        <Form.Label className="small">Profit %</Form.Label>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(Number(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-md-3 d-flex align-items-end">
                        <Button 
                          variant="primary"
                          size="sm"
                          className="w-100"
                          onClick={calculatePrice}
                          disabled={calculating}
                        >
                          {calculating ? 'Calculating...' : 'Calculate'}
                        </Button>
                      </div>
                    </div>

                    {/* Price Breakdown Display */}
                    {priceCalculation && (
                      <div className="card border-success">
                        <div className="card-header bg-success text-white">
                          <strong>💰 Suggested Pricing</strong>
                        </div>
                        <div className="card-body">
                          <table className="table table-sm mb-0">
                            <tbody>
                              <tr>
                                <td>Material Cost:</td>
                                <td className="text-end">
                                  <strong>₱{priceCalculation.material_cost.toFixed(2)}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>Labor ({priceCalculation.labor_percentage}%):</td>
                                <td className="text-end">₱{priceCalculation.labor_cost.toFixed(2)}</td>
                              </tr>
                              <tr className="table-active">
                                <td><strong>Production Cost:</strong></td>
                                <td className="text-end">
                                  <strong>₱{priceCalculation.production_cost.toFixed(2)}</strong>
                                </td>
                              </tr>
                              <tr>
                                <td>Profit ({priceCalculation.profit_margin}%):</td>
                                <td className="text-end text-success">
                                  +₱{priceCalculation.profit_amount.toFixed(2)}
                                </td>
                              </tr>
                              <tr className="table-success">
                                <td><strong>Suggested Selling Price:</strong></td>
                                <td className="text-end">
                                  <strong className="fs-5 text-success">
                                    ₱{Math.round(priceCalculation.suggested_price)}
                                  </strong>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <div className="mt-3">
                            <Button
                              variant="success"
                              size="sm"
                              className="w-100"
                              onClick={applySuggestedPrice}
                            >
                              ✓ Use This Price (₱{Math.round(priceCalculation.suggested_price)})
                            </Button>
                          </div>

                          <div className="mt-2 p-2 bg-light rounded">
                            <small className="text-muted">
                              <strong>Break-even:</strong> ₱{priceCalculation.production_cost.toFixed(2)} • 
                              <strong> Profit Margin:</strong> {((priceCalculation.profit_amount / priceCalculation.production_cost) * 100).toFixed(1)}%
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculating && (
                      <Alert variant="info" className="mb-0">
                        <div className="spinner-border spinner-border-sm me-2"></div>
                        Calculating price...
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </Form>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setBomItems([]); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddProduct} disabled={loading}>
              {loading ? "Saving..." : "Save Product"}
            </Button>
          </Modal.Footer>
        </Modal>
      </motion.div>
    </div>
    </AppLayout>
  );
};

export default ProductPage;
