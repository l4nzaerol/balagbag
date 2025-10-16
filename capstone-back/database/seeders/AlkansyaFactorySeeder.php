<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AlkansyaDailyOutput;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Models\ProductionAnalytics;
use Carbon\Carbon;

class AlkansyaFactorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 3 months of Alkansya daily output data using factory
     */
    public function run(): void
    {
        $this->command->info('🌱 Seeding 3 months of Alkansya daily output data using factory...');

        // Get Alkansya product
        $alkansyaProduct = Product::where('name', 'Alkansya')->first();
        if (!$alkansyaProduct) {
            $this->command->error('❌ Alkansya product not found. Please run ProductSeeder first.');
            return;
        }

        // Get Alkansya BOM materials
        $bomMaterials = ProductMaterial::where('product_id', $alkansyaProduct->id)
            ->with('inventoryItem')
            ->get();

        if ($bomMaterials->isEmpty()) {
            $this->command->error('❌ No BOM materials found for Alkansya. Please run ProductMaterialSeeder first.');
            return;
        }

        // Create 3 months of data
        $startDate = Carbon::now()->subMonths(3);
        $endDate = Carbon::now();

        $this->command->info("📅 Creating data from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");

        // Track stock levels to prevent negative inventory
        $stockLevels = [];
        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $stockLevels[$inventoryItem->id] = $inventoryItem->quantity_on_hand;
        }

        $totalCreated = 0;
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($currentDate->dayOfWeek !== 6 && $currentDate->dayOfWeek !== 0) {
                $result = $this->createDailyOutputWithFactory($currentDate, $bomMaterials, $stockLevels);
                if ($result) {
                    $totalCreated++;
                }
            }
            
            $currentDate->addDay();
        }

        $this->command->info("✅ Created {$totalCreated} days of Alkansya daily output data using factory");
        
        // Check final finished goods inventory
        $alkansyaFinishedGoods = InventoryItem::where('sku', 'FG-ALKANSYA')->first();
        if ($alkansyaFinishedGoods) {
            $this->command->info("📦 Final Alkansya finished goods inventory: {$alkansyaFinishedGoods->quantity_on_hand} pieces");
        }
        
        // Check ProductionAnalytics sync
        $analyticsCount = ProductionAnalytics::whereHas('product', function($query) {
            $query->where('name', 'Alkansya');
        })->count();
        $this->command->info("📊 ProductionAnalytics records created: {$analyticsCount}");
        
        $this->command->info("📊 Final raw materials stock levels:");
        foreach ($stockLevels as $itemId => $stock) {
            $item = InventoryItem::find($itemId);
            $this->command->info("   - {$item->name}: {$stock} {$item->unit}");
        }
    }

    /**
     * Create daily output using factory with stock management
     */
    private function createDailyOutputWithFactory($date, $bomMaterials, &$stockLevels)
    {
        // Generate realistic production quantity (200-400 range)
        $baseProduction = $this->getBaseProduction($date);
        $variation = $this->getProductionVariation($date);
        $quantityProduced = max(200, min(400, $baseProduction + $variation));

        // Check if we have enough materials before production
        $canProduce = $this->checkMaterialAvailability($bomMaterials, $quantityProduced, $stockLevels);
        
        if (!$canProduce) {
            // Reduce production to what we can actually make
            $quantityProduced = $this->calculateMaxProduction($bomMaterials, $stockLevels);
            if ($quantityProduced <= 0) {
                $this->command->warn("⚠️  No production on {$date->format('Y-m-d')} - insufficient materials");
                return false;
            }
        }

        // Calculate materials used and update stock
        $materialsUsed = [];
        $totalCost = 0;

        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $requiredQuantity = $bomMaterial->qty_per_unit * $quantityProduced;
            
            if ($requiredQuantity > 0) {
                // Simulate material usage with some variation (95-105% of required)
                $actualUsage = $requiredQuantity * (0.95 + (rand(0, 10) / 100));
                
                // Ensure we don't go below zero stock
                $actualUsage = min($actualUsage, $stockLevels[$inventoryItem->id]);
                
                if ($actualUsage > 0) {
                    $materialsUsed[] = [
                        'inventory_item_id' => $inventoryItem->id,
                        'item_name' => $inventoryItem->name,
                        'sku' => $inventoryItem->sku,
                        'quantity_used' => round($actualUsage, 2),
                        'unit_cost' => $inventoryItem->unit_cost,
                        'total_cost' => round($inventoryItem->unit_cost * $actualUsage, 2),
                    ];

                    $totalCost += $inventoryItem->unit_cost * $actualUsage;

                    // Update stock levels
                    $stockLevels[$inventoryItem->id] -= $actualUsage;

                    // Update inventory item in database
                    $inventoryItem->quantity_on_hand = $stockLevels[$inventoryItem->id];
                    $inventoryItem->save();

                    // Create inventory usage record
                    InventoryUsage::create([
                        'inventory_item_id' => $inventoryItem->id,
                        'qty_used' => $actualUsage,
                        'date' => $date->format('Y-m-d'),
                    ]);
                }
            }
        }

        // Generate efficiency (90-110%)
        $efficiency = 90 + rand(0, 20);
        
        // Generate defects (0-5% of production)
        $defects = rand(0, max(0, floor($quantityProduced * 0.05)));

        // Create daily output record using factory
        $dailyOutput = AlkansyaDailyOutput::factory()->create([
            'date' => $date->format('Y-m-d'),
            'quantity_produced' => $quantityProduced,
            'materials_used' => $materialsUsed,
            'efficiency_percentage' => $efficiency,
            'defects' => $defects,
            'notes' => $this->generateProductionNotes($date, $quantityProduced, $efficiency),
            'produced_by' => $this->getRandomProducer(),
        ]);

        // Add finished goods to inventory
        $this->addFinishedGoodsToInventory($quantityProduced, $date);

        // Sync to ProductionAnalytics for dashboard display
        $this->syncToProductionAnalytics($dailyOutput);

        return true;
    }

    /**
     * Check if we have enough materials for production
     */
    private function checkMaterialAvailability($bomMaterials, $quantityProduced, $stockLevels)
    {
        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $requiredQuantity = $bomMaterial->qty_per_unit * $quantityProduced;
            
            if ($stockLevels[$inventoryItem->id] < $requiredQuantity) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculate maximum production based on available materials
     */
    private function calculateMaxProduction($bomMaterials, $stockLevels)
    {
        $maxProduction = PHP_INT_MAX;
        
        foreach ($bomMaterials as $bomMaterial) {
            if ($bomMaterial->qty_per_unit > 0) {
                $availableForThisMaterial = floor($stockLevels[$bomMaterial->inventoryItem->id] / $bomMaterial->qty_per_unit);
                $maxProduction = min($maxProduction, $availableForThisMaterial);
            }
        }
        
        return max(0, $maxProduction);
    }

    /**
     * Get base production quantity based on day of week and season (200-400 range)
     */
    private function getBaseProduction($date)
    {
        $dayOfWeek = $date->dayOfWeek;
        $month = $date->month;
        
        // Base production by day of week (200-400 range)
        $baseByDay = [
            1 => 250, // Monday
            2 => 300, // Tuesday
            3 => 350, // Wednesday
            4 => 350, // Thursday
            5 => 300, // Friday
        ];

        $baseProduction = $baseByDay[$dayOfWeek] ?? 300;

        // Seasonal adjustments
        $seasonalMultiplier = 1.0;
        if ($month >= 11 || $month <= 2) {
            // Winter months - higher production
            $seasonalMultiplier = 1.1;
        } elseif ($month >= 6 && $month <= 8) {
            // Summer months - slightly lower production
            $seasonalMultiplier = 0.95;
        }

        return round($baseProduction * $seasonalMultiplier);
    }

    /**
     * Get production variation for the day
     */
    private function getProductionVariation($date)
    {
        // Random variation between -30 and +30
        return rand(-30, 30);
    }

    /**
     * Generate realistic production notes
     */
    private function generateProductionNotes($date, $quantity, $efficiency)
    {
        $notes = [];
        
        if ($efficiency >= 105) {
            $notes[] = "Excellent production day - above target";
        } elseif ($efficiency >= 100) {
            $notes[] = "Good production efficiency - on target";
        } elseif ($efficiency >= 95) {
            $notes[] = "Slightly below target efficiency";
        } else {
            $notes[] = "Below target efficiency - needs improvement";
        }

        if ($quantity >= 380) {
            $notes[] = "High output achieved";
        } elseif ($quantity >= 300) {
            $notes[] = "Good production output";
        } elseif ($quantity < 250) {
            $notes[] = "Lower than expected output";
        }

        // Add random notes
        $randomNotes = [
            "All materials available",
            "No equipment issues",
            "Team performed well",
            "Quality checks passed",
            "On-time completion",
            "Minor delays in morning setup",
            "Extra quality control time",
            "New team member training",
            "Equipment maintenance completed",
            "Material quality excellent",
            "Smooth production flow",
            "Team coordination excellent",
        ];

        if (rand(1, 3) === 1) {
            $notes[] = $randomNotes[array_rand($randomNotes)];
        }

        return implode('. ', $notes);
    }

    /**
     * Get random producer name
     */
    private function getRandomProducer()
    {
        $producers = [
            'Production Team A',
            'Production Team B',
            'Production Team C',
            'John Santos',
            'Maria Garcia',
            'Production Supervisor',
            'Quality Control Team',
            'Senior Production Lead',
            'Production Manager',
        ];

        return $producers[array_rand($producers)];
    }

    /**
     * Add finished goods to inventory
     */
    private function addFinishedGoodsToInventory($quantityProduced, $date)
    {
        // Find or create Alkansya finished goods inventory item
        $alkansyaFinishedGoods = InventoryItem::where('sku', 'FG-ALKANSYA')
            ->where('category', 'finished')
            ->first();

        if (!$alkansyaFinishedGoods) {
            // Create Alkansya finished goods inventory item if it doesn't exist
            $alkansyaFinishedGoods = InventoryItem::create([
                'sku' => 'FG-ALKANSYA',
                'name' => 'Alkansya (Finished Good)',
                'category' => 'finished',
                'status' => 'in_stock',
                'location' => 'Windfield 2',
                'unit' => 'piece',
                'unit_cost' => 150.00,
                'supplier' => 'In-House Production',
                'description' => 'Completed Alkansya ready for sale',
                'quantity_on_hand' => 0,
                'safety_stock' => 50,
                'reorder_point' => 100,
                'max_level' => 500,
                'lead_time_days' => 7,
            ]);
        }

        // Add produced quantity to inventory
        $alkansyaFinishedGoods->quantity_on_hand += $quantityProduced;
        
        // Update status based on quantity
        if ($alkansyaFinishedGoods->quantity_on_hand > 0) {
            $alkansyaFinishedGoods->status = 'in_stock';
        } else {
            $alkansyaFinishedGoods->status = 'out_of_stock';
        }
        
        $alkansyaFinishedGoods->save();

        $this->command->info("✅ Added {$quantityProduced} Alkansya finished goods to inventory (Total: {$alkansyaFinishedGoods->quantity_on_hand})");
    }

    /**
     * Sync daily output to ProductionAnalytics for dashboard display
     */
    private function syncToProductionAnalytics($dailyOutput)
    {
        // Get Alkansya product
        $alkansyaProduct = Product::where('name', 'Alkansya')->first();
        if (!$alkansyaProduct) {
            $this->command->warn("⚠️  Alkansya product not found for ProductionAnalytics sync");
            return;
        }

        // Create or update ProductionAnalytics record
        ProductionAnalytics::updateOrCreate(
            [
                'date' => $dailyOutput->date,
                'product_id' => $alkansyaProduct->id,
            ],
            [
                'actual_output' => $dailyOutput->quantity_produced,
                'target_output' => $dailyOutput->quantity_produced, // Assuming target is actual for seeded data
                'efficiency_percentage' => $dailyOutput->efficiency_percentage,
                'total_duration_minutes' => 0, // Not tracked in AlkansyaDailyOutput
                'avg_process_duration_minutes' => 0, // Not tracked
            ]
        );

        $this->command->info("📊 Synced daily output to ProductionAnalytics for {$dailyOutput->date}");
    }
}
