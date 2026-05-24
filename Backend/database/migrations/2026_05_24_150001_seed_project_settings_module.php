<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if module already exists to prevent duplicate
        $existingModule = DB::table('modules')->where('slug', 'project_settings')->first();
        if ($existingModule) {
            return;
        }

        // Insert module
        $moduleId = DB::table('modules')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'name' => 'Project Settings',
            'slug' => 'project_settings',
            'icon' => 'Settings',
            'sort_order' => 10, // Sort at the bottom
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert sub-module
        $subModuleId = DB::table('sub_modules')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'module_id' => $moduleId,
            'name' => 'Project Workflow',
            'slug' => 'project_settings_view',
            'route' => '/project-settings',
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Grant permissions ONLY to Super Admin (ID 1) and Org Admin (ID 2)
        $rolesToGrant = DB::table('roles')->whereIn('slug', ['admin', 'org_admin'])->get();
        foreach ($rolesToGrant as $role) {
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
        $module = DB::table('modules')->where('slug', 'project_settings')->first();
        if ($module) {
            DB::table('sub_modules')->where('module_id', $module->id)->delete();
            DB::table('modules')->where('id', $module->id)->delete();
        }
    }
};
