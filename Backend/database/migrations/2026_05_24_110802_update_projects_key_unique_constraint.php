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
        Schema::table('projects', function (Blueprint $table) {
            // Drop old global unique index
            $table->dropUnique('projects_key_unique');
            
            // Add composite unique index for organization_id and key
            $table->unique(['organization_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Drop the composite unique index
            $table->dropUnique(['organization_id', 'key']);
            
            // Restore old global unique index
            $table->unique('key');
        });
    }
};
