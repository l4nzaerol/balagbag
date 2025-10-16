<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductMaterial;
use Carbon\Carbon;

class EnhancedInventorySeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Creating enhanced inventory system with proper stock management...');

        // Create all inventory items with realistic stock levels
        $this->createInventoryItems();
        
        // Create BOM relationships
        $this->createBOMRelationships();
        
        $this->command->info('✅ Enhanced inventory system created successfully!');
    }

    private function createInventoryItems()
    {
        $this->command->info('📦 Creating inventory items with realistic stock levels...');

        $items = [
            // ========================================
            // === ALKANSYA RAW MATERIALS ===
            // ========================================
            [
                'sku' => 'PW-1x4x8',
                'name' => 'Pinewood 1x4x8ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 100.00,
                'description' => 'Pine wood board 1x4x8 ft (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 500,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'PLY-4.2-4x8',
                'name' => 'Plywood 4.2mm 4x8ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 100.00,
                'description' => 'Plywood sheet 4.2mm thickness 4x8 ft (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 500,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'ACR-1.5-4x8',
                'name' => 'Acrylic 1.5mm 4x8ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 120.00,
                'description' => 'Acrylic sheet 1.5mm thickness 4x8 ft (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 500,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'PN-F30',
                'name' => 'Pin Nail F30',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 100.00,
                'description' => 'F30 pin nails (1000 pcs per box) (for Alkansya)',
                'quantity_on_hand' => 300000, // Large quantity for small items + 2 weeks buffer + testing
                'safety_stock' => 5000,
                'reorder_point' => 20000,
                'max_level' => 100000,
            ],
            [
                'sku' => 'BS-1.5',
                'name' => 'Black Screw 1 1/2',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 90.00,
                'description' => 'Black screw 1.5 inch (500 pcs per box) (for Alkansya)',
                'quantity_on_hand' => 100000, // Large quantity for small items + 2 weeks buffer + testing
                'safety_stock' => 2000,
                'reorder_point' => 10000,
                'max_level' => 50000,
            ],
            [
                'sku' => 'STKW-250',
                'name' => 'Stikwell 250',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 60.00,
                'description' => 'Stikwell adhesive 250ml (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 500,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'GRP-4-120',
                'name' => 'Grinder pad 4inch 120 grit',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 30.00,
                'description' => 'Grinding pad 4 inch, 120 grit (for Alkansya)',
                'quantity_on_hand' => 40000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 500,
                'reorder_point' => 2000,
                'max_level' => 10000,
            ],
            [
                'sku' => 'STK-24-W',
                'name' => 'Sticker 24 inch Car Decals - White',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 300.00,
                'description' => 'White sticker roll, 24 inch x 50m (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 100,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'STK-24-B',
                'name' => 'Sticker 24 inch Car Decals - Black',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 300.00,
                'description' => 'Black sticker roll, 24 inch x 50m (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 100,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'TFT-24',
                'name' => 'Transfer Tape 24 inch',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 180.00,
                'description' => 'Transfer tape, 24 inch x 50m (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 100,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'TAPE-2-300',
                'name' => 'TAPE 2 inch 300m',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 50.00,
                'description' => 'General packing tape, 2 inch x 300 m (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 200,
                'reorder_point' => 2000,
                'max_level' => 10000,
            ],
            [
                'sku' => 'FRAG-2-300',
                'name' => 'Fragile Tape 2 inch 300m',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 60.00,
                'description' => 'Fragile tape, 2 inch x 300 m (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 200,
                'reorder_point' => 2000,
                'max_level' => 10000,
            ],
            [
                'sku' => 'BWRAP-40-100',
                'name' => 'Bubble Wrap 40 inch x 100 m',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 180.00,
                'description' => 'Bubble wrap roll 40 inch width x 100 m length (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 100,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            [
                'sku' => 'INS-8-40-100',
                'name' => 'Insulation 8mm 40 inch x 100 m',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 210.00,
                'description' => 'Insulation foam 8mm, 40 inch width x 100 m length (for Alkansya)',
                'quantity_on_hand' => 20000, // Increased for 3 months production + 2 weeks buffer + testing
                'safety_stock' => 100,
                'reorder_point' => 1000,
                'max_level' => 5000,
            ],
            
            // ========================================
            // === DINING TABLE MATERIALS ===
            // ========================================
            [
                'sku' => 'HW-MAHOG-2x4x8',
                'name' => 'Mahogany Hardwood 2x4x8ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 420.00,
                'description' => 'Mahogany hardwood lumber 2x4x8 ft (for Table Legs)',
                'quantity_on_hand' => 500,
                'safety_stock' => 50,
                'reorder_point' => 100,
                'max_level' => 1000,
            ],
            [
                'sku' => 'HW-MAHOG-1x6x10',
                'name' => 'Mahogany Hardwood 1x6x10ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 580.00,
                'description' => 'Mahogany hardwood board 1x6x10 ft (for Table Top)',
                'quantity_on_hand' => 300,
                'safety_stock' => 30,
                'reorder_point' => 60,
                'max_level' => 600,
            ],
            [
                'sku' => 'PLY-18-4x8',
                'name' => 'Plywood 18mm 4x8ft',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 850.00,
                'description' => 'Plywood sheet 18mm thickness 4x8 ft (for Table Base)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'WS-3',
                'name' => 'Wood Screws 3 inch',
                'category' => 'raw',
                'unit' => 'box',
                'unit_cost' => 320.00,
                'description' => 'Wood screws 3 inch (200 pcs per box) (for Table Assembly)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'WG-500',
                'name' => 'Wood Glue 500ml',
                'category' => 'raw',
                'unit' => 'bottle',
                'unit_cost' => 145.00,
                'description' => 'Wood glue 500ml (for Table Joints)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'SAND-80',
                'name' => 'Sandpaper 80 Grit',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 8.00,
                'description' => 'Sandpaper 80 grit (for Table Rough Sanding)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'SAND-120',
                'name' => 'Sandpaper 120 Grit',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 8.00,
                'description' => 'Sandpaper 120 grit (for Table Fine Sanding)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'SAND-220',
                'name' => 'Sandpaper 220 Grit',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 10.00,
                'description' => 'Sandpaper 220 grit (for Table Finishing)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'STAIN-WALNUT-1L',
                'name' => 'Wood Stain Walnut 1 Liter',
                'category' => 'raw',
                'unit' => 'liter',
                'unit_cost' => 380.00,
                'description' => 'Walnut wood stain 1 liter (for Table Coloring)',
                'quantity_on_hand' => 100,
                'safety_stock' => 10,
                'reorder_point' => 20,
                'max_level' => 200,
            ],
            [
                'sku' => 'POLY-GLOSS-1L',
                'name' => 'Polyurethane Gloss 1 Liter',
                'category' => 'raw',
                'unit' => 'liter',
                'unit_cost' => 420.00,
                'description' => 'Polyurethane gloss finish 1 liter (for Table Protection)',
                'quantity_on_hand' => 100,
                'safety_stock' => 10,
                'reorder_point' => 20,
                'max_level' => 200,
            ],
            [
                'sku' => 'TBRACKET-METAL',
                'name' => 'Metal Table Brackets',
                'category' => 'raw',
                'unit' => 'set',
                'unit_cost' => 180.00,
                'description' => 'Metal corner brackets (4 pcs per set) for table reinforcement',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'FELT-PAD-LG',
                'name' => 'Felt Pads Large',
                'category' => 'raw',
                'unit' => 'pack',
                'unit_cost' => 45.00,
                'description' => 'Large felt pads (8 pcs per pack) for table leg protection',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            
            // ========================================
            // === WOODEN CHAIR MATERIALS ===
            // ========================================
            [
                'sku' => 'HW-MAHOG-2x2x6',
                'name' => 'Mahogany Hardwood 2x2x6ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 280.00,
                'description' => 'Mahogany hardwood lumber 2x2x6 ft (for Chair Legs)',
                'quantity_on_hand' => 600,
                'safety_stock' => 60,
                'reorder_point' => 120,
                'max_level' => 1200,
            ],
            [
                'sku' => 'HW-MAHOG-1x4x6',
                'name' => 'Mahogany Hardwood 1x4x6ft',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 320.00,
                'description' => 'Mahogany hardwood board 1x4x6 ft (for Chair Backrest)',
                'quantity_on_hand' => 400,
                'safety_stock' => 40,
                'reorder_point' => 80,
                'max_level' => 800,
            ],
            [
                'sku' => 'PLY-12-2x4',
                'name' => 'Plywood 12mm 2x4ft',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 280.00,
                'description' => 'Plywood sheet 12mm thickness 2x4 ft (for Chair Seat Base)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'WS-2.5',
                'name' => 'Wood Screws 2.5 inch',
                'category' => 'raw',
                'unit' => 'box',
                'unit_cost' => 280.00,
                'description' => 'Wood screws 2.5 inch (200 pcs per box) (for Chair Assembly)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'WD-8MM',
                'name' => 'Wood Dowels 8mm',
                'category' => 'raw',
                'unit' => 'piece',
                'unit_cost' => 5.00,
                'description' => 'Wood dowels 8mm diameter x 36 inches (for Chair Joints)',
                'quantity_on_hand' => 2000,
                'safety_stock' => 200,
                'reorder_point' => 400,
                'max_level' => 4000,
            ],
            [
                'sku' => 'FOAM-CUSHION-2',
                'name' => 'Foam Cushion 2 inch',
                'category' => 'raw',
                'unit' => 'sheet',
                'unit_cost' => 380.00,
                'description' => 'High-density foam cushion 2 inch (2x4 ft sheet) (for Chair Seat)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'FABRIC-UPHOLSTERY',
                'name' => 'Upholstery Fabric',
                'category' => 'raw',
                'unit' => 'yard',
                'unit_cost' => 220.00,
                'description' => 'Durable upholstery fabric per yard (for Chair Covering)',
                'quantity_on_hand' => 400,
                'safety_stock' => 40,
                'reorder_point' => 80,
                'max_level' => 800,
            ],
            [
                'sku' => 'STAPLES-UPHOLSTERY',
                'name' => 'Upholstery Staples',
                'category' => 'raw',
                'unit' => 'box',
                'unit_cost' => 95.00,
                'description' => 'Heavy-duty upholstery staples (1000 pcs per box) (for Chair Fabric)',
                'quantity_on_hand' => 1000,
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
            ],
            [
                'sku' => 'WG-250',
                'name' => 'Wood Glue 250ml',
                'category' => 'raw',
                'unit' => 'bottle',
                'unit_cost' => 85.00,
                'description' => 'Wood glue 250ml (for Chair Joints)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'STAIN-WALNUT-500',
                'name' => 'Wood Stain Walnut 500ml',
                'category' => 'raw',
                'unit' => 'bottle',
                'unit_cost' => 220.00,
                'description' => 'Walnut wood stain 500ml (for Chair Finish)',
                'quantity_on_hand' => 100,
                'safety_stock' => 10,
                'reorder_point' => 20,
                'max_level' => 200,
            ],
            [
                'sku' => 'LACQUER-SPRAY',
                'name' => 'Lacquer Spray Clear',
                'category' => 'raw',
                'unit' => 'can',
                'unit_cost' => 180.00,
                'description' => 'Clear lacquer spray 400ml (for Chair Protection)',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
            [
                'sku' => 'FELT-PAD-SM',
                'name' => 'Felt Pads Small',
                'category' => 'raw',
                'unit' => 'pack',
                'unit_cost' => 35.00,
                'description' => 'Small felt pads (8 pcs per pack) for chair leg protection',
                'quantity_on_hand' => 200,
                'safety_stock' => 20,
                'reorder_point' => 40,
                'max_level' => 400,
            ],
        ];

        foreach ($items as $item) {
            // Determine appropriate status for raw materials
            $status = 'in_stock';
            if (isset($item['quantity_on_hand']) && $item['quantity_on_hand'] <= 0) {
                $status = 'out_of_stock';
            } elseif (isset($item['reorder_point']) && isset($item['quantity_on_hand']) && $item['quantity_on_hand'] <= $item['reorder_point']) {
                $status = 'reorder_now';
            }
            
            InventoryItem::updateOrCreate(
                ['sku' => $item['sku']],
                array_merge($item, [
                    'location' => 'Windfield 2',
                    'lead_time_days' => 7,
                    'status' => $status,
                ])
            );
        }

        // Create finished goods
        $finishedGoods = [
            [
                'sku' => 'FG-ALKANSYA',
                'name' => 'Alkansya (Finished Good)',
                'category' => 'finished',
                'status' => 'in_stock', // Initial stock for testing and manual orders
                'location' => 'Windfield 2',
                'unit' => 'piece',
                'unit_cost' => 150.00,
                'supplier' => 'In-House Production',
                'description' => 'Completed Alkansya ready for sale',
                'quantity_on_hand' => 1000, // Initial stock for testing and manual orders
                'safety_stock' => 100,
                'reorder_point' => 200,
                'max_level' => 2000,
                'lead_time_days' => 7,
            ],
            [
                'sku' => 'FG-DINING-TABLE',
                'name' => 'Dining Table (Made-to-Order)',
                'category' => 'made-to-order',
                'status' => 'not_in_production',
                'production_status' => 'not_in_production',
                'production_count' => 0,
                'location' => 'Windfield 2',
                'unit' => 'piece',
                'unit_cost' => 2500.00,
                'supplier' => 'In-House Production',
                'description' => 'Completed Dining Table ready for sale',
                'quantity_on_hand' => 0,
                'safety_stock' => 5,
                'reorder_point' => 10,
                'max_level' => 50,
                'lead_time_days' => 14,
            ],
            [
                'sku' => 'FG-WOODEN-CHAIR',
                'name' => 'Wooden Chair (Made-to-Order)',
                'category' => 'made-to-order',
                'status' => 'not_in_production',
                'production_status' => 'not_in_production',
                'production_count' => 0,
                'location' => 'Windfield 2',
                'unit' => 'piece',
                'unit_cost' => 1200.00,
                'supplier' => 'In-House Production',
                'description' => 'Completed Wooden Chair ready for sale',
                'quantity_on_hand' => 0,
                'safety_stock' => 10,
                'reorder_point' => 20,
                'max_level' => 100,
                'lead_time_days' => 10,
            ],
        ];

        foreach ($finishedGoods as $item) {
            InventoryItem::updateOrCreate(
                ['sku' => $item['sku']],
                $item
            );
        }

        $this->command->info('✅ Enhanced inventory items created successfully!');
    }

    private function createBOMRelationships()
    {
        $this->command->info('🔗 Creating BOM relationships...');

        // Get products
        $diningTable = Product::where('name', 'Dining Table')->first();
        $woodenChair = Product::where('name', 'Wooden Chair')->first();
        $alkansya = Product::where('name', 'Alkansya')->first();

        if (!$diningTable || !$woodenChair || !$alkansya) {
            $this->command->error('Products not found. Please run ProductsTableSeeder first.');
            return;
        }

        // Dining Table BOM
        $tableMaterials = [
            ['sku' => 'HW-MAHOG-2x4x8', 'quantity' => 4],
            ['sku' => 'HW-MAHOG-1x6x10', 'quantity' => 6],
            ['sku' => 'PLY-18-4x8', 'quantity' => 1],
            ['sku' => 'TBRACKET-METAL', 'quantity' => 1],
            ['sku' => 'WS-3', 'quantity' => 32],
            ['sku' => 'WG-500', 'quantity' => 1],
            ['sku' => 'SAND-80', 'quantity' => 4],
            ['sku' => 'SAND-120', 'quantity' => 6],
            ['sku' => 'SAND-220', 'quantity' => 4],
            ['sku' => 'STAIN-WALNUT-1L', 'quantity' => 0.3],
            ['sku' => 'POLY-GLOSS-1L', 'quantity' => 0.4],
            ['sku' => 'FELT-PAD-LG', 'quantity' => 1],
        ];

        foreach ($tableMaterials as $material) {
            $inventoryItem = InventoryItem::where('sku', $material['sku'])->first();
            if ($inventoryItem) {
                ProductMaterial::updateOrCreate(
                    [
                        'product_id' => $diningTable->id,
                        'inventory_item_id' => $inventoryItem->id,
                    ],
                    ['qty_per_unit' => $material['quantity']]
                );
            }
        }

        // Wooden Chair BOM
        $chairMaterials = [
            ['sku' => 'HW-MAHOG-2x2x6', 'quantity' => 4],
            ['sku' => 'HW-MAHOG-1x4x6', 'quantity' => 3],
            ['sku' => 'PLY-12-2x4', 'quantity' => 1],
            ['sku' => 'WS-2.5', 'quantity' => 24],
            ['sku' => 'WD-8MM', 'quantity' => 8],
            ['sku' => 'WG-250', 'quantity' => 1],
            ['sku' => 'FOAM-CUSHION-2', 'quantity' => 1],
            ['sku' => 'FABRIC-UPHOLSTERY', 'quantity' => 1.5],
            ['sku' => 'STAPLES-UPHOLSTERY', 'quantity' => 50],
            ['sku' => 'SAND-80', 'quantity' => 2],
            ['sku' => 'SAND-120', 'quantity' => 3],
            ['sku' => 'SAND-220', 'quantity' => 2],
            ['sku' => 'STAIN-WALNUT-500', 'quantity' => 0.3],
            ['sku' => 'LACQUER-SPRAY', 'quantity' => 1],
            ['sku' => 'FELT-PAD-SM', 'quantity' => 1],
        ];

        foreach ($chairMaterials as $material) {
            $inventoryItem = InventoryItem::where('sku', $material['sku'])->first();
            if ($inventoryItem) {
                ProductMaterial::updateOrCreate(
                    [
                        'product_id' => $woodenChair->id,
                        'inventory_item_id' => $inventoryItem->id,
                    ],
                    ['qty_per_unit' => $material['quantity']]
                );
            }
        }

        // Alkansya BOM (based on exact specifications from BOM of Alkansya.txt)
        $alkansyaMaterials = [
            // Core structural materials (1:1 ratio)
            ['sku' => 'PW-1x4x8', 'quantity' => 1], // Pinewood 1x4x8ft - 1 piece per alkansya
            ['sku' => 'PLY-4.2-4x8', 'quantity' => 1], // Plywood 4.2mm 4x8ft - 1 piece per alkansya
            ['sku' => 'ACR-1.5-4x8', 'quantity' => 1], // Acrylic 1.5mm 4x8ft - 1 piece per alkansya
            
            // Fasteners (exact quantities)
            ['sku' => 'PN-F30', 'quantity' => 24], // Pin Nail F30 - 24 pcs nails per alkansya
            ['sku' => 'BS-1.5', 'quantity' => 4], // Black Screw 1 1/2 - 4 pcs screw per alkansya
            
            // Adhesives and processing materials (fractional consumption)
            ['sku' => 'STKW-250', 'quantity' => 0.025], // Stikwell 250 - 1 piece per 40 alkansya (1/40)
            ['sku' => 'GRP-4-120', 'quantity' => 0.05], // Grinder pad - 20 alkansya per 1 piece (1/20)
            
            // Decorative materials (1:1 ratio)
            ['sku' => 'STK-24-W', 'quantity' => 1], // Sticker 24 inch Car Decals - 1 piece per alkansya
            ['sku' => 'TFT-24', 'quantity' => 0.0033], // Transfer Tape - 300 alkansya per piece (1/300)
            
            // Packaging materials (fractional consumption)
            ['sku' => 'TAPE-2-300', 'quantity' => 0.005], // TAPE 2 inch 300m - 200 alkansya per 1 piece (1/200)
            ['sku' => 'BWRAP-40-100', 'quantity' => 1], // Bubble Wrap 40 inch x 100m - 1 piece per alkansya
            ['sku' => 'INS-8-40-100', 'quantity' => 1], // Insulation 8mm 40 inch x 100m - 1 piece per alkansya
        ];

        foreach ($alkansyaMaterials as $material) {
            $inventoryItem = InventoryItem::where('sku', $material['sku'])->first();
            if ($inventoryItem) {
                ProductMaterial::updateOrCreate(
                    [
                        'product_id' => $alkansya->id,
                        'inventory_item_id' => $inventoryItem->id,
                    ],
                    ['qty_per_unit' => $material['quantity']]
                );
            }
        }

        $this->command->info('✅ Enhanced BOM relationships created successfully!');
    }
}
