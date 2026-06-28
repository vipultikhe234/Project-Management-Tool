<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Board;
use App\Models\Sprint;
use App\Models\Ticket;
use App\Models\TicketWorkLog;
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

        // Create Epic
        $epic1 = Ticket::updateOrCreate(
            ['key' => 'KAN-1'],
            [
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'board_id' => $board->id,
                'sprint_id' => $sprint->id,
                'title' => 'Authentication Module Epic',
                'description' => 'Authentication system supporting JWT and SSO.',
                'type' => 'Epic',
                'priority' => 'High',
                'status' => 'In Progress',
                'due_date' => '2026-07-31',
                'assignee_id' => $superAdmin->id,
                'reporter_id' => $superAdmin->id,
                'created_by' => $superAdmin->id,
            ]
        );

        // 6. Create Tickets (Matching KAN-2 and KAN-3)
        $ticket1 = Ticket::updateOrCreate(
            ['key' => 'KAN-2'],
            [
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'board_id' => $board->id,
                'sprint_id' => $sprint->id,
                'epic_id' => $epic1->id,
                'title' => 'Implement User Registration',
                'description' => 'Implementation of register endpoint and validation.',
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
            ['key' => 'KAN-3'],
            [
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'board_id' => $board->id,
                'sprint_id' => $sprint->id,
                'parent_id' => $ticket1->id,
                'epic_id' => $epic1->id,
                'title' => 'Validation for unique emails',
                'description' => 'Registration validation unique constraints.',
                'type' => 'Story',
                'priority' => 'Medium',
                'status' => 'In Progress',
                'due_date' => '2026-06-07',
                'assignee_id' => $superAdmin->id,
                'reporter_id' => $superAdmin->id,
                'created_by' => $superAdmin->id,
            ]
        );

        // Log work for tickets
        TicketWorkLog::create([
            'uuid' => (string) Str::uuid(),
            'ticket_id' => $ticket1->id,
            'user_id' => $superAdmin->id,
            'hours' => 12.0,
            'log_date' => now()->subDays(2)->toDateString(),
            'description' => 'Initial implementation of backend validator'
        ]);

        TicketWorkLog::create([
            'uuid' => (string) Str::uuid(),
            'ticket_id' => $ticket2->id,
            'user_id' => $superAdmin->id,
            'hours' => 8.0,
            'log_date' => now()->subDays(1)->toDateString(),
            'description' => 'Added validation test suites'
        ]);

        // 7. Seed Default Modules & Sub-modules (Jira/Linear style hierarchical structure)
        // 7. Seed Default Modules & Sub-modules (Keep only actual functional modules & routes)
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

        foreach ($organizationsData as $oData) {
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

            // Create Epic for the organization
            $orgEpic = Ticket::updateOrCreate(
                ['key' => $oData['project_key'] . '-1'],
                [
                    'uuid' => (string) Str::uuid(),
                    'project_id' => $currentProject->id,
                    'board_id' => $currentBoard->id,
                    'sprint_id' => $currentSprint->id,
                    'title' => 'Core Platform Setup',
                    'description' => 'Epic for core setup of ' . $oData['name'],
                    'type' => 'Epic',
                    'priority' => 'High',
                    'status' => 'In Progress',
                    'due_date' => now()->addDays(30)->toDateString(),
                    'assignee_id' => $currentAdmin->id,
                    'reporter_id' => $currentAdmin->id,
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
                    $taskNumber = (($uIndex - 1) * 2) + $tIndex + 1; // +1 to skip Epic
                    $taskKey = $oData['project_key'] . '-' . $taskNumber;

                    $childTicket = Ticket::updateOrCreate(
                        ['key' => $taskKey],
                        [
                            'uuid' => (string) Str::uuid(),
                            'project_id' => $currentProject->id,
                            'board_id' => $currentBoard->id,
                            'sprint_id' => $currentSprint->id,
                            'epic_id' => $orgEpic->id,
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

                    // Add some logs
                    TicketWorkLog::create([
                        'uuid' => (string) Str::uuid(),
                        'ticket_id' => $childTicket->id,
                        'user_id' => $currentUser->id,
                        'hours' => 4.0 * $tIndex,
                        'log_date' => now()->toDateString(),
                        'description' => 'Working on task implementation'
                    ]);
                }
            }
        }
    }
}
