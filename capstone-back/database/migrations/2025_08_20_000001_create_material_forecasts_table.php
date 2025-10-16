<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->string('forecast_method'); // moving_average, consumption_rate, weighted_average
            $table->integer('forecast_days');
            $table->decimal('forecasted_usage', 12, 2);
            $table->decimal('confidence_score', 5, 2); // 0.00 to 1.00
            $table->string('confidence_level'); // low, medium, high
            $table->json('method_details'); // Store method-specific parameters
            $table->json('forecast_breakdown'); // Store individual method results
            $table->date('forecast_date');
            $table->date('forecast_period_start');
            $table->date('forecast_period_end');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['inventory_item_id', 'forecast_date']);
            $table->index(['forecast_method', 'confidence_level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_forecasts');
    }
};
