<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTracking;
use App\Models\Product;
use App\Models\Production;
use App\Models\ProductionProcess;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ComprehensiveOrdersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder creates comprehensive orders with:
     * - Production tracking with delays
     * - Ready-to-deliver Alkansya order
     * - Pending Alkansya order
     * - Various stages of production completion
     * - Accurate dates for demo purposes
     * - Proper material stock deduction
     */
    public function run(): void
    {
        $this->command->info('=== Creating Comprehensive Orders with Production Tracking & Delays ===');
        
        // Clear existing orders to ensure fresh demo data
        $this->command->info('🗑️  Clearing existing orders and related data...');
        
        // Disable foreign key checks temporarily
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        
        // Delete in correct order to respect foreign key constraints
        \App\Models\OrderTracking::truncate();
        \App\Models\ProductionProcess::truncate();
        \App\Models\Production::truncate();
        \App\Models\OrderItem::truncate();
        \App\Models\Order::truncate();
        
        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        $this->command->info('✓ Cleared existing orders and production data');
        $this->command->info('');
        
        // Find or create customer
        $customer = User::firstOrCreate(
            ['email' => 'customer@gmail.com'],
            [
                'name' => 'Customer',
                'email' => 'customer@gmail.com',
                'password' => bcrypt('password'),
                'role' => 'customer',
            ]
        );

        // Find or create admin
        $admin = User::whereIn('role', ['admin', 'employee'])->first();
        if (!$admin) {
            $admin = User::create([
                'name' => 'Admin',
                'email' => 'admin@gmail.com',
                'password' => bcrypt('password'),
                'role' => 'admin',
            ]);
        }

        // Create staff members (employees)
        $staff = [];
        $staffNames = [
            ['name' => 'Juan Dela Cruz', 'email' => 'juan@unick.com'],
            ['name' => 'Maria Santos', 'email' => 'maria@unick.com'],
            ['name' => 'Pedro Reyes', 'email' => 'pedro@unick.com'],
            ['name' => 'Ana Garcia', 'email' => 'ana@unick.com'],
            ['name' => 'Carlos Mendoza', 'email' => 'carlos@unick.com'],
        ];

        foreach ($staffNames as $staffData) {
            $staff[] = User::firstOrCreate(
                ['email' => $staffData['email']],
                [
                    'name' => $staffData['name'],
                    'email' => $staffData['email'],
                    'password' => bcrypt('password'),
                    'role' => 'employee',
                ]
            );
        }

        $this->command->info("Created/Found " . count($staff) . " staff members");
        $this->command->info("");

        // Get products
        $alkansya = Product::where('name', 'Alkansya')->first();
        $diningTable = Product::where('name', 'Dining Table')->first();
        $woodenChair = Product::where('name', 'Wooden Chair')->first();

        if (!$alkansya || !$diningTable || !$woodenChair) {
            $this->command->error('Required products not found. Please run ProductsTableSeeder first.');
            return;
        }

        $this->command->info("\n--- Creating Sample Orders with Accurate Dates ---\n");

        // Define realistic date ranges for demo with proper production timelines
        $today = Carbon::now();
        $oneWeekAgo = $today->copy()->subWeek();
        $twoWeeksAgo = $today->copy()->subWeeks(2);
        $threeWeeksAgo = $today->copy()->subWeeks(3);
        $oneMonthAgo = $today->copy()->subMonth();

        // Order 1: PENDING Alkansya - Just placed, awaiting acceptance (OLDEST ORDER)
        $this->command->info("1. Creating PENDING Alkansya order (awaiting acceptance)");
        $this->createOrder($customer, $admin, $staff, $alkansya, 3, [
            'placed_date' => $oneMonthAgo,
            'is_accepted' => false,
        ]);

        // Order 2: READY TO DELIVER Alkansya - Completed and ready (started 3 weeks ago, completed 2 weeks ago)
        $this->command->info("2. Creating READY TO DELIVER Alkansya order");
        $this->createOrder($customer, $admin, $staff, $alkansya, 5, [
            'placed_date' => $threeWeeksAgo,
            'accepted_date' => $threeWeeksAgo->copy()->addDay(),
            'production_started' => $threeWeeksAgo->copy()->addDay(),
            'production_completed' => $twoWeeksAgo, // Completed 2 weeks ago
            'is_accepted' => true,
            'progress' => 100,
            'is_alkansya_ready' => true,
        ]);

        // Order 3: PROCESSING - Wooden Chair with delays (20% complete, started 2.5 weeks ago)
        $this->command->info("3. Creating PROCESSING Wooden Chair with early delay");
        $this->createOrder($customer, $admin, $staff, $woodenChair, 1, [
            'placed_date' => $threeWeeksAgo->copy()->addDays(2),
            'accepted_date' => $threeWeeksAgo->copy()->addDays(3),
            'production_started' => $threeWeeksAgo->copy()->addDays(3),
            'is_accepted' => true,
            'progress' => 20,
            'has_delays' => true,
            'delayed_processes' => [
                'Material Preparation' => [
                    'reason' => 'Supplier delayed wood delivery by 1 day',
                    'extra_days' => 1
                ]
            ]
        ]);

        // Order 4: PROCESSING - Dining Table with multiple delays (45% complete, started 2 weeks ago)
        $this->command->info("4. Creating PROCESSING Dining Table with multiple delays");
        $this->createOrder($customer, $admin, $staff, $diningTable, 2, [
            'placed_date' => $twoWeeksAgo,
            'accepted_date' => $twoWeeksAgo->copy()->addDay(),
            'production_started' => $twoWeeksAgo->copy()->addDay(),
            'is_accepted' => true,
            'progress' => 45,
            'has_delays' => true,
            'delayed_processes' => [
                'Material Preparation' => [
                    'reason' => 'Supplier delayed wood delivery by 2 days',
                    'extra_days' => 2
                ],
                'Cutting & Shaping' => [
                    'reason' => 'Equipment malfunction required maintenance',
                    'extra_days' => 1.5
                ]
            ]
        ]);

        // Order 5: PROCESSING - Wooden Chair mid-production (60% complete, started 1.5 weeks ago)
        $this->command->info("5. Creating PROCESSING Wooden Chair at 60% (no delays)");
        $this->createOrder($customer, $admin, $staff, $woodenChair, 2, [
            'placed_date' => $twoWeeksAgo->copy()->addDays(2),
            'accepted_date' => $twoWeeksAgo->copy()->addDays(3),
            'production_started' => $twoWeeksAgo->copy()->addDays(3),
            'is_accepted' => true,
            'progress' => 60,
        ]);

        // Order 6: PROCESSING - Dining Table with delay (75% complete, started 1 week ago)
        $this->command->info("6. Creating PROCESSING Dining Table with assembly delay");
        $this->createOrder($customer, $admin, $staff, $diningTable, 1, [
            'placed_date' => $oneWeekAgo,
            'accepted_date' => $oneWeekAgo->copy()->addDay(),
            'production_started' => $oneWeekAgo->copy()->addDay(),
            'is_accepted' => true,
            'progress' => 75,
            'has_delays' => true,
            'delayed_processes' => [
                'Assembly' => [
                    'reason' => 'Worker shortage due to sick leave',
                    'extra_days' => 1
                ]
            ]
        ]);

        // Order 7: PROCESSING - Wooden Chair near completion with delays (90% complete, started 5 days ago)
        $this->command->info("7. Creating PROCESSING Wooden Chair with finishing delay");
        $this->createOrder($customer, $admin, $staff, $woodenChair, 1, [
            'placed_date' => $oneWeekAgo->copy()->addDays(2),
            'accepted_date' => $oneWeekAgo->copy()->addDays(3),
            'production_started' => $oneWeekAgo->copy()->addDays(3),
            'is_accepted' => true,
            'progress' => 90,
            'has_delays' => true,
            'delayed_processes' => [
                'Finishing' => [
                    'reason' => 'Waiting for custom stain color to arrive',
                    'extra_days' => 2
                ]
            ]
        ]);

        // Order 8: COMPLETED - Dining Table ready for delivery (100% complete, finished 3 days ago)
        $this->command->info("8. Creating COMPLETED Dining Table (ready for delivery)");
        $this->createOrder($customer, $admin, $staff, $diningTable, 1, [
            'placed_date' => $oneWeekAgo->copy()->addDays(4),
            'accepted_date' => $oneWeekAgo->copy()->addDays(5),
            'production_started' => $oneWeekAgo->copy()->addDays(5),
            'production_completed' => $today->copy()->subDays(3), // Completed 3 days ago
            'is_accepted' => true,
            'progress' => 100,
        ]);

        // Order 9: PENDING - Regular furniture awaiting acceptance (NEWEST ORDER)
        $this->command->info("9. Creating PENDING Wooden Chair order");
        $this->createOrder($customer, $admin, $staff, $woodenChair, 1, [
            'placed_date' => $today->copy()->subDays(2),
            'is_accepted' => false,
        ]);

        // Order 10: NEWEST PENDING - Just placed today
        $this->command->info("10. Creating NEWEST PENDING Alkansya order (placed today)");
        $this->createOrder($customer, $admin, $staff, $alkansya, 2, [
            'placed_date' => $today,
            'is_accepted' => false,
        ]);

        $this->command->info("");
        $this->command->info("✓ All comprehensive orders created successfully!");
        $this->command->info("");
        $this->command->info("=== Order Summary ===");
        $this->command->info("PENDING (3 orders): Orders 1, 9, 10");
        $this->command->info("  - Order 1: Alkansya (oldest pending - 1 month ago)");
        $this->command->info("  - Order 9: Wooden Chair (recent pending - 2 days ago)");
        $this->command->info("  - Order 10: Alkansya (newest pending - today)");
        $this->command->info("");
        $this->command->info("READY TO DELIVER (2 orders): Orders 2, 8");
        $this->command->info("  - Order 2: Alkansya (completed 2 weeks ago)");
        $this->command->info("  - Order 8: Dining Table (completed 3 days ago)");
        $this->command->info("");
        $this->command->info("PROCESSING (5 orders): Orders 3-7");
        $this->command->info("  - Orders with delays: 3, 4, 6, 7");
        $this->command->info("  - Orders without delays: 5");
        $this->command->info("");
        $this->command->info("Realistic Timeline:");
        $this->command->info("  - Order 2: Started 3 weeks ago, completed 2 weeks ago");
        $this->command->info("  - Order 3: Started 2.5 weeks ago, 20% complete (delayed)");
        $this->command->info("  - Order 4: Started 2 weeks ago, 45% complete (delayed)");
        $this->command->info("  - Order 5: Started 1.5 weeks ago, 60% complete");
        $this->command->info("  - Order 6: Started 1 week ago, 75% complete (delayed)");
        $this->command->info("  - Order 7: Started 5 days ago, 90% complete (delayed)");
        $this->command->info("  - Order 8: Started 6 days ago, completed 3 days ago");
        $this->command->info("");
        $this->command->info("Delay Information:");
        $this->command->info("  - Order 3: Material Preparation delayed");
        $this->command->info("  - Order 4: Material Preparation + Cutting & Shaping delayed");
        $this->command->info("  - Order 6: Assembly delayed");
        $this->command->info("  - Order 7: Finishing delayed");
    }

    /**
     * Create an order with comprehensive production tracking
     */
    private function createOrder($customer, $admin, $staff, $product, $quantity, $config)
    {
        $placedDate = $config['placed_date'] ?? Carbon::now();
        $acceptedDate = $config['accepted_date'] ?? $placedDate;
        $productionStarted = $config['production_started'] ?? $acceptedDate;
        $productionCompleted = $config['production_completed'] ?? null;
        $isAccepted = $config['is_accepted'] ?? false;
        $progress = $config['progress'] ?? 0;
        $hasDelays = $config['has_delays'] ?? false;
        $delayedProcesses = $config['delayed_processes'] ?? [];
        $isAlkansyaReady = $config['is_alkansya_ready'] ?? false;

        $isAlkansya = str_contains(strtolower($product->name), 'alkansya');
        $totalProductionDays = $isAlkansya ? 7 : 14;

        // Determine order status
        $orderStatus = 'pending';
        if ($isAccepted) {
            if ($progress >= 100 || $isAlkansyaReady) {
                $orderStatus = 'ready_for_delivery';
            } else {
                $orderStatus = 'processing';
            }
        }

        // Create order with accurate dates
        $order = Order::create([
            'user_id' => $customer->id,
            'total_price' => $product->price * $quantity,
            'status' => $orderStatus,
            'acceptance_status' => $isAccepted ? 'accepted' : 'pending',
            'accepted_by' => $isAccepted ? $admin->id : null,
            'accepted_at' => $isAccepted ? $acceptedDate : null,
            'checkout_date' => $placedDate,
            'payment_method' => 'Maya',
            'payment_status' => 'paid',
            'shipping_address' => '456 Woodcraft Avenue, Furniture District, Metro Manila',
            'contact_phone' => '+63 917 123 4567',
            'created_at' => $placedDate,
            'updated_at' => Carbon::now(),
        ]);

        // Create order item
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'price' => $product->price,
        ]);

        // Deduct materials from inventory if order is accepted
        if ($isAccepted) {
            $this->deductMaterialsFromInventory($product, $quantity, $acceptedDate);
        }

        // Determine current stage based on progress
        $currentStage = $this->determineStageFromProgress($progress, $isAlkansya);

        // Calculate dates with realistic production timelines
        $productionStartedAt = $isAccepted ? $productionStarted : null;
        $estimatedCompletion = $isAccepted ? $productionStartedAt->copy()->addDays($totalProductionDays) : null;
        $actualCompletion = null;
        
        // Only set actual completion if production is truly completed
        if ($isAccepted && ($progress >= 100 || $isAlkansyaReady)) {
            if ($productionCompleted) {
                $actualCompletion = $productionCompleted;
            } else {
                // Calculate realistic completion date based on production start
                $actualCompletion = $productionStartedAt->copy()->addDays($totalProductionDays);
            }
        }

        // Create production if accepted
        $production = null;
        if ($isAccepted) {
            $actualProgress = max(5, $progress);
            $productionStatus = ($progress >= 100 || $isAlkansyaReady) ? 'Completed' : 'In Progress';
            
            $production = Production::create([
                'order_id' => $order->id,
                'user_id' => $admin->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'date' => $productionStarted->format('Y-m-d'),
                'current_stage' => $currentStage,
                'status' => $productionStatus,
                'quantity' => $quantity,
                'priority' => $productionStarted->diffInDays(Carbon::now()) <= 5 ? 'high' : 'medium',
                'requires_tracking' => !$isAlkansya,
                'product_type' => $isAlkansya ? 'alkansya' : (str_contains(strtolower($product->name), 'table') ? 'table' : 'chair'),
                'production_started_at' => $productionStartedAt,
                'estimated_completion_date' => $estimatedCompletion,
                'actual_completion_date' => $actualCompletion,
                'overall_progress' => $actualProgress,
            ]);

            // Create production processes for non-alkansya items
            if (!$isAlkansya) {
                $this->createProductionProcesses($production, $progress, $currentStage, $productionStartedAt, $staff, $delayedProcesses);
            }
        }

        // Create order tracking
        $trackingType = $isAlkansya ? 'alkansya' : 'custom';
        $trackingStatus = 'pending';
        $actualProgress = $isAccepted ? max(5, $progress) : 0;
        
        if ($isAccepted) {
            if ($progress >= 100 || $isAlkansyaReady) {
                $trackingStatus = 'ready_for_delivery';
            } else {
                $trackingStatus = 'in_production';
            }
        }

        $tracking = OrderTracking::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'tracking_type' => $trackingType,
            'current_stage' => $isAccepted ? $currentStage : ($isAlkansya ? 'Design' : 'Material Preparation'),
            'status' => $trackingStatus,
            'progress_percentage' => $actualProgress,
            'estimated_start_date' => $productionStartedAt,
            'estimated_completion_date' => $estimatedCompletion,
            'actual_start_date' => $isAccepted ? $productionStartedAt : null,
            'actual_completion_date' => $actualCompletion,
            'process_timeline' => $this->generateProcessTimeline($trackingType, $currentStage, $trackingStatus, $actualProgress, $isAccepted),
            'created_at' => $placedDate,
            'updated_at' => Carbon::now(),
        ]);

        // Sync tracking with production if production exists
        if ($production) {
            $trackingService = app(\App\Services\ProductionTrackingService::class);
            $trackingService->syncOrderTrackingWithProduction($order->id);
            
            // Refresh to get updated data
            $tracking->refresh();
            $production->refresh();
        }

        // Log creation
        $displayProgress = $isAccepted ? max(5, $progress) : 0;
        $delayInfo = $hasDelays ? " [HAS DELAYS]" : "";
        
        $this->command->info("   ✓ Order #{$order->id} | {$product->name} x{$quantity}{$delayInfo}");
        $this->command->info("     Status: {$order->status} | Progress: {$displayProgress}%");
        $this->command->info("     Placed: {$placedDate->format('Y-m-d H:i')}");
        
        if ($production) {
            $this->command->info("     🏭 Production: #{$production->id} | Stage: {$currentStage}");
            if ($hasDelays) {
                $this->command->info("     ⚠️  Delays: " . count($delayedProcesses) . " process(es) delayed");
            }
        }
        $this->command->info("");
    }

    /**
     * Determine current stage based on progress percentage
     */
    private function determineStageFromProgress($progress, $isAlkansya)
    {
        if ($isAlkansya) {
            $stages = [
                ['name' => 'Material Preparation', 'threshold' => 16],
                ['name' => 'Cutting & Shaping', 'threshold' => 50],
                ['name' => 'Assembly', 'threshold' => 66],
                ['name' => 'Finishing', 'threshold' => 83],
                ['name' => 'Quality Check & Packaging', 'threshold' => 100],
            ];
        } else {
            $stages = [
                ['name' => 'Material Preparation', 'threshold' => 10],
                ['name' => 'Cutting & Shaping', 'threshold' => 30],
                ['name' => 'Assembly', 'threshold' => 60],
                ['name' => 'Sanding & Surface Preparation', 'threshold' => 75],
                ['name' => 'Finishing', 'threshold' => 95],
                ['name' => 'Quality Check & Packaging', 'threshold' => 100],
            ];
        }

        $currentStage = $stages[0]['name'];
        foreach ($stages as $stage) {
            if ($progress >= $stage['threshold']) {
                $currentStage = $stage['name'];
            }
        }

        return $currentStage;
    }

    /**
     * Create production processes with delays
     */
    private function createProductionProcesses($production, $progress, $currentStage, $productionStartedAt, $staff, $delayedProcesses)
    {
        $totalMinutes = 14 * 24 * 60; // 14 days in minutes
        
        $processes = [
            ['name' => 'Material Preparation', 'order' => 1, 'estimated_duration' => (int) round($totalMinutes * 0.10), 'threshold' => 10, 'days_duration' => 1.5],
            ['name' => 'Cutting & Shaping', 'order' => 2, 'estimated_duration' => (int) round($totalMinutes * 0.20), 'threshold' => 30, 'days_duration' => 2.5],
            ['name' => 'Assembly', 'order' => 3, 'estimated_duration' => (int) round($totalMinutes * 0.30), 'threshold' => 60, 'days_duration' => 4.0],
            ['name' => 'Sanding & Surface Preparation', 'order' => 4, 'estimated_duration' => (int) round($totalMinutes * 0.15), 'threshold' => 75, 'days_duration' => 2.0],
            ['name' => 'Finishing', 'order' => 5, 'estimated_duration' => (int) round($totalMinutes * 0.20), 'threshold' => 95, 'days_duration' => 2.5],
            ['name' => 'Quality Check & Packaging', 'order' => 6, 'estimated_duration' => (int) round($totalMinutes * 0.05), 'threshold' => 100, 'days_duration' => 1.5],
        ];

        $currentStageIndex = array_search($currentStage, array_column($processes, 'name'));
        if ($currentStageIndex === false) {
            $currentStageIndex = 0;
        }

        $cumulativeDays = 0;
        foreach ($processes as $index => $proc) {
            $processStatus = 'pending';
            $startedAt = null;
            $completedAt = null;
            $delayReason = null;
            $isDelayed = false;
            $completedByName = null;
            
            // Check if this process has a delay
            $hasDelay = isset($delayedProcesses[$proc['name']]);
            $extraDays = $hasDelay ? $delayedProcesses[$proc['name']]['extra_days'] : 0;
            $actualDuration = $proc['days_duration'] + $extraDays;
            
            if ($progress >= $proc['threshold']) {
                // Process is completed
                $processStatus = 'completed';
                $startedAt = $productionStartedAt->copy()->addDays($cumulativeDays);
                $completedAt = $startedAt->copy()->addDays($actualDuration);
                // Assign random staff member
                $completedByName = $staff[array_rand($staff)]->name;
                
                if ($hasDelay) {
                    $delayReason = $delayedProcesses[$proc['name']]['reason'];
                    $isDelayed = true;
                }
            } elseif ($index === $currentStageIndex || ($progress > 0 && $index === 0 && $currentStageIndex === 0)) {
                // Current process is in progress
                $processStatus = 'in_progress';
                $startedAt = $productionStartedAt->copy()->addDays($cumulativeDays);
            } elseif ($index < $currentStageIndex) {
                // Previous processes should be completed
                $processStatus = 'completed';
                $startedAt = $productionStartedAt->copy()->addDays($cumulativeDays);
                $completedAt = $startedAt->copy()->addDays($actualDuration);
                // Assign random staff member
                $completedByName = $staff[array_rand($staff)]->name;
                
                if ($hasDelay) {
                    $delayReason = $delayedProcesses[$proc['name']]['reason'];
                    $isDelayed = true;
                }
            }

            ProductionProcess::create([
                'production_id' => $production->id,
                'process_name' => $proc['name'],
                'process_order' => $proc['order'],
                'status' => $processStatus,
                'estimated_duration_minutes' => $proc['estimated_duration'],
                'started_at' => $startedAt,
                'completed_at' => $completedAt,
                'delay_reason' => $delayReason,
                'is_delayed' => $isDelayed,
                'completed_by_name' => $completedByName,
                'actual_completion_date' => $completedAt,
            ]);
            
            $cumulativeDays += $actualDuration;
        }
    }

    /**
     * Generate process timeline for tracking
     */
    private function generateProcessTimeline($trackingType, $currentStage, $status, $progress, $isAccepted)
    {
        if ($trackingType === 'alkansya') {
            $stages = [
                ['stage' => 'Material Preparation', 'description' => 'Design and material preparation', 'estimated_duration' => '1 day'],
                ['stage' => 'Cutting & Shaping', 'description' => 'Cutting wood to specifications', 'estimated_duration' => '2 days'],
                ['stage' => 'Assembly', 'description' => 'Assembling components', 'estimated_duration' => '2 days'],
                ['stage' => 'Finishing', 'description' => 'Applying finish and polish', 'estimated_duration' => '1 day'],
                ['stage' => 'Quality Check & Packaging', 'description' => 'Final inspection and packaging', 'estimated_duration' => '1 day'],
            ];
        } else {
            $stages = [
                ['stage' => 'Material Preparation', 'description' => 'Selecting and preparing high-quality materials', 'estimated_duration' => '1.5 days'],
                ['stage' => 'Cutting & Shaping', 'description' => 'Precise cutting and shaping of components', 'estimated_duration' => '2.5 days'],
                ['stage' => 'Assembly', 'description' => 'Careful assembly of furniture components', 'estimated_duration' => '4 days'],
                ['stage' => 'Sanding & Surface Preparation', 'description' => 'Sanding and preparing surfaces for finishing', 'estimated_duration' => '2 days'],
                ['stage' => 'Finishing', 'description' => 'Applying professional finish, stain, and polish', 'estimated_duration' => '2.5 days'],
                ['stage' => 'Quality Check & Packaging', 'description' => 'Final quality inspection and packaging', 'estimated_duration' => '1.5 days'],
            ];
        }

        $currentStageIndex = array_search($currentStage, array_column($stages, 'stage'));
        if ($currentStageIndex === false) {
            $currentStageIndex = 0;
        }

        return array_map(function($stage, $index) use ($currentStage, $status, $currentStageIndex, $progress, $isAccepted) {
            $stageStatus = 'pending';
            
            if (!$isAccepted) {
                $stageStatus = 'pending';
            } elseif ($progress >= 100) {
                $stageStatus = 'completed';
            } elseif ($index < $currentStageIndex) {
                $stageStatus = 'completed';
            } elseif ($index === $currentStageIndex) {
                $stageStatus = $status === 'in_production' ? 'in_progress' : 'pending';
            }

            return [
                'stage' => $stage['stage'],
                'description' => $stage['description'],
                'estimated_duration' => $stage['estimated_duration'],
                'status' => $stageStatus,
            ];
        }, $stages, array_keys($stages));
    }

    /**
     * Deduct materials from inventory when order is accepted
     */
    private function deductMaterialsFromInventory($product, $quantity, $acceptedDate)
    {
        // Get BOM (Bill of Materials) for the product
        $materials = \App\Models\ProductMaterial::where('product_id', $product->id)
            ->with('inventoryItem')
            ->get();

        if ($materials->isEmpty()) {
            $this->command->warn("  ⚠️  No BOM found for {$product->name}");
            return;
        }

        $this->command->info("  📦 Deducting materials for {$product->name} (Qty: {$quantity})");

        foreach ($materials as $material) {
            if (!$material->inventoryItem) {
                continue;
            }

            $requiredQty = $material->qty_per_unit * $quantity;
            $inventoryItem = $material->inventoryItem;
            
            // Check if sufficient stock
            if ($inventoryItem->quantity_on_hand < $requiredQty) {
                $this->command->warn("    ⚠️  Insufficient stock for {$inventoryItem->name}. Required: {$requiredQty}, Available: {$inventoryItem->quantity_on_hand}");
                // For demo purposes, we'll still deduct what we can
                $actualDeduction = $inventoryItem->quantity_on_hand;
            } else {
                $actualDeduction = $requiredQty;
            }

            // Deduct from inventory
            $inventoryItem->decrement('quantity_on_hand', $actualDeduction);

            // Create inventory usage record
            \App\Models\InventoryUsage::create([
                'inventory_item_id' => $inventoryItem->id,
                'date' => $acceptedDate->format('Y-m-d'),
                'qty_used' => $actualDeduction,
            ]);

            $this->command->info("    ✓ {$inventoryItem->name}: {$actualDeduction} {$inventoryItem->unit} (Remaining: {$inventoryItem->fresh()->quantity_on_hand})");
        }
    }
}
