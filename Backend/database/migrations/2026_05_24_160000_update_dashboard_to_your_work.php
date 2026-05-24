<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update Module name from Dashboard to Your Work
        DB::table('modules')->where('slug', 'dashboard')->update([
            'name' => 'Your Work'
        ]);

        // Update Sub-module route and name
        DB::table('sub_modules')->where('slug', 'dashboard_view')->update([
            'name' => 'Your Work',
            'route' => '/your-work'
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback
    }
};
