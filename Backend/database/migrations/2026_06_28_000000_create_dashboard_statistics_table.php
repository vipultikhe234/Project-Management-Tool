<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dashboard_statistics', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('organization_uuid')->nullable()->index();
            $table->string('role_slug')->nullable();
            $table->json('stats')->nullable(); // JSON stats
            $table->json('recent_activities')->nullable(); // Caching recent activity JSON array
            $table->json('critical_issues')->nullable(); // Caching critical issues JSON array
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dashboard_statistics');
    }
};
