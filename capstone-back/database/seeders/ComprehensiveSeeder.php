<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ComprehensiveSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder runs all the enhanced seeders in the correct order
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting comprehensive database seeding...');

        // Step 1: Create enhanced inventory with proper stock levels
        $this->command->info('📦 Step 1: Creating enhanced inventory system...');
        $this->call(EnhancedInventorySeeder::class);

        // Step 2: Create Alkansya daily output with stock management
        $this->command->info('🏭 Step 2: Creating Alkansya daily output with stock management...');
        $this->call(AlkansyaDailyOutputSeeder::class);

        // Step 3: Create additional data using factory (optional)
        if ($this->command->confirm('Would you like to create additional data using factory?', false)) {
            $this->command->info('🏭 Step 3: Creating additional data using factory...');
            $this->call(AlkansyaFactorySeeder::class);
        }

        $this->command->info('✅ Comprehensive database seeding completed successfully!');
        $this->command->info('📊 Summary:');
        $this->command->info('   - Enhanced inventory system with realistic stock levels');
        $this->command->info('   - 3 months of Alkansya daily output (300-500 per day)');
        $this->command->info('   - Proper stock management to prevent negative inventory');
        $this->command->info('   - Accurate BOM relationships based on Alkansya.txt');
        $this->command->info('   - Realistic production patterns and material usage');
    }
}