<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Board;
use App\Models\Sprint;
use App\Models\Ticket;
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
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@sprintnix.com'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Sarah Chen',
                'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
                'role_id' => Role::where('slug', 'admin')->first()->id,
                'status' => 'ACTIVE',
            ]
        );

        // 2. Create Organization
        $org = Organization::updateOrCreate(
            ['slug' => 'techflow'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'TechFlow Systems',
                'subscription_plan' => 'ENTERPRISE',
                'primary_domain' => 'techflow.com',
                'created_by' => $superAdmin->id,
            ]
        );

        // Link Super Admin to Organization
        $orgAdminRole = Role::where('slug', 'org_admin')->first();
        if (!$superAdmin->organizations()->where('organization_id', $org->id)->exists()) {
            $superAdmin->organizations()->attach($org->id, [
                'role_id' => $orgAdminRole->id,
                'joined_at' => now(),
            ]);
        }

        // 3. Create Project
        $project = Project::updateOrCreate(
            ['key' => 'KAN'],
            [
                'uuid' => (string) Str::uuid(),
                'organization_id' => $org->id,
                'name' => 'My Team',
                'description' => 'Collaboration and Kanban tracking workspace for My Team.',
                'avatar' => null,
                'status' => 'active',
                'created_by' => $superAdmin->id,
            ]
        );

        // Link Super Admin to Project Member
        if (!$project->members()->where('user_id', $superAdmin->id)->exists()) {
            $project->members()->attach($superAdmin->id, [
                'role_id' => $orgAdminRole->id,
                'joined_at' => now(),
            ]);
        }

        // 4. Create Board
        $board = Board::updateOrCreate(
            ['project_id' => $project->id],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'KAN Board',
                'type' => 'kanban',
                'created_by' => $superAdmin->id,
            ]
        );

        // 5. Create Sprint
        $sprint = Sprint::updateOrCreate(
            ['board_id' => $board->id, 'status' => 'active'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Sprint 1 (Active)',
                'start_date' => now()->subDays(5),
                'end_date' => now()->addDays(9),
                'goal' => 'Track all continuous tasks on the Kanban board.',
                'created_by' => $superAdmin->id,
            ]
        );

        // 6. Create Tickets (Matching KAN-1 and KAN-2)
        $ticket1 = Ticket::updateOrCreate(
            ['key' => 'KAN-1'],
            [
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'board_id' => $board->id,
                'sprint_id' => $sprint->id,
                'title' => 'Task 1',
                'description' => 'Implementation of Task 1 on our team board.',
                'type' => 'Task',
                'priority' => 'Medium',
                'status' => 'In Progress',
                'due_date' => '2026-05-31',
                'assignee_id' => $superAdmin->id,
                'reporter_id' => $superAdmin->id,
                'created_by' => $superAdmin->id,
            ]
        );

        $ticket2 = Ticket::updateOrCreate(
            ['key' => 'KAN-2'],
            [
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'board_id' => $board->id,
                'sprint_id' => $sprint->id,
                'parent_id' => $ticket1->id,
                'title' => 'Task 2',
                'description' => 'Implementation of Task 2 linked to Task 1 as a subtask.',
                'type' => 'Story',
                'priority' => 'Medium',
                'status' => 'In Progress',
                'due_date' => '2026-06-07',
                'assignee_id' => $superAdmin->id,
                'reporter_id' => $superAdmin->id,
                'created_by' => $superAdmin->id,
            ]
        );

        // 7. Seed Default Modules & Sub-modules
        $defaultModules = [
            [
                'name' => 'Your Work',
                'slug' => 'dashboard',
                'icon' => 'LayoutDashboard',
                'sort_order' => 1,
                'sub_modules' => [
                    ['name' => 'Your Work', 'slug' => 'dashboard_view', 'route' => '/your-work', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Projects',
                'slug' => 'projects',
                'icon' => 'Folder',
                'sort_order' => 2,
                'sub_modules' => [
                    ['name' => 'Manage Projects', 'slug' => 'projects_view', 'route' => '/projects', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Organizations',
                'slug' => 'organizations',
                'icon' => 'Building2',
                'sort_order' => 3,
                'sub_modules' => [
                    ['name' => 'Organizations', 'slug' => 'organizations_view', 'route' => '/organizations', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Users',
                'slug' => 'users',
                'icon' => 'Users',
                'sort_order' => 4,
                'sub_modules' => [
                    ['name' => 'Users', 'slug' => 'users_view', 'route' => '/users', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Board',
                'slug' => 'board',
                'icon' => 'Kanban',
                'sort_order' => 5,
                'sub_modules' => [
                    ['name' => 'Board', 'slug' => 'board_view', 'route' => '/board', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Backlog',
                'slug' => 'backlog',
                'icon' => 'ListTodo',
                'sort_order' => 6,
                'sub_modules' => [
                    ['name' => 'Backlog', 'slug' => 'backlog_view', 'route' => '/backlog', 'sort_order' => 1],
                ]
            ],
            [
                'name' => 'Reports',
                'slug' => 'reports',
                'icon' => 'BarChart3',
                'sort_order' => 7,
                'sub_modules' => [
                    ['name' => 'Reports', 'slug' => 'reports_view', 'route' => '/reports', 'sort_order' => 1],
                ]
            ],

            [
                'name' => 'Access Control',
                'slug' => 'access_control',
                'icon' => 'Shield',
                'sort_order' => 9,
                'sub_modules' => [
                    ['name' => 'Roles & Access', 'slug' => 'access_control_view', 'route' => '/access-control', 'sort_order' => 1],
                    ['name' => 'Modules Manager', 'slug' => 'modules_management_view', 'route' => '/modules-management', 'sort_order' => 2],
                ]
            ],
            [
                'name' => 'Project Settings',
                'slug' => 'project_settings',
                'icon' => 'Settings',
                'sort_order' => 10,
                'sub_modules' => [
                    ['name' => 'Project Workflow', 'slug' => 'project_settings_view', 'route' => '/project-settings', 'sort_order' => 1],
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

        // 8. Create 3 Organizations
        $organizationsData = [
            [
                'name' => 'Nexus Laboratories',
                'slug' => 'nexus-labs',
                'domain' => 'nexuslabs.com',
                'project_name' => 'Nexus Core',
                'project_key' => 'NEX',
            ],
            [
                'name' => 'Apex Industries',
                'slug' => 'apex-ind',
                'domain' => 'apexind.com',
                'project_name' => 'Apex Platform',
                'project_key' => 'APX',
            ],
            [
                'name' => 'Vortex Software',
                'slug' => 'vortex-soft',
                'domain' => 'vortexsoft.com',
                'project_name' => 'Vortex Suite',
                'project_key' => 'VOR',
            ],
        ];

        $orgAdminRole = Role::where('slug', 'org_admin')->first();
        $orgUserRole = Role::where('slug', 'org_user')->first();

        foreach ($organizationsData as $index => $oData) {
            // Create Organization
            $currentOrg = Organization::updateOrCreate(
                ['slug' => $oData['slug']],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => $oData['name'],
                    'subscription_plan' => 'ENTERPRISE',
                    'primary_domain' => $oData['domain'],
                    'created_by' => $superAdmin->id,
                ]
            );

            // Create 1 Org Admin User
            $adminEmail = "admin@" . $oData['domain'];
            $currentAdmin = User::updateOrCreate(
                ['email' => $adminEmail],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Admin ' . $oData['project_key'],
                    'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                    'role_id' => $orgAdminRole->id,
                    'status' => 'ACTIVE',
                ]
            );

            // Link Org Admin to Org
            if (!$currentAdmin->organizations()->where('organization_id', $currentOrg->id)->exists()) {
                $currentAdmin->organizations()->attach($currentOrg->id, [
                    'role_id' => $orgAdminRole->id,
                    'joined_at' => now(),
                ]);
            }

            // Create Project
            $currentProject = Project::updateOrCreate(
                ['key' => $oData['project_key']],
                [
                    'uuid' => (string) Str::uuid(),
                    'organization_id' => $currentOrg->id,
                    'name' => $oData['project_name'],
                    'description' => 'Collaboration and Kanban tracking workspace for ' . $oData['name'],
                    'avatar' => null,
                    'status' => 'active',
                    'created_by' => $currentAdmin->id,
                ]
            );

            // Link Org Admin to Project Member
            if (!$currentProject->members()->where('user_id', $currentAdmin->id)->exists()) {
                $currentProject->members()->attach($currentAdmin->id, [
                    'role_id' => $orgAdminRole->id,
                    'joined_at' => now(),
                ]);
            }

            // Create Board
            $currentBoard = Board::updateOrCreate(
                ['project_id' => $currentProject->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => $oData['project_key'] . ' Board',
                    'type' => 'kanban',
                    'created_by' => $currentAdmin->id,
                ]
            );

            // Create Sprint
            $currentSprint = Sprint::updateOrCreate(
                ['board_id' => $currentBoard->id, 'status' => 'active'],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Sprint 1 (Active)',
                    'start_date' => now()->subDays(5),
                    'end_date' => now()->addDays(9),
                    'goal' => 'Seed initial tasks for team member assignments.',
                    'created_by' => $currentAdmin->id,
                ]
            );

            // Create 5 Org Users per Org
            for ($uIndex = 1; $uIndex <= 5; $uIndex++) {
                $userEmail = "user{$uIndex}@" . $oData['domain'];
                $currentUser = User::updateOrCreate(
                    ['email' => $userEmail],
                    [
                        'uuid' => (string) Str::uuid(),
                        'name' => "User {$uIndex} " . $oData['project_key'],
                        'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                        'role_id' => $orgUserRole->id,
                        'status' => 'ACTIVE',
                    ]
                );

                // Link User to Org
                if (!$currentUser->organizations()->where('organization_id', $currentOrg->id)->exists()) {
                    $currentUser->organizations()->attach($currentOrg->id, [
                        'role_id' => $orgUserRole->id,
                        'joined_at' => now(),
                    ]);
                }

                // Link User to Project Member
                if (!$currentProject->members()->where('user_id', $currentUser->id)->exists()) {
                    $currentProject->members()->attach($currentUser->id, [
                        'role_id' => $orgUserRole->id,
                        'joined_at' => now(),
                    ]);
                }

                // Create 2 Tasks for this user
                for ($tIndex = 1; $tIndex <= 2; $tIndex++) {
                    $taskNumber = (($uIndex - 1) * 2) + $tIndex;
                    $taskKey = $oData['project_key'] . '-' . $taskNumber;
                    
                    Ticket::updateOrCreate(
                        ['key' => $taskKey],
                        [
                            'uuid' => (string) Str::uuid(),
                            'project_id' => $currentProject->id,
                            'board_id' => $currentBoard->id,
                            'sprint_id' => $currentSprint->id,
                            'title' => "Task {$taskNumber} for User {$uIndex}",
                            'description' => "This is task key {$taskKey} assigned to user {$userEmail}.",
                            'type' => 'Task',
                            'priority' => $tIndex === 1 ? 'High' : 'Medium',
                            'status' => $tIndex === 1 ? 'In Progress' : 'To Do',
                            'due_date' => now()->addDays($taskNumber)->toDateString(),
                            'assignee_id' => $currentUser->id,
                            'reporter_id' => $currentAdmin->id,
                            'created_by' => $currentAdmin->id,
                        ]
                    );
                }
            }
        }
    }
}
