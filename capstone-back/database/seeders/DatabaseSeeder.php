<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
           
            UsersTableSeeder::class, // Creates admin and user accounts
            ProductsTableSeeder::class, // Creates products with initial prices
            
            
            // Option 1: Use EnhancedInventorySeeder for realistic stock levels (RECOMMENDED)
            EnhancedInventorySeeder::class, // Creates inventory with high stock levels for 3 months production
            
            // Option 2: Use ComprehensiveInventorySeeder for basic inventory
             //ComprehensiveInventorySeeder::class, // Creates basic inventory system with BOM
            
            // Option 1: Enhanced seeder with stock management (RECOMMENDED)
           // EnhancedAlkansyaDailyOutputSeeder::class, // Creates 3 months of 300-500 daily output with stock management
            
            // Option 2: Original seeder with stock management
            //AlkansyaDailyOutputSeeder::class, // Creates 3 months of 300-500 daily output with stock management
            
            // Option 3: Factory-based seeder for flexible data generation
            AlkansyaFactorySeeder::class, // Creates production data using Laravel factories
            
          
            UpdateProductPricesFromBomSeeder::class, // Updates products with BOM-calculated prices
           // ComprehensiveOrdersSeeder::class, 
            
        
        ]);
    }
}
