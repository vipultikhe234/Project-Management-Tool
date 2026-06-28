<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\Module;
use App\Models\SubModule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
        ]);

        // 1. Create Super Admin User
        User::updateOrCreate(
            ['email' => 'admin@sprintnix.com'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Sarah Chen',
                'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
                'role_id' => Role::where('slug', 'admin')->first()->id,
                'status' => 'ACTIVE',
            ]
        );

        // 2. Seed Default Modules & Sub-modules
        $defaultModules = [
            [
                'name' => 'Workspace',
                'slug' => 'workspace',
                'icon' => 'LayoutDashboard',
                'sort_order' => 1,
                'sub_modules' => [
                    ['name' => 'Dashboard', 'slug' => 'dashboard_view', 'route' => '/your-work', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Projects',
                'slug' => 'projects',
                'icon' => 'Folder',
                'sort_order' => 2,
                'sub_modules' => [
                    ['name' => 'All Projects', 'slug' => 'projects_view', 'route' => '/projects', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Planning',
                'slug' => 'planning',
                'icon' => 'ListTodo',
                'sort_order' => 3,
                'sub_modules' => [
                    ['name' => 'Backlog', 'slug' => 'backlog_view', 'route' => '/backlog', 'sort_order' => 1],
                    ['name' => 'Sprint Board', 'slug' => 'board_view', 'route' => '/board', 'sort_order' => 2],
                ]
            ],
            [
                'name' => 'Reports',
                'slug' => 'reports',
                'icon' => 'BarChart3',
                'sort_order' => 4,
                'sub_modules' => [
                    ['name' => 'Analytics', 'slug' => 'reports_view', 'route' => '/reports', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Administration',
                'slug' => 'administration',
                'icon' => 'Shield',
                'sort_order' => 5,
                'sub_modules' => [
                    ['name' => 'Organizations', 'slug' => 'organizations_view', 'route' => '/organizations', 'sort_order' => 1],
                    ['name' => 'Users', 'slug' => 'users_view', 'route' => '/users', 'sort_order' => 2],
                    ['name' => 'Roles & Permissions', 'slug' => 'access_control_view', 'route' => '/access-control', 'sort_order' => 3],
                ]
            ],
            [
                'name' => 'Settings',
                'slug' => 'settings',
                'icon' => 'Settings',
                'sort_order' => 6,
                'sub_modules' => [
                    ['name' => 'Project Settings', 'slug' => 'project_settings_view', 'route' => '/project-settings', 'sort_order' => 1],
                ]
            ],
        ];

        foreach ($defaultModules as $modData) {
            $module = Module::updateOrCreate(
                ['slug' => $modData['slug']],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => $modData['name'],
                    'icon' => $modData['icon'],
                    'sort_order' => $modData['sort_order'],
                ]
            );

            foreach ($modData['sub_modules'] as $subData) {
                SubModule::updateOrCreate(
                    ['slug' => $subData['slug']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'module_id' => $module->id,
                        'name' => $subData['name'],
                        'route' => $subData['route'],
                        'sort_order' => $subData['sort_order'],
                    ]
                );
            }
        }

        // Seed default role permissions (to avoid blank toggles after fresh seeds)
        $orgAdmin = Role::where('slug', 'org_admin')->first();
        $orgUser = Role::where('slug', 'org_user')->first();

        if ($orgAdmin && $orgUser) {
            $orgAdminAllowed = [
                'dashboard_view',
                'projects_view',
                'backlog_view',
                'board_view',
                'reports_view',
                'organizations_view',
                'users_view',
                'access_control_view',
                'project_settings_view'
            ];

            $orgUserAllowed = [
                'dashboard_view',
                'projects_view',
                'backlog_view',
                'board_view',
                'reports_view'
            ];

            // 1. Grant to Org Admin
            $adminSubModules = SubModule::whereIn('slug', $orgAdminAllowed)->get();
            foreach ($adminSubModules as $sub) {
                \App\Models\RolePermission::updateOrCreate(
                    ['role_id' => $orgAdmin->id, 'sub_module_id' => $sub->id],
                    ['is_allowed' => true]
                );
            }

            // 2. Grant to Org User
            $userSubModules = SubModule::whereIn('slug', $orgUserAllowed)->get();
            foreach ($userSubModules as $sub) {
                \App\Models\RolePermission::updateOrCreate(
                    ['role_id' => $orgUser->id, 'sub_module_id' => $sub->id],
                    ['is_allowed' => true]
                );
            }
        }
    }
}
