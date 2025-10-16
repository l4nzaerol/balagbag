<?php

namespace Database\Factories;

use App\Models\AlkansyaDailyOutput;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AlkansyaDailyOutput>
 */
class AlkansyaDailyOutputFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = AlkansyaDailyOutput::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Generate realistic production quantity (300-500 range)
        $baseProduction = $this->faker->numberBetween(300, 500);
        $variation = $this->faker->numberBetween(-50, 50);
        $quantityProduced = max(300, min(500, $baseProduction + $variation));

        // Generate efficiency percentage (90-110%)
        $efficiency = $this->faker->numberBetween(90, 110);

        // Generate defects (0-5% of production)
        $defects = $this->faker->numberBetween(0, max(0, floor($quantityProduced * 0.05)));

        // Generate materials used data
        $materialsUsed = $this->generateMaterialsUsed($quantityProduced);

        return [
            'date' => $this->faker->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'quantity_produced' => $quantityProduced,
            'notes' => $this->generateProductionNotes($quantityProduced, $efficiency),
            'produced_by' => $this->faker->randomElement([
                'Production Team A',
                'Production Team B', 
                'Production Team C',
                'John Santos',
                'Maria Garcia',
                'Production Supervisor',
                'Quality Control Team',
                'Senior Production Lead',
                'Production Manager',
            ]),
            'materials_used' => $materialsUsed,
            'efficiency_percentage' => $efficiency,
            'defects' => $defects,
        ];
    }

    /**
     * Generate materials used based on BOM
     */
    private function generateMaterialsUsed($quantityProduced): array
    {
        // Get Alkansya BOM materials
        $alkansyaProduct = Product::where('name', 'Alkansya')->first();
        if (!$alkansyaProduct) {
            return [];
        }

        $bomMaterials = ProductMaterial::where('product_id', $alkansyaProduct->id)
            ->with('inventoryItem')
            ->get();

        $materialsUsed = [];

        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $requiredQuantity = $bomMaterial->qty_per_unit * $quantityProduced;
            
            if ($requiredQuantity > 0) {
                // Simulate material usage with some variation (95-105% of required)
                $actualUsage = $requiredQuantity * (0.95 + ($this->faker->numberBetween(0, 10) / 100));
                
                $materialsUsed[] = [
                    'inventory_item_id' => $inventoryItem->id,
                    'item_name' => $inventoryItem->name,
                    'sku' => $inventoryItem->sku,
                    'quantity_used' => round($actualUsage, 2),
                    'unit_cost' => $inventoryItem->unit_cost,
                    'total_cost' => round($inventoryItem->unit_cost * $actualUsage, 2),
                ];
            }
        }

        return $materialsUsed;
    }

    /**
     * Generate realistic production notes
     */
    private function generateProductionNotes($quantity, $efficiency): string
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
            "Smooth production flow",
            "Team coordination excellent",
        ];

        if ($this->faker->boolean(30)) { // 30% chance
            $notes[] = $this->faker->randomElement($randomNotes);
        }

        return implode('. ', $notes);
    }

    /**
     * Create data for a specific date range
     */
    public function forDateRange($startDate, $endDate)
    {
        return $this->state(function (array $attributes) use ($startDate, $endDate) {
            return [
                'date' => $this->faker->dateTimeBetween($startDate, $endDate)->format('Y-m-d'),
            ];
        });
    }

    /**
     * Create data for weekdays only
     */
    public function weekdaysOnly()
    {
        return $this->state(function (array $attributes) {
            $date = Carbon::parse($attributes['date']);
            
            // Skip weekends
            while ($date->isWeekend()) {
                $date = $date->addDay();
            }
            
            return [
                'date' => $date->format('Y-m-d'),
            ];
        });
    }

    /**
     * Create high production day
     */
    public function highProduction()
    {
        return $this->state(function (array $attributes) {
            return [
                'quantity_produced' => $this->faker->numberBetween(450, 500),
                'efficiency_percentage' => $this->faker->numberBetween(105, 110),
                'defects' => $this->faker->numberBetween(0, 5),
            ];
        });
    }

    /**
     * Create low production day
     */
    public function lowProduction()
    {
        return $this->state(function (array $attributes) {
            return [
                'quantity_produced' => $this->faker->numberBetween(300, 350),
                'efficiency_percentage' => $this->faker->numberBetween(90, 95),
                'defects' => $this->faker->numberBetween(5, 15),
            ];
        });
    }
}
