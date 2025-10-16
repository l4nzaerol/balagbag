<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\UsageController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\OrderTrackingController;
use App\Http\Controllers\AdminOverviewController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\ProductionTrackingController;
use App\Http\Controllers\OrderAcceptanceController;
use App\Http\Controllers\PriceCalculatorController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\SalesAnalyticsController;
use App\Http\Controllers\AlkansyaDailyOutputController;
use App\Http\Controllers\AutoDeductionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AnalyticsController;

use App\Models\Production;
use Illuminate\Support\Facades\DB;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public Profile Routes (no auth required)

// Advanced Analytics Routes (Public for testing - move inside auth if needed)
Route::get('/analytics/production-output', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getProductionOutputAnalytics']);
Route::get('/analytics/resource-utilization', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getResourceUtilization']);
Route::get('/analytics/production-performance', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getProductionPerformance']);
Route::get('/analytics/predictive', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getPredictiveAnalytics']);
Route::get('/analytics/material-usage-trends', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getMaterialUsageTrends']);
Route::get('/analytics/automated-stock-report', [\App\Http\Controllers\AdvancedAnalyticsController::class, 'getAutomatedStockReport']);

// Predictive Analytics Routes
Route::get('/analytics/material-usage-forecast', [AnalyticsController::class, 'getMaterialUsageForecast']);
Route::get('/analytics/inventory-replenishment-forecast', [AnalyticsController::class, 'getInventoryReplenishmentForecast']);
Route::get('/analytics/stock-status-predictions', [AnalyticsController::class, 'getStockStatusPredictions']);
Route::get('/analytics/seasonal-trends', [AnalyticsController::class, 'getSeasonalTrends']);
Route::get('/analytics/demand-patterns', [AnalyticsController::class, 'getDemandPatterns']);

// Sales Analytics Routes
Route::get('/analytics/sales-dashboard', [SalesAnalyticsController::class, 'getSalesDashboard']);
Route::get('/analytics/sales-report', [SalesAnalyticsController::class, 'getSalesReport']);
Route::get('/analytics/sales-process', [SalesAnalyticsController::class, 'getSalesProcessAnalytics']);
Route::get('/analytics/product-performance', [SalesAnalyticsController::class, 'getProductPerformance']);
Route::get('/analytics/sales-export', [SalesAnalyticsController::class, 'exportSalesData']);

// Test route for debugging
Route::get('/test-alkansya', function() {
    $count = \App\Models\AlkansyaDailyOutput::count();
    $total = \App\Models\AlkansyaDailyOutput::sum('quantity_produced');
    return response()->json([
        'count' => $count,
        'total' => $total,
        'message' => 'Test successful'
    ]);
});

// Test statistics route
Route::get('/test-alkansya-stats', function() {
    $totalOutput = \App\Models\AlkansyaDailyOutput::sum('quantity_produced');
    $totalDays = \App\Models\AlkansyaDailyOutput::count();
    $averageDaily = $totalDays > 0 ? $totalOutput / $totalDays : 0;
    
    $last7Days = \App\Models\AlkansyaDailyOutput::where('date', '>=', \Carbon\Carbon::now()->subDays(7))
        ->sum('quantity_produced');
    
    return response()->json([
        'total_output' => $totalOutput,
        'total_days' => $totalDays,
        'average_daily' => round($averageDaily, 2),
        'last_7_days' => $last7Days,
        'message' => 'Statistics test successful'
    ]);
});

// Test inventory reports endpoint
Route::get('/test-inventory-reports', function() {
    return response()->json([
        'status' => 'success',
        'message' => 'Inventory reports API is working',
        'timestamp' => now(),
        'available_endpoints' => [
            '/inventory/dashboard',
            '/inventory/report',
            '/inventory/consumption-trends',
            '/inventory/replenishment-schedule',
            '/inventory/forecast',
            '/inventory/turnover-report',
            '/inventory/alkansya-daily-output/statistics',
            '/inventory/alkansya-daily-output/materials-analysis'
        ]
    ]);
});

// Temporary public statistics route for testing
Route::get('/alkansya-daily-output/statistics', [\App\Http\Controllers\AlkansyaDailyOutputController::class, 'statistics']);

// Public inventory routes for testing
Route::get('/inventory/dashboard', [InventoryController::class, 'getDashboardData']);
Route::get('/inventory/report', [InventoryController::class, 'getInventoryReport']);
Route::get('/inventory/consumption-trends', [InventoryController::class, 'getConsumptionTrends']);
Route::get('/inventory/replenishment-schedule', [InventoryController::class, 'getReplenishmentSchedule']);
Route::get('/inventory/forecast', [InventoryController::class, 'getMaterialForecast']);
Route::get('/inventory/turnover-report', [InventoryController::class, 'getTurnoverReport']);
Route::get('/inventory/alkansya-daily-output/statistics', [AlkansyaDailyOutputController::class, 'statistics']);
Route::get('/inventory/alkansya-daily-output/materials-analysis', [AlkansyaDailyOutputController::class, 'materialsAnalysis']);

// Public product routes for customer dashboard
Route::get('/products', [ProductController::class, 'index']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Product Routes
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/products/{id}/materials', [ProductController::class, 'getMaterials']);
    Route::post('/products/{id}/materials', [ProductController::class, 'setMaterials']);
    Route::get('/products/{id}/materials/export', [ProductController::class, 'exportMaterialsCsv']);
    Route::post('/products/{id}/materials/import', [ProductController::class, 'importMaterialsCsv']);

    // Cart Routes
    Route::post('/cart', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'viewCart']);
    Route::put('/cart/{id}', [CartController::class, 'update']);
    Route::delete('/cart/{id}', [CartController::class, 'removeFromCart']);

    // Order Routes
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::post('/payments/init', [OrderController::class, 'initPayment']);
    Route::post('/payments/verify', [OrderController::class, 'verifyPayment']);
    Route::post('/payments/confirm', [OrderController::class, 'confirmPayment']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    
    // Order Acceptance Routes (Admin only) - MUST be before /orders/{id}
    Route::get('/orders/pending-acceptance', [OrderAcceptanceController::class, 'getPendingOrders']);
    Route::get('/orders/accepted', [OrderAcceptanceController::class, 'getAcceptedOrders']);
    Route::get('/orders/rejected', [OrderAcceptanceController::class, 'getRejectedOrders']);
    Route::get('/orders/acceptance/statistics', [OrderAcceptanceController::class, 'getStatistics']);
    Route::post('/orders/{id}/accept', [OrderAcceptanceController::class, 'acceptOrder']);
    Route::post('/orders/{id}/reject', [OrderAcceptanceController::class, 'rejectOrder']);
    
    // Order Delivery Routes (Admin only)
    Route::post('/orders/{id}/mark-ready-for-delivery', [\App\Http\Controllers\OrderDeliveryController::class, 'markReadyForDelivery']);
    Route::post('/orders/{id}/mark-delivered', [\App\Http\Controllers\OrderDeliveryController::class, 'markDelivered']);
    
    // Specific order routes
    Route::get('/orders/{id}/tracking', [OrderController::class, 'tracking']);
    Route::get('/orders/{id}/payment-status', function($id){
        $order = \App\Models\Order::select('id','payment_status')->find($id);
        return $order ? response()->json($order) : response()->json(['message'=>'Not found'],404);
    });
    Route::put('/orders/{id}/complete', [OrderController::class, 'markAsComplete']);
    Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::get('/orders/{id}/production-status', [OrderController::class, 'checkProductionStatus']);
    Route::put('/orders/{id}/ready-for-delivery', [OrderController::class, 'markAsReadyForDelivery']);
    Route::put('/orders/{id}/delivered', [OrderController::class, 'markAsDelivered']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Notification Routes
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::put('/notifications/mark-all-read', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\NotificationController::class, 'destroy']);

    // Inventory Routes (Protected - for authenticated users)
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::put('/inventory/{id}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);
    Route::get('/inventory/reorder-items', [InventoryController::class, 'getReorderItems']);
    Route::get('/inventory/daily-usage', [InventoryController::class, 'getDailyUsage']);
    Route::get('/inventory/alkansya-daily-output', [AlkansyaDailyOutputController::class, 'index']);
    Route::post('/inventory/alkansya-daily-output', [AlkansyaDailyOutputController::class, 'store']);
    
    // Price Calculator Routes
    Route::post('/price-calculator/calculate', [PriceCalculatorController::class, 'calculatePrice']);
    Route::get('/price-calculator/product/{productId}', [PriceCalculatorController::class, 'calculateProductPrice']);
    Route::get('/price-calculator/presets', [PriceCalculatorController::class, 'getPricingPresets']);
    Route::post('/price-calculator/bulk', [PriceCalculatorController::class, 'bulkCalculate']);
    
    // Inventory Reports (NEW)
    Route::get('/inventory/abc-analysis', [InventoryController::class, 'getABCAnalysis']);

    // Usage
    Route::get('/usage', [UsageController::class, 'index']);
    Route::post('/usage', [UsageController::class, 'store']);

    // Reports
    Route::get('/replenishment', [ReportController::class, 'replenishment']);
    Route::get('/forecast', [ReportController::class, 'forecast']);
    Route::get('/reports/stock.csv', [ReportController::class, 'stockCsv']);
    Route::get('/reports/usage.csv', [ReportController::class, 'usageCsv']);
    Route::get('/reports/replenishment.csv', [ReportController::class, 'replenishmentCsv']);
    Route::get('/reports/inventory-overview', [ReportController::class, 'inventoryOverview']);
    Route::get('/reports/inventory-overview.csv', [ReportController::class, 'inventoryOverviewCsv']);
    Route::get('/reports/turnover', [ReportController::class, 'turnover']);
    Route::get('/reports/turnover.csv', [ReportController::class, 'turnoverCsv']);
    Route::get('/reports/replenishment-schedule', [ReportController::class, 'replenishmentSchedule']);
    Route::get('/reports/replenishment-schedule.csv', [ReportController::class, 'replenishmentScheduleCsv']);
    Route::get('/reports/production.csv', [ReportController::class, 'productionCsv']);

    // Productions
    Route::get('/productions', [ProductionController::class, 'index']);
    Route::get('/productions/analytics', [ProductionController::class, 'analytics']);
    Route::get('/productions/predictive', [ProductionController::class, 'predictiveAnalytics']);
    Route::get('/productions/daily-summary', [ProductionController::class, 'dailySummary']);
    Route::get('/productions/dashboard', [ProductionController::class, 'dashboard']);
    Route::get('/productions/efficiency-report', [ProductionController::class, 'efficiencyReport']);
    Route::get('/productions/capacity-utilization', [ProductionController::class, 'capacityUtilization']);
    Route::get('/productions/resource-allocation', [ProductionController::class, 'resourceAllocation']);
    Route::get('/productions/performance-metrics', [ProductionController::class, 'performanceMetrics']);
    Route::post('/productions', [ProductionController::class, 'store']);
    Route::post('/productions/start', [ProductionController::class, 'startProduction']);
    Route::post('/productions/batch', [ProductionController::class, 'createBatch']);
    Route::patch('/productions/{id}', [ProductionController::class, 'update']);
    Route::patch('/productions/{id}/priority', [ProductionController::class, 'updatePriority']);
    Route::patch('/productions/{productionId}/processes/{processId}', [ProductionController::class, 'updateProcess']);
    Route::get('/productions/{id}', [ProductionController::class, 'show']);
    Route::get('/productions/{id}/timeline', [ProductionController::class, 'getTimeline']);
    Route::delete('/productions/{id}', [ProductionController::class, 'destroy']);
    
    // Production Analytics Routes
    Route::get('/production-analytics', [App\Http\Controllers\ProductionAnalyticsController::class, 'analytics']);

    // Production Tracking Routes
    Route::group(['prefix' => 'production-tracking'], function () {
        Route::get('/dashboard', [ProductionTrackingController::class, 'dashboard']);
        Route::get('/analytics/predictive', [ProductionTrackingController::class, 'predictiveAnalytics']);
        Route::get('/', [ProductionTrackingController::class, 'index']);
        Route::post('/', [ProductionTrackingController::class, 'store']);
        Route::get('/{id}', [ProductionTrackingController::class, 'show']);
        Route::put('/{id}', [ProductionTrackingController::class, 'update']);
        Route::post('/{id}/start-stage', [ProductionTrackingController::class, 'startStage']);
        Route::post('/{id}/complete-stage', [ProductionTrackingController::class, 'completeStage']);
        Route::post('/{id}/update-progress', [ProductionTrackingController::class, 'updateStageProgress']);
        Route::post('/reports/generate', [ProductionTrackingController::class, 'generateReport']);
    });

    // ✅ Analytics: Top Users
    Route::get('/top-users', function () {
        $topUsers = Production::select('user_id', DB::raw('SUM(quantity) as total_quantity'))
            ->with('user:id,name')
            ->groupBy('user_id')
            ->orderByDesc('total_quantity')
            ->take(5)
            ->get()
            ->map(function ($row) {
                return [
                    'user_name' => $row->user->name,
                    'quantity'  => $row->total_quantity,
                ];
            });

        return response()->json($topUsers);
    });

    // Order Tracking Routes
    Route::get('/order-tracking/{orderId}', [OrderTrackingController::class, 'getTracking']);
    Route::post('/order-tracking', [OrderTrackingController::class, 'createTracking']);
    Route::patch('/order-tracking/{trackingId}', [OrderTrackingController::class, 'updateTracking']);
    Route::get('/order-tracking/{orderId}/customer', [OrderTrackingController::class, 'getCustomerTracking']);
    Route::get('/order-tracking/stats', [OrderTrackingController::class, 'getTrackingStats']);

    // Admin Overview
    Route::get('/admin/overview', [AdminOverviewController::class, 'index']);

    // Staff Routes (accessible by staff and admin)
    Route::prefix('staff')->group(function () {
        Route::get('/dashboard', [StaffController::class, 'getDashboard']);
        Route::get('/my-tasks', [StaffController::class, 'getMyTasks']);
        Route::patch('/production-stage/{stageId}', [StaffController::class, 'updateProductionStage']);
    });

    // Alkansya Daily Output Routes
    Route::prefix('alkansya-daily-output')->group(function () {
        Route::get('/', [AlkansyaDailyOutputController::class, 'index']);
        Route::post('/', [AlkansyaDailyOutputController::class, 'store']);
        Route::get('/statistics', [AlkansyaDailyOutputController::class, 'statistics']);
        Route::get('/materials-analysis', [AlkansyaDailyOutputController::class, 'materialsAnalysis']);
        Route::delete('/clear-date', [AlkansyaDailyOutputController::class, 'clearDate']); // For debugging
    });

    // Auto Deduction Routes
    Route::prefix('auto-deduction')->group(function () {
        Route::post('/production', [AutoDeductionController::class, 'deductForProduction']);
        Route::post('/alkansya-daily', [AutoDeductionController::class, 'deductForAlkansyaDailyOutput']);
        Route::get('/history', [AutoDeductionController::class, 'getDeductionHistory']);
        Route::get('/consumption-analysis', [AutoDeductionController::class, 'getConsumptionAnalysis']);
    });

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'getProfile']);
    Route::put('/profile', [ProfileController::class, 'updateProfile']);
    Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);
});

// Webhooks (no auth)
Route::post('/webhooks/xendit', [PaymentWebhookController::class, 'handleXendit']);
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);
Route::post('/webhooks/maya', [PaymentWebhookController::class, 'handleMaya']);
