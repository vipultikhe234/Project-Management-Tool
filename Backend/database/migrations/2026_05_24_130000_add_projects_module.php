<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if module already exists to prevent duplicate
        $existingModule = DB::table('modules')->where('slug', 'projects')->first();
        if ($existingModule) {
            return;
        }

        // Insert Projects module
        $moduleId = DB::table('modules')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'name' => 'Projects',
            'slug' => 'projects',
            'icon' => 'Folder',
            'sort_order' => 2, // Sort after Dashboard
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Shift other module sort orders if needed
        DB::table('modules')->where('id', '!=', $moduleId)->where('sort_order', '>=', 2)->increment('sort_order');

        // Insert Projects view sub-module
        $subModuleId = DB::table('sub_modules')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'module_id' => $moduleId,
            'name' => 'Manage Projects',
            'slug' => 'projects_view',
            'route' => '/projects',
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Grant permission to all existing roles
        $roles = DB::table('roles')->get();
        foreach ($roles as $role) {
            DB::table('role_permissions')->insertOrIgnore([
                'role_id' => $role->id,
                'sub_module_id' => $subModuleId,
                'is_allowed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $module = DB::table('modules')->where('slug', 'projects')->first();
        if ($module) {
            DB::table('sub_modules')->where('module_id', $module->id)->delete();
            DB::table('modules')->where('id', $module->id)->delete();
        }
    }
};
