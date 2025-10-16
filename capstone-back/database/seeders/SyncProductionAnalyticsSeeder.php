<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AlkansyaDailyOutput;
use App\Models\ProductionAnalytics;
use App\Models\Product;
use Carbon\Carbon;

class SyncProductionAnalyticsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🔄 Syncing Alkansya daily output to ProductionAnalytics...');

        // Get Alkansya product
        $alkansyaProduct = Product::where('name', 'Alkansya')->first();
        if (!$alkansyaProduct) {
            $this->command->error('❌ Alkansya product not found. Please run ProductsTableSeeder first.');
            return;
        }

        $alkansyaOutputs = AlkansyaDailyOutput::orderBy('date')->get();
        
        if ($alkansyaOutputs->isEmpty()) {
            $this->command->warn('⚠️  No Alkansya daily output data found. Please run AlkansyaDailyOutputSeeder first.');
            return;
        }

        $syncedCount = 0;
        $updatedCount = 0;

        foreach ($alkansyaOutputs as $output) {
            // Check if analytics record already exists for this date and product
            $analytics = ProductionAnalytics::where('date', $output->date)
                ->where('product_id', $alkansyaProduct->id)
                ->first();

            if ($analytics) {
                // Update existing record
                $analytics->update([
                    'actual_output' => $output->quantity_produced,
                    'target_output' => 400, // Default target
                    'efficiency_percentage' => 95.0, // Default efficiency
                    'total_duration_minutes' => 480, // 8 hours
                    'avg_process_duration_minutes' => 80, // Average per process
                ]);
                $updatedCount++;
            } else {
                // Create new record
                ProductionAnalytics::create([
                    'date' => $output->date,
                    'product_id' => $alkansyaProduct->id,
                    'actual_output' => $output->quantity_produced,
                    'target_output' => 400, // Default target
                    'efficiency_percentage' => 95.0, // Default efficiency
                    'total_duration_minutes' => 480, // 8 hours
                    'avg_process_duration_minutes' => 80, // Average per process
                ]);
                $syncedCount++;
            }
        }

        $this->command->info("✅ Synced {$syncedCount} new records and updated {$updatedCount} existing records");
        $this->command->info("📊 Total ProductionAnalytics records: " . ProductionAnalytics::count());
    }
}
