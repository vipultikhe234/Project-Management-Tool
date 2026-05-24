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
        $orgAdmin = DB::table('roles')->where('slug', 'org_admin')->first();
        $orgUser = DB::table('roles')->where('slug', 'org_user')->first();

        if (!$orgAdmin || !$orgUser) {
            return;
        }

        // Sub-modules slug lists for each role
        $orgAdminAllowed = [
            'dashboard_view',
            'projects_view',
            'organizations_view',
            'users_view',
            'board_view',
            'backlog_view',
            'reports_view',
            'issues_view'
        ];

        $orgUserAllowed = [
            'dashboard_view',
            'projects_view',
            'board_view',
            'backlog_view',
            'issues_view'
        ];

        // 1. Grant to Org Admin
        $adminSubModules = DB::table('sub_modules')->whereIn('slug', $orgAdminAllowed)->get();
        foreach ($adminSubModules as $sub) {
            DB::table('role_permissions')->updateOrInsert(
                ['role_id' => $orgAdmin->id, 'sub_module_id' => $sub->id],
                ['is_allowed' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        // 2. Grant to Org User
        $userSubModules = DB::table('sub_modules')->whereIn('slug', $orgUserAllowed)->get();
        foreach ($userSubModules as $sub) {
            DB::table('role_permissions')->updateOrInsert(
                ['role_id' => $orgUser->id, 'sub_module_id' => $sub->id],
                ['is_allowed' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert permissions
    }
};
