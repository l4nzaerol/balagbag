<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AlkansyaDailyOutput extends Model
{
    use HasFactory;

    protected $table = 'alkansya_daily_output';

    protected $fillable = [
        'date',
        'quantity_produced',
        'notes',
        'produced_by',
        'materials_used',
        'efficiency_percentage',
        'defects',
    ];

    protected $casts = [
        'date' => 'date',
        'materials_used' => 'array',
        'efficiency_percentage' => 'decimal:2',
    ];

    /**
     * Get the total output for a specific date range
     */
    public static function getTotalOutput($startDate = null, $endDate = null)
    {
        $query = self::query();
        
        if ($startDate) {
            $query->where('date', '>=', $startDate);
        }
        
        if ($endDate) {
            $query->where('date', '<=', $endDate);
        }
        
        return $query->sum('quantity_produced');
    }

    /**
     * Get daily output for a specific date
     */
    public static function getDailyOutput($date)
    {
        return self::where('date', $date)->first();
    }

    /**
     * Add daily output and automatically deduct materials
     */
    public static function addDailyOutput($date, $quantity, $notes = null, $producedBy = null)
    {
        // Get Alkansya BOM materials
        $alkansyaProduct = Product::where('name', 'Alkansya')->first();
        if (!$alkansyaProduct) {
            throw new \Exception('Alkansya product not found');
        }

        $bomMaterials = ProductMaterial::where('product_id', $alkansyaProduct->id)
            ->with('inventoryItem')
            ->get();

        $materialsUsed = [];
        $totalCost = 0;

        // Calculate materials needed and deduct from inventory (1:1 BOM ratio)
        foreach ($bomMaterials as $bomMaterial) {
            $inventoryItem = $bomMaterial->inventoryItem;
            $requiredQuantity = $bomMaterial->qty_per_unit * $quantity; // Now 1:1 ratio
            
            if ($requiredQuantity > 0) {
                // Check if enough stock
                if ($inventoryItem->quantity_on_hand < $requiredQuantity) {
                    throw new \Exception("Insufficient stock for {$inventoryItem->name}. Required: {$requiredQuantity}, Available: {$inventoryItem->quantity_on_hand}");
                }

                // Deduct from inventory
                $inventoryItem->quantity_on_hand -= $requiredQuantity;
                $inventoryItem->save();

                // Record material usage
                $materialsUsed[] = [
                    'inventory_item_id' => $inventoryItem->id,
                    'item_name' => $inventoryItem->name,
                    'sku' => $inventoryItem->sku,
                    'quantity_used' => $requiredQuantity,
                    'unit_cost' => $inventoryItem->unit_cost,
                    'total_cost' => $inventoryItem->unit_cost * $requiredQuantity,
                ];

                $totalCost += $inventoryItem->unit_cost * $requiredQuantity;

                // Log usage in inventory_usages table
                InventoryUsage::create([
                    'inventory_item_id' => $inventoryItem->id,
                    'qty_used' => $requiredQuantity,
                    'date' => $date,
                ]);
            }
        }

        // Create or update daily output record
        $dailyOutput = self::updateOrCreate(
            ['date' => $date],
            [
                'quantity_produced' => $quantity,
                'notes' => $notes,
                'produced_by' => $producedBy,
                'materials_used' => $materialsUsed,
                'efficiency_percentage' => 100.00, // Default efficiency
                'defects' => 0,
            ]
        );

        return $dailyOutput;
    }

    /**
     * Get materials used for a specific date
     */
    public function getMaterialsUsedAttribute($value)
    {
        return json_decode($value, true) ?? [];
    }

    /**
     * Get total cost of materials used
     */
    public function getTotalMaterialCostAttribute()
    {
        $materialsUsed = $this->materials_used ?? [];
        return collect($materialsUsed)->sum('total_cost');
    }
}