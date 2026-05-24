<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Module;
use App\Models\SubModule;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;

echo "=== Dynamic RBAC Automated Testing ===\n";

// 1. Create a dummy parent module
$module = Module::updateOrCreate(
    ['slug' => 'test_settings'],
    [
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'name' => 'Test Settings',
        'icon' => 'Settings',
        'sort_order' => 99,
    ]
);
echo "1. Parent Module count: " . Module::count() . " (created: {$module->name})\n";

// 2. Create a dummy sub-module
$subModule = SubModule::updateOrCreate(
    ['slug' => 'test_workspace_setup'],
    [
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'module_id' => $module->id,
        'name' => 'Test Workspace Setup',
        'route' => '/settings/workspace',
        'sort_order' => 1,
    ]
);
echo "2. Sub Module count: " . SubModule::count() . " (created: {$subModule->name})\n";

// 3. Toggle permission for Org User role
$orgUserRole = Role::where('slug', 'org_user')->first();
if (!$orgUserRole) {
    echo "ERROR: Org User Role not found!\n";
    exit(1);
}

// Set allowed = true
RolePermission::updateOrCreate(
    [
        'role_id' => $orgUserRole->id,
        'sub_module_id' => $subModule->id,
    ],
    [
        'is_allowed' => true,
    ]
);
echo "3. Permitted '/settings/workspace' to Org User role (ID: {$orgUserRole->id})\n";

// 4. Create dummy user with Org User role and test getPermissionsList()
$testUser = User::withTrashed()->where('email', 'test_user@sprintnix.com')->first();
if ($testUser) {
    $testUser->restore(); // Restore if previously soft-deleted
} else {
    $testUser = User::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'name' => 'Test Employee',
        'email' => 'test_user@sprintnix.com',
        'password' => bcrypt('password123'),
        'role_id' => $orgUserRole->id,
        'status' => 'ACTIVE',
    ]);
}

$permissions = $testUser->getPermissionsList();
echo "4. Allowed routes for Test User: " . implode(', ', $permissions) . "\n";

if (in_array('/settings/workspace', $permissions)) {
    echo "SUCCESS: '/settings/workspace' is in the allowed list!\n";
} else {
    echo "FAILURE: '/settings/workspace' is not in the allowed list!\n";
    exit(1);
}

$filteredModules = $testUser->getFilteredModules();
echo "4b. Filtered modules tree returned " . count($filteredModules) . " module(s).\n";

$hasModule = false;
foreach ($filteredModules as $mod) {
    if ($mod['slug'] === 'test_settings') {
        foreach ($mod['sub_modules'] as $sub) {
            if ($sub['slug'] === 'test_workspace_setup') {
                $hasModule = true;
            }
        }
    }
}

if ($hasModule) {
    echo "SUCCESS: 'test_workspace_setup' submodule is in the filtered modules tree!\n";
} else {
    echo "FAILURE: 'test_workspace_setup' submodule is NOT in the filtered modules tree!\n";
    exit(1);
}

// 5. Cleanup
RolePermission::where('role_id', $orgUserRole->id)->where('sub_module_id', $subModule->id)->delete();
$subModule->delete();
$module->delete();
$testUser->forceDelete();

echo "5. Cleanup completed. All assertions passed!\n";
