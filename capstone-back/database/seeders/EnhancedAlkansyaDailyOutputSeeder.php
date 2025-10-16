<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AlkansyaDailyOutput;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use Carbon\Carbon;

class EnhancedAlkansyaDailyOutputSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 3 months of realistic Alkansya daily output data with proper stock management
     */
    public function run(): void
    {
        $this->command->info('🌱 Seeding 3 months of enhanced Alkansya daily output data...');

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

        $totalCreated = 0;
        $currentDate = $startDate->copy();

        // Track stock levels to prevent negative inventory
        $stockLevels = [];
        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $stockLevels[$inventoryItem->id] = $inventoryItem->quantity_on_hand;
        }

        while ($currentDate->lte($endDate)) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($currentDate->dayOfWeek !== 6 && $currentDate->dayOfWeek !== 0) {
                $result = $this->createDailyOutput($currentDate, $bomMaterials, $stockLevels);
                if ($result) {
                    $totalCreated++;
                }
            }
            
            $currentDate->addDay();
        }

        $this->command->info("✅ Created {$totalCreated} days of Alkansya daily output data");
        $this->command->info("📊 Final stock levels:");
        foreach ($stockLevels as $itemId => $stock) {
            $item = InventoryItem::find($itemId);
            $this->command->info("   - {$item->name}: {$stock} {$item->unit}");
        }
    }

    /**
     * Create daily output for a specific date with stock management
     */
    private function createDailyOutput($date, $bomMaterials, &$stockLevels)
    {
        // Calculate realistic production quantity (300-500 per day)
        $baseProduction = $this->getBaseProduction($date);
        $variation = $this->getProductionVariation($date);
        $quantityProduced = max(300, min(500, $baseProduction + $variation));

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

        // Calculate efficiency (90-110%)
        $efficiency = 90 + rand(0, 20);
        
        // Simulate defects (0-5%)
        $defects = rand(0, max(0, floor($quantityProduced * 0.05)));

        // Create daily output record
        AlkansyaDailyOutput::create([
            'date' => $date->format('Y-m-d'),
            'quantity_produced' => $quantityProduced,
            'notes' => $this->generateProductionNotes($date, $quantityProduced, $efficiency),
            'produced_by' => $this->getRandomProducer(),
            'materials_used' => $materialsUsed,
            'efficiency_percentage' => $efficiency,
            'defects' => $defects,
        ]);

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
     * Get base production quantity based on day of week and season (300-500 range)
     */
    private function getBaseProduction($date)
    {
        $dayOfWeek = $date->dayOfWeek;
        $month = $date->month;
        
        // Base production by day of week (300-500 range)
        $baseByDay = [
            1 => 350, // Monday
            2 => 400, // Tuesday
            3 => 450, // Wednesday
            4 => 450, // Thursday
            5 => 400, // Friday
        ];

        $baseProduction = $baseByDay[$dayOfWeek] ?? 350;

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
        // Random variation between -50 and +50
        return rand(-50, 50);
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

        if ($quantity >= 450) {
            $notes[] = "High output achieved";
        } elseif ($quantity >= 400) {
            $notes[] = "Good production output";
        } elseif ($quantity < 350) {
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
}
