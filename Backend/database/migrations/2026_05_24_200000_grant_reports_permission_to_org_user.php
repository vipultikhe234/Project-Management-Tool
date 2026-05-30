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
        $orgUser = DB::table('roles')->where('slug', 'org_user')->first();
        if (!$orgUser) {
            return;
        }

        $reportsSubModule = DB::table('sub_modules')->where('slug', 'reports_view')->first();
        if (!$reportsSubModule) {
            return;
        }

        DB::table('role_permissions')->updateOrInsert(
            ['role_id' => $orgUser->id, 'sub_module_id' => $reportsSubModule->id],
            ['is_allowed' => true, 'created_at' => now(), 'updated_at' => now()]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $orgUser = DB::table('roles')->where('slug', 'org_user')->first();
        $reportsSubModule = DB::table('sub_modules')->where('slug', 'reports_view')->first();

        if ($orgUser && $reportsSubModule) {
            DB::table('role_permissions')
                ->where('role_id', $orgUser->id)
                ->where('sub_module_id', $reportsSubModule->id)
                ->delete();
        }
    }
};
