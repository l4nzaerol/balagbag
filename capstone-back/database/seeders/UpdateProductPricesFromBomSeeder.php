<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;

class UpdateProductPricesFromBomSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Updating product prices based on BOM calculations...');

        $products = Product::all();
        
        foreach ($products as $product) {
            // Skip Alkansya - it uses fixed pricing
            if (strtolower($product->name) === 'alkansya') {
                $this->command->info("Skipping {$product->name} - uses fixed pricing (₱{$product->price})");
                continue;
            }
            
            $bomPrice = $this->calculateBomPrice($product->id);
            
            if ($bomPrice) {
                $oldPrice = $product->price;
                $product->price = $bomPrice;
                $product->save();
                
                $this->command->info("Updated {$product->name}: ₱{$oldPrice} → ₱{$bomPrice}");
            } else {
                $this->command->warn("No BOM price calculated for {$product->name} - keeping original price ₱{$product->price}");
            }
        }
        
        $this->command->info('Product prices updated successfully!');
    }

    /**
     * Calculate BOM-based price for a product
     */
    private function calculateBomPrice($productId)
    {
        try {
            // Get product materials (BOM)
            $productMaterials = ProductMaterial::where('product_id', $productId)->get();

            if ($productMaterials->isEmpty()) {
                return null;
            }

            $materialCost = 0;

            foreach ($productMaterials as $pm) {
                $inventoryItem = InventoryItem::find($pm->inventory_item_id);
                
                if (!$inventoryItem || !$inventoryItem->unit_cost) {
                    continue;
                }

                $unitCost = $inventoryItem->unit_cost;
                $quantity = $pm->qty_per_unit;
                $itemCost = $unitCost * $quantity;
                
                $materialCost += $itemCost;
            }

            if ($materialCost == 0) {
                return null;
            }

            // Use default labor and profit margins based on product type
            $laborPercentage = $this->getLaborPercentage($productId);
            $profitMargin = $this->getProfitMargin($productId);

            // Calculate labor cost (percentage of material cost)
            $laborCost = $materialCost * ($laborPercentage / 100);

            // Calculate total production cost
            $productionCost = $materialCost + $laborCost;

            // Calculate suggested selling price with profit margin
            $suggestedPrice = $productionCost * (1 + ($profitMargin / 100));

            // Round to nearest peso
            return round($suggestedPrice, 2);

        } catch (\Exception $e) {
            \Log::error('Error calculating BOM price for product ' . $productId . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get labor percentage based on product type
     */
    private function getLaborPercentage($productId)
    {
        $product = Product::find($productId);
        if (!$product) {
            return 30; // Default
        }

        $productName = strtolower($product->name);
        
        if (strpos($productName, 'alkansya') !== false) {
            return 25; // Alkansya: 25% labor
        } elseif (strpos($productName, 'table') !== false) {
            return 40; // Table: 40% labor
        } elseif (strpos($productName, 'chair') !== false) {
            return 35; // Chair: 35% labor
        }
        
        return 30; // Default
    }

    /**
     * Get profit margin based on product type
     */
    private function getProfitMargin($productId)
    {
        $product = Product::find($productId);
        if (!$product) {
            return 25; // Default
        }

        $productName = strtolower($product->name);
        
        if (strpos($productName, 'alkansya') !== false) {
            return 30; // Alkansya: 30% profit
        } elseif (strpos($productName, 'table') !== false) {
            return 35; // Table: 35% profit
        } elseif (strpos($productName, 'chair') !== false) {
            return 30; // Chair: 30% profit
        }
        
        return 25; // Default
    }
}
