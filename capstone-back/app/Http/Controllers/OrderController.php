<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\Auth;
use App\Models\Production;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Models\OrderTracking;
use App\Services\XenditService;
use App\Services\MayaService;

class OrderController extends Controller
{
    public function checkout(Request $request)
    {
        $user = Auth::user(); // Get the authenticated user
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $cartItems = Cart::where('user_id', $user->id)->with('product')->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 400);
        }

        $totalPrice = 0;
        foreach ($cartItems as $item) {
            if (!$item->product || $item->product->stock < $item->quantity) {
                return response()->json(['message' => 'Stock unavailable for ' . $item->product->name], 400);
            }
            $totalPrice += $item->product->price * $item->quantity;
        }

        // Pre-check: ensure raw materials are sufficient based on BOM
        $shortages = [];
        foreach ($cartItems as $item) {
            $bom = ProductMaterial::where('product_id', $item->product_id)->get();
            foreach ($bom as $mat) {
                $requiredQty = $mat->qty_per_unit * $item->quantity;
                $inv = InventoryItem::find($mat->inventory_item_id);
                if ($inv && ($inv->quantity_on_hand < $requiredQty)) {
                    $shortages[] = [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product->name,
                        'sku' => $inv->sku,
                        'material_name' => $inv->name,
                        'on_hand' => $inv->quantity_on_hand,
                        'required' => $requiredQty,
                        'deficit' => max(0, $requiredQty - $inv->quantity_on_hand),
                    ];
                }
            }
        }
        if (!empty($shortages)) {
            return response()->json([
                'message' => 'Insufficient raw materials for this order',
                'shortages' => $shortages
            ], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'nullable|in:cod,maya',
            'shipping_address' => 'nullable|string|max:500',
            'contact_phone' => 'nullable|string|max:64',
            'transaction_ref' => 'nullable|string|max:128',
        ]);

        $paymentMethod = $validated['payment_method'] ?? 'cod';
        $paymentStatus = $paymentMethod === 'cod' ? 'cod_pending' : 'unpaid';

        return DB::transaction(function () use ($user, $cartItems, $totalPrice, $paymentMethod, $paymentStatus, $validated) {
            // Create order with checkout_date
            $order = Order::create([
                'user_id' => $user->id,
                'total_price' => $totalPrice,
                'status' => 'pending',
                'checkout_date' => now(),
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus,
                'transaction_ref' => $validated['transaction_ref'] ?? null,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
            ]);

            foreach ($cartItems as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'price' => $item->product->price
                ]);

                // Only reduce finished product stock for Alkansya (pre-made items)
                // For custom furniture (tables/chairs), stock will be deducted when production is completed
                if (str_contains(strtolower($item->product->name), 'alkansya')) {
                    $item->product->decrement('stock', $item->quantity);
                }

                // NOTE: Raw materials are NOT deducted during checkout
                // Materials will only be deducted when:
                // 1. Order is accepted by admin
                // 2. Production begins for custom furniture
                // 3. This ensures materials are only consumed for confirmed orders
            }

            // Clear cart
            // Create tracking for each order item
            foreach ($cartItems as $item) {
                $this->createOrderTracking($order->id, $item->product_id, $item->product);
            }

            Cart::where('user_id', $user->id)->delete();

            return response()->json(['message' => 'Checkout successful', 'order_id' => $order->id, 'order' => $order]);
        });
    }

    /**
     * Create order tracking for a product
     */
    private function createOrderTracking($orderId, $productId, $product)
    {
        // Determine tracking type based on product
        $trackingType = $this->determineTrackingType($product);
        
        // Calculate estimated dates
        $estimatedDates = $this->calculateEstimatedDates($product, $trackingType);

        OrderTracking::create([
            'order_id' => $orderId,
            'product_id' => $productId,
            'tracking_type' => $trackingType,
            'current_stage' => $trackingType === 'alkansya' ? 'Design' : 'Material Preparation',
            'status' => 'pending',
            'estimated_start_date' => $estimatedDates['start'],
            'estimated_completion_date' => $estimatedDates['completion'],
            'process_timeline' => $this->generateProcessTimeline($product, $trackingType),
        ]);
    }

    /**
     * Determine tracking type based on product
     */
    private function determineTrackingType($product)
    {
        $productName = strtolower($product->name);
        
        if (str_contains($productName, 'alkansya')) {
            return 'alkansya';
        } elseif (str_contains($productName, 'table') || str_contains($productName, 'chair')) {
            return 'custom';
        }
        
        return 'standard';
    }

    /**
     * Calculate estimated dates based on product type
     */
    private function calculateEstimatedDates($product, $trackingType)
    {
        $startDate = now();
        
        if ($trackingType === 'alkansya') {
            // Alkansya: 1-2 days production
            $completionDate = $startDate->copy()->addDays(2);
        } elseif ($trackingType === 'custom') {
            // Tables/Chairs: 1-2 weeks
            $completionDate = $startDate->copy()->addWeeks(2);
        } else {
            // Standard: 1 week
            $completionDate = $startDate->copy()->addWeek();
        }

        return [
            'start' => $startDate,
            'completion' => $completionDate,
        ];
    }

    /**
     * Generate process timeline based on product type
     */
    private function generateProcessTimeline($product, $trackingType)
    {
        if ($trackingType === 'alkansya') {
            return [
                [
                    'stage' => 'Design',
                    'description' => 'Creating design specifications',
                    'estimated_duration' => '30 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Preparation',
                    'description' => 'Preparing materials and tools',
                    'estimated_duration' => '45 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Cutting',
                    'description' => 'Cutting wood to specifications',
                    'estimated_duration' => '60 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Assembly',
                    'description' => 'Assembling components',
                    'estimated_duration' => '90 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Finishing',
                    'description' => 'Applying finish and polish',
                    'estimated_duration' => '45 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Quality Control',
                    'description' => 'Final inspection and testing',
                    'estimated_duration' => '30 minutes',
                    'status' => 'pending'
                ]
            ];
        } elseif ($trackingType === 'custom') {
            // Align to production dashboard stages
            return [
                [
                    'stage' => 'Material Preparation',
                    'description' => 'Selecting and preparing materials',
                    'estimated_duration' => '2-3 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Cutting & Shaping',
                    'description' => 'Precise cutting and shaping',
                    'estimated_duration' => '3-4 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Assembly',
                    'description' => 'Careful assembly process',
                    'estimated_duration' => '4-5 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Sanding & Surface Preparation',
                    'description' => 'Sanding and prepping surfaces',
                    'estimated_duration' => '1-2 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Finishing',
                    'description' => 'Finishes, coats, and polish',
                    'estimated_duration' => '2-3 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Quality Check & Packaging',
                    'description' => 'QA and packaging for dispatch',
                    'estimated_duration' => '1 day',
                    'status' => 'pending'
                ]
            ];
        }

        return [];
    }

    public function initPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'provider' => 'required|in:maya',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();


        // Maya via Maya Checkout (sandbox)
        if ($validated['provider'] === 'maya') {
            $maya = new MayaService();
            $referenceId = 'ORD-'.$order->id.'-'.now()->timestamp;
            $amount = (int) round($order->total_price);
            $frontend = env('FRONTEND_URL', 'http://localhost:3000');
            $payload = [
                'totalAmount' => [ 'value' => $amount, 'currency' => 'PHP' ],
                'buyer' => [
                    'firstName' => $user->name ?? 'Customer',
                    'email' => $user->email ?? 'customer@example.com',
                ],
                'items' => [[
                    'name' => 'Order #'.$order->id,
                    'quantity' => 1,
                    'amount' => [ 'value' => $amount ],
                    'totalAmount' => [ 'value' => $amount ],
                ]],
                'requestReferenceNumber' => $referenceId,
                'redirectUrl' => [
                    'success' => $frontend.'/cart?payment=success&provider=maya&order_id='.$order->id,
                    'failure' => $frontend.'/cart?payment=failed&provider=maya&order_id='.$order->id,
                    'cancel' => $frontend.'/cart?payment=cancel&provider=maya&order_id='.$order->id,
                ],
                'metadata' => [ 'order_id' => $order->id, 'user_id' => $user->id ],
            ];

            $resp = $maya->createCheckout($payload);
            $checkoutUrl = $resp['redirectUrl'] ?? $resp['checkoutUrl'] ?? null;

            $order->update([
                'payment_method' => 'maya',
                'payment_status' => 'unpaid',
                'transaction_ref' => $referenceId,
            ]);

            return response()->json([
                'checkout_url' => $checkoutUrl,
                'transaction_ref' => $order->transaction_ref,
            ]);
        }

        return response()->json(['message' => 'Unsupported provider'], 422);
    }

    public function verifyPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'transaction_ref' => 'required|string',
            'status' => 'required|in:paid,failed',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();
        if ($order->transaction_ref !== $validated['transaction_ref']) {
            return response()->json(['message' => 'Invalid transaction'], 422);
        }

        $order->payment_status = $validated['status'] === 'paid' ? 'paid' : 'failed';
        $order->save();

        return response()->json(['message' => 'Payment status updated', 'order' => $order]);
    }

    public function confirmPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'provider' => 'required|in:maya',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();

        // If webhook already marked paid, return
        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Already paid', 'order' => $order]);
        }

        // Optimistic confirmation on return from provider
        $order->payment_status = 'paid';
        $order->save();

        return response()->json(['message' => 'Payment confirmed', 'order' => $order]);
    }


    public function index()
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $orders = Order::with('user', 'items.product')->get();
        
        // Return empty array if no orders exist
        if ($orders->isEmpty()) {
            return response()->json([]);
        }

        return response()->json($orders);
    }

    public function myOrders()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json(Order::where('user_id', $user->id)->with('items.product')->get());
    }

    public function tracking($id)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $order = Order::with('items.product')->find($id);
            if (!$order || $order->user_id !== $user->id) {
                return response()->json(['message' => 'Order not found'], 404);
            }

            // Sync OrderTracking with Production data for accuracy
            $trackingService = app(\App\Services\ProductionTrackingService::class);
            $trackingService->syncOrderTrackingWithProduction($id);

            // IMPORTANT: Re-query tracking data after sync to get updated values
            // Get fresh tracking information from database
            $trackings = OrderTracking::where('order_id', $id)
                ->with(['product'])
                ->get();
        } catch (\Exception $e) {
            \Log::error('Tracking endpoint error:', [
                'order_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to fetch tracking information',
                'error' => $e->getMessage()
            ], 500);
        }

        if ($trackings->isEmpty()) {
            // Fallback to old production tracking if no order tracking exists
            $stages = ['Design','Preparation','Cutting','Assembly','Finishing','Quality Control'];
            $productions = Production::where('order_id', $order->id)->get();

            $stageSummary = collect($stages)->map(function ($s) use ($productions) {
                $items = $productions->where('stage', $s);
                return [
                    'stage' => $s,
                    'in_progress' => $items->where('status','In Progress')->count(),
                    'completed' => $items->where('status','Completed')->count(),
                    'pending' => $items->where('status','Pending')->count(),
                ];
            })->values();

            // Simple ETA: assume each stage takes 2 days per item
            $perStageDays = 2;
            $totalJobs = max(1, $productions->count());
            $completedJobs = $productions->where('status','Completed')->count();
            $inProgressJobs = $productions->where('status','In Progress')->count();
            $progressRatio = ($completedJobs + 0.5 * $inProgressJobs) / $totalJobs;
            $progressPct = round($progressRatio * 100);
            $estimatedTotalDays = count($stages) * $perStageDays; // coarse
            $remainingDays = max(0, round($estimatedTotalDays * (1 - $progressRatio)));
            $etaDate = now()->addDays($remainingDays)->toDateString();

            $overall = [
                'total' => $productions->count(),
                'completed' => $completedJobs,
                'pending' => $productions->where('status','Pending')->count(),
                'in_progress' => $inProgressJobs,
                'progress_pct' => $progressPct,
                'eta' => $etaDate,
            ];

            return response()->json([
                'order' => $order,
                'stage_summary' => $stageSummary,
                'productions' => $productions,
                'overall' => $overall,
            ]);
        }

        // Use new OrderTracking system
        $stageSummary = collect();
        $totalProgress = 0;
        $totalItems = $trackings->count();
        $completedItems = 0;
        $inProgressItems = 0;

        foreach ($trackings as $tracking) {
            // Update current stage based on progress
            $tracking->updateCurrentStageBasedOnProgress();
            
            $totalProgress += $tracking->progress_percentage;
            
            if ($tracking->status === 'completed') {
                $completedItems++;
            } elseif ($tracking->status === 'in_production') {
                $inProgressItems++;
            }

            // Build stage summary - only include current stage
            if ($tracking->current_stage) {
                $existingStageIndex = $stageSummary->search(function($item) use ($tracking) {
                    return $item['stage'] === $tracking->current_stage;
                });
                
                if ($existingStageIndex !== false) {
                    // Update existing stage
                    $existingStage = $stageSummary[$existingStageIndex];
                    $existingStage['pending'] += $tracking->status === 'pending' ? 1 : 0;
                    $existingStage['in_progress'] += $tracking->status === 'in_progress' ? 1 : 0;
                    $existingStage['completed'] += $tracking->status === 'completed' ? 1 : 0;
                    $stageSummary[$existingStageIndex] = $existingStage;
                } else {
                    // Add current stage only
                    $stageSummary->push([
                        'stage' => $tracking->current_stage,
                        'pending' => $tracking->status === 'pending' ? 1 : 0,
                        'in_progress' => $tracking->status === 'in_progress' ? 1 : 0,
                        'completed' => $tracking->status === 'completed' ? 1 : 0,
                    ]);
                }
            }
        }

        $avgProgress = $totalItems > 0 ? round($totalProgress / $totalItems) : 0;
        $etaDate = $trackings->max('estimated_completion_date')?->format('Y-m-d') ?? now()->addDays(7)->format('Y-m-d');

        $overall = [
            'total' => $totalItems,
            'completed' => $completedItems,
            'pending' => $totalItems - $completedItems - $inProgressItems,
            'in_progress' => $inProgressItems,
            'progress_pct' => $avgProgress,
            'eta' => $etaDate,
        ];

        // Get detailed tracking info for each product with process timeline
        $trackingDetails = $trackings->map(function($tracking) use ($trackingService) {
            $production = Production::where('order_id', $tracking->order_id)
                ->where('product_id', $tracking->product_id)
                ->with('processes')
                ->first();
            
            $progress = $production ? 
                $trackingService->calculateProgressFromProduction($production) : 
                $tracking->progress_percentage;
            
            $eta = $production ? 
                $trackingService->calculatePredictiveETA($production) : 
                $tracking->estimated_completion_date;

            // Check if this is a table or chair (tracked products)
            $productName = $tracking->product->name ?? '';
            $isTrackedProduct = stripos($productName, 'table') !== false || 
                               stripos($productName, 'chair') !== false;

            // Get production processes for table and chair only
            $processes = null;
            
            \Log::info('Processing tracking for product:', [
                'product_name' => $productName,
                'is_tracked' => $isTrackedProduct,
                'has_production' => !!$production,
                'production_id' => $production?->id,
                'has_processes' => $production && $production->processes ? $production->processes->count() : 0
            ]);
            
            if ($isTrackedProduct && $production && $production->processes) {
                $processes = $production->processes->map(function($process) {
                    $processData = [
                        'id' => $process->id,
                        'process_name' => $process->process_name,
                        'status' => $process->status,
                        'started_at' => $process->started_at,
                        'completed_at' => $process->completed_at,
                        'estimated_duration_minutes' => $process->estimated_duration_minutes,
                        'delay_reason' => $process->delay_reason,
                        'is_delayed' => $process->is_delayed,
                        'actual_completion_date' => $process->actual_completion_date,
                        'completed_by_name' => $process->completed_by_name,
                    ];
                    
                    if ($process->delay_reason) {
                        \Log::info('Delayed process found:', $processData);
                    }
                    
                    return $processData;
                })->toArray();
                
                \Log::info('Total processes returned:', ['count' => count($processes)]);
            } else {
                \Log::warning('Processes not included because:', [
                    'is_tracked_product' => $isTrackedProduct,
                    'has_production' => !!$production,
                    'has_processes' => $production && $production->processes ? 'yes' : 'no'
                ]);
            }

            return [
                'product_name' => $productName,
                'current_stage' => $tracking->current_stage,
                'status' => $tracking->status,
                'progress_percentage' => $progress,
                'estimated_completion_date' => $eta,
                'tracking_type' => $tracking->tracking_type,
                'process_timeline' => $tracking->process_timeline,
                'processes' => $processes, // Add production processes
                'is_tracked_product' => $isTrackedProduct,
                'days_remaining' => $eta ? 
                    max(0, now()->diffInDays($eta, false)) : 0,
            ];
        });

        // Debug logging
        \Log::info('Order tracking data:', [
            'order_id' => $id,
            'trackings_count' => $trackings->count(),
            'stage_summary_count' => $stageSummary->count(),
            'stage_summary' => $stageSummary->toArray(),
            'tracking_details' => $trackingDetails
        ]);

        return response()->json([
            'order' => $order,
            'overall' => $overall,
            'trackings' => $trackingDetails,
            'stage_summary' => $stageSummary->values(), // Include stage breakdown
            'acceptance_status' => $order->acceptance_status,
            'accepted_at' => $order->accepted_at,
            'accepted_by' => $order->acceptedBy ? $order->acceptedBy->name : null,
            'rejection_reason' => $order->rejection_reason,
            'simplified' => true, // Flag to indicate simplified response
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::with('items.product', 'user')->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Ensure items contain product details
        $order->items->each(function ($item) {
            $item->product_name = $item->product->name ?? 'Unknown Product';
        });

        return response()->json($order);
    }


    public function markAsComplete($id)
    {
        $user = Auth::user();

        // Only employees can mark an order as complete
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find the order
        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Update the order status
        $order->status = 'completed';
        $order->save();

        // Create notification for customer
        $productNames = $order->items->pluck('product.name')->unique()->join(', ');
        \App\Models\Notification::create([
            'user_id' => $order->user_id,
            'order_id' => $order->id,
            'type' => 'completed',
            'title' => '✅ Order Completed!',
            'message' => "Your order #{$order->id} ({$productNames}) has been completed. Thank you for your business! We hope you enjoy your new furniture.",
        ]);

        return response()->json(['message' => 'Order marked as complete', 'order' => $order->load(['user', 'items.product'])]);
    }

    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        // Only employees can update order status
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,processing,ready_for_delivery,delivered,completed,cancelled',
            'cancellation_reason' => 'nullable|string|max:500'
        ]);

        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $oldStatus = $order->status;
        $newStatus = $validated['status'];
        
        $order->status = $newStatus;
        
        // Handle cancellation reason
        if ($newStatus === 'cancelled' && isset($validated['cancellation_reason'])) {
            $order->cancellation_reason = $validated['cancellation_reason'];
        }
        
        $order->save();

        // Create notification for customer based on status change
        if ($oldStatus !== $newStatus) {
            $productNames = $order->items->pluck('product.name')->unique()->join(', ');
            
            try {
                $notificationData = null;
                
                switch ($newStatus) {
                    case 'processing':
                        $notificationData = [
                            'type' => 'processing',
                            'title' => '⚙️ Order In Production!',
                            'message' => "Your order #{$order->id} ({$productNames}) has been accepted and is now in production. We'll keep you updated on the progress!",
                        ];
                        break;
                        
                    case 'ready_for_delivery':
                        $notificationData = [
                            'type' => 'ready_for_delivery',
                            'title' => '📦 Order Ready for Delivery!',
                            'message' => "Great news! Your order #{$order->id} ({$productNames}) is ready for delivery. We'll contact you soon to arrange delivery.",
                        ];
                        break;
                        
                    case 'delivered':
                        $notificationData = [
                            'type' => 'delivered',
                            'title' => '🚚 Order Delivered!',
                            'message' => "Your order #{$order->id} ({$productNames}) has been successfully delivered. Thank you for choosing Unick Furniture!",
                        ];
                        break;
                        
                    case 'completed':
                        $notificationData = [
                            'type' => 'completed',
                            'title' => '✅ Order Completed!',
                            'message' => "Your order #{$order->id} ({$productNames}) has been completed. Thank you for your business! We hope you enjoy your new furniture.",
                        ];
                        break;
                        
                    case 'cancelled':
                        $notificationData = [
                            'type' => 'cancelled',
                            'title' => '❌ Order Cancelled',
                            'message' => "Your order #{$order->id} ({$productNames}) has been cancelled. If you have any questions, please contact us.",
                        ];
                        break;
                }
                
                if ($notificationData) {
                    $notification = \App\Models\Notification::create([
                        'user_id' => $order->user_id,
                        'order_id' => $order->id,
                        'type' => $notificationData['type'],
                        'title' => $notificationData['title'],
                        'message' => $notificationData['message'],
                    ]);
                    
                    \Log::info('Status change notification created', [
                        'notification_id' => $notification->id,
                        'user_id' => $order->user_id,
                        'order_id' => $order->id,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to create status change notification', [
                    'error' => $e->getMessage(),
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'status' => $newStatus
                ]);
            }
        }

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

    public function markAsReadyForDelivery($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->status = 'ready_for_delivery';
        $order->save();

        // Create notification for customer
        $productNames = $order->items->pluck('product.name')->unique()->join(', ');
        
        try {
            $notification = \App\Models\Notification::create([
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'type' => 'ready_for_delivery',
                'title' => '📦 Order Ready for Delivery!',
                'message' => "Great news! Your order #{$order->id} ({$productNames}) is ready for delivery. We'll contact you soon to arrange delivery.",
            ]);
            
            \Log::info('Notification created successfully', [
                'notification_id' => $notification->id,
                'user_id' => $order->user_id,
                'order_id' => $order->id
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create notification', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
                'user_id' => $order->user_id
            ]);
        }

        return response()->json([
            'message' => 'Order marked as ready for delivery',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

    public function markAsDelivered($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->status = 'delivered';
        $order->save();

        // Create notification for customer
        $productNames = $order->items->pluck('product.name')->unique()->join(', ');
        
        try {
            $notification = \App\Models\Notification::create([
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'type' => 'delivered',
                'title' => '🚚 Order Delivered!',
                'message' => "Your order #{$order->id} ({$productNames}) has been successfully delivered. Thank you for choosing Unick Furniture!",
            ]);
            
            \Log::info('Delivered notification created', [
                'notification_id' => $notification->id,
                'user_id' => $order->user_id,
                'order_id' => $order->id
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create delivered notification', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
                'user_id' => $order->user_id
            ]);
        }

        return response()->json([
            'message' => 'Order marked as delivered',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

    /**
     * Check production completion status for an order
     */
    public function checkProductionStatus($orderId)
    {
        try {
            $order = Order::with(['items.product', 'productions.processes'])->findOrFail($orderId);
            
            // Check if order has table or chair items (specifically wooden furniture)
            $hasTrackedProducts = $order->items->some(function ($item) {
                if (!$item->product || !$item->product->name) {
                    return false;
                }
                $productName = strtolower($item->product->name);
                return str_contains($productName, 'table') || 
                       str_contains($productName, 'chair') ||
                       str_contains($productName, 'wooden') ||
                       str_contains($productName, 'furniture');
            });
            
            // Log for debugging
            \Log::info('Production status check', [
                'order_id' => $orderId,
                'has_tracked_products' => $hasTrackedProducts,
                'items' => $order->items->map(function($item) {
                    return [
                        'product_name' => $item->product->name ?? 'No product',
                        'product_id' => $item->product_id
                    ];
                })->toArray()
            ]);
            
            if (!$hasTrackedProducts) {
                return response()->json([
                    'isCompleted' => true,
                    'message' => 'No production tracking required for this order',
                    'details' => 'This order does not contain wooden furniture items'
                ]);
            }
            
            // Check if all productions are completed
            $productions = $order->productions;
            
            if ($productions->isEmpty()) {
                return response()->json([
                    'isCompleted' => false,
                    'message' => 'Production not started yet',
                    'details' => 'Production records will be created when manufacturing begins',
                    'stage' => 'Not Started'
                ]);
            }
            
            $allCompleted = true;
            $incompleteProductions = [];
            
            foreach ($productions as $production) {
                if ($production->status !== 'Completed') {
                    $allCompleted = false;
                    
                    // Get detailed production stages
                    $stages = $production->processes()->orderBy('process_order')->get();
                    $currentStage = $stages->firstWhere('status', 'in_progress');
                    $completedStages = $stages->where('status', 'completed')->count();
                    $totalStages = $stages->count();
                    
                    $incompleteProductions[] = [
                        'id' => $production->id,
                        'product' => $production->product->name,
                        'status' => $production->status,
                        'current_stage' => $production->current_stage,
                        'progress' => $production->overall_progress,
                        'stages' => [
                            'completed' => $completedStages,
                            'total' => $totalStages,
                            'current_stage_name' => $currentStage ? $currentStage->process_name : 'Pending',
                            'current_stage_status' => $currentStage ? $currentStage->status : 'pending'
                        ]
                    ];
                }
            }
            
            if ($allCompleted) {
                return response()->json([
                    'isCompleted' => true,
                    'message' => 'All wooden furniture production completed successfully',
                    'details' => 'All items are ready for delivery',
                    'stage' => 'Completed'
                ]);
            } else {
                $woodenItems = collect($incompleteProductions)->filter(function($item) {
                    $productName = strtolower($item['product']);
                    return str_contains($productName, 'wooden') || 
                           str_contains($productName, 'chair') || 
                           str_contains($productName, 'table');
                });
                
                $message = 'Wooden furniture production in progress. ';
                if ($woodenItems->isNotEmpty()) {
                    $message .= 'Incomplete wooden items: ' . $woodenItems->pluck('product')->join(', ');
                    $currentStages = $woodenItems->map(function($item) {
                        return $item['stages']['current_stage_name'] . ' (' . $item['stages']['completed'] . '/' . $item['stages']['total'] . ' stages)';
                    })->join(', ');
                    $message .= ' (Current stage: ' . $currentStages . ')';
                } else {
                    $message .= 'Incomplete items: ' . collect($incompleteProductions)->pluck('product')->join(', ');
                    $message .= ' (Status: ' . collect($incompleteProductions)->pluck('status')->join(', ') . ')';
                }
                
                // Get the most current production stage
                $currentStage = 'Unknown';
                $overallProgress = 0;
                if (!empty($incompleteProductions)) {
                    $firstProduction = $incompleteProductions[0];
                    $currentStage = $firstProduction['stages']['current_stage_name'];
                    $overallProgress = $firstProduction['progress'];
                }
                
                return response()->json([
                    'isCompleted' => false,
                    'message' => $message,
                    'details' => "Current stage: {$currentStage}",
                    'stage' => $currentStage,
                    'progress' => $overallProgress,
                    'incompleteProductions' => $incompleteProductions,
                    'woodenItems' => $woodenItems->values()->toArray()
                ]);
            }
            
        } catch (\Exception $e) {
            \Log::error('Error checking production status', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'isCompleted' => false,
                'message' => 'Unable to check production status: ' . $e->getMessage()
            ], 500);
        }
    }

}