<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\Project;
use App\Models\Ticket;
use App\Models\ActivityLog;
use App\Models\Sprint;
use App\Repositories\Contracts\DashboardRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    protected $dashboardRepo;

    public function __construct(DashboardRepositoryInterface $dashboardRepo)
    {
        $this->dashboardRepo = $dashboardRepo;
    }

    /**
     * Get dynamic dashboard metrics based on role and organization.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $roleSlug = $user->role?->slug;
        $orgUuid = $request->query('organization_uuid');
        $projectUuid = $request->query('project_uuid');

        if ($roleSlug === 'admin' && (!$orgUuid || $orgUuid === 'all')) {
            $totalOrgs = Organization::count();
            $totalUsers = User::count();
            $activeSubs = Organization::where('subscription_plan', '!=', 'FREE')->count();
            
            $recentActivities = ActivityLog::with('user')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => $log->uuid,
                        'user' => [
                            'name' => $log->user?->name ?? 'System',
                            'avatar' => $log->user?->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                        ],
                        'action' => $log->action,
                        'target' => $log->target_type,
                        'time' => $log->created_at->diffForHumans(),
                        'type' => 'edit',
                    ];
                });

            return response()->json([
                'data' => [
                    'role' => 'SUPER_ADMIN',
                    'stats' => [
                        'total_organizations' => $totalOrgs,
                        'total_users' => $totalUsers,
                        'active_subscriptions' => $activeSubs,
                        'revenue_trend' => '+12.5% vs last month',
                    ],
                    'recent_activities' => $recentActivities,
                    'critical_issues' => []
                ]
            ]);
        }

        // Resolve organization
        if (!$orgUuid) {
            $org = $user->organizations()->first();
            $orgUuid = $org ? $org->uuid : null;
        }

        if (!$orgUuid) {
            return response()->json([
                'data' => [
                    'role' => 'EMPLOYEE',
                    'stats' => [
                        'total_projects' => 0,
                        'open_tickets' => 0,
                        'closed_tickets' => 0,
                        'active_sprints' => 0,
                        'epics_count' => 0,
                        'epic_stories_count' => 0,
                        'developer_days' => 0,
                    ],
                    'recent_activities' => [],
                    'critical_issues' => []
                ]
            ]);
        }

        // Try reading cached stats
        $cached = $this->dashboardRepo->getCachedStats($orgUuid, $roleSlug ?? 'employee');
        if ($cached) {
            return response()->json([
                'data' => [
                    'role' => $roleSlug === 'org_admin' ? 'ORG_ADMIN' : 'EMPLOYEE',
                    'stats' => $cached->stats,
                    'recent_activities' => $cached->recent_activities,
                    'critical_issues' => $cached->critical_issues,
                ]
            ]);
        }

        $organization = Organization::where('uuid', $orgUuid)->firstOrFail();
        if ($projectUuid && $projectUuid !== 'all') {
            $projectIds = Project::where('uuid', $projectUuid)->pluck('id');
            $totalProjects = 1;
        } else {
            $totalProjects = Project::where('organization_id', $organization->id)->count();
            $projectIds = Project::where('organization_id', $organization->id)->pluck('id');
        }
        
        $openTickets = Ticket::whereIn('project_id', $projectIds)
            ->where('type', '!=', 'Epic')
            ->where('status', '!=', 'Done')
            ->count();
            
        $closedTickets = Ticket::whereIn('project_id', $projectIds)
            ->where('type', '!=', 'Epic')
            ->where('status', 'Done')
            ->count();

        $boardIds = DB::table('boards')->whereIn('project_id', $projectIds)->pluck('id');
        $activeSprints = Sprint::whereIn('board_id', $boardIds)
            ->where('status', 'active')
            ->count();

        // 1. Epic and worklog statistics for issues.txt requirements
        $epicsCount = Ticket::whereIn('project_id', $projectIds)->where('type', 'Epic')->count();
        $epicStoriesCount = Ticket::whereIn('project_id', $projectIds)->where('type', 'Story')->whereNotNull('epic_id')->count();
        
        $totalWorkLogHours = DB::table('ticket_work_logs')
            ->whereIn('ticket_id', Ticket::whereIn('project_id', $projectIds)->where('type', '!=', 'Epic')->pluck('id'))
            ->sum('hours');
        $developerDays = round($totalWorkLogHours / 8, 1);

        $recentActivities = ActivityLog::with('user')
            ->whereIn('target_type', ['Ticket', 'Project', 'Sprint'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->uuid,
                    'user' => [
                        'name' => $log->user?->name ?? 'System',
                        'avatar' => $log->user?->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                    ],
                    'action' => $log->action,
                    'target' => $log->target_type,
                    'time' => $log->created_at->diffForHumans(),
                    'type' => 'edit',
                ];
            })->toArray();

        $criticalIssues = Ticket::whereIn('project_id', $projectIds)
            ->where('type', '!=', 'Epic')
            ->whereIn('priority', ['High', 'Critical'])
            ->where('status', '!=', 'Done')
            ->with('assignee')
            ->limit(5)
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->uuid,
                    'key' => $ticket->key,
                    'title' => $ticket->title,
                    'priority' => $ticket->priority,
                    'status' => $ticket->status,
                    'updatedAt' => $ticket->updated_at->diffForHumans(),
                    'assignee' => $ticket->assignee ? [[
                        'id' => $ticket->assignee->uuid,
                        'name' => $ticket->assignee->name,
                        'avatar' => $ticket->assignee->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                    ]] : [],
                ];
            })->toArray();

        $stats = [
            'total_projects' => $totalProjects,
            'open_tickets' => $openTickets,
            'closed_tickets' => $closedTickets,
            'active_sprints' => $activeSprints,
            'epics_count' => $epicsCount,
            'epic_stories_count' => $epicStoriesCount,
            'developer_days' => $developerDays,
        ];

        // Save cache
        $this->dashboardRepo->updateCachedStats($orgUuid, $roleSlug ?? 'employee', $stats, $recentActivities, $criticalIssues);

        return response()->json([
            'data' => [
                'role' => $roleSlug === 'org_admin' ? 'ORG_ADMIN' : 'EMPLOYEE',
                'stats' => $stats,
                'recent_activities' => $recentActivities,
                'critical_issues' => $criticalIssues,
            ]
        ]);
    }

    /**
     * Bootstrap all workspace data for a single organization.
     */
    public function bootstrap(Request $request, \App\Services\ProjectService $projectService)
    {
        $user = $request->user();
        $orgUuid = $request->query('organization_uuid');

        if (!$orgUuid || $orgUuid === 'all') {
            $org = $user->organizations()->first();
            $orgUuid = $org ? $org->uuid : null;
        }

        if (!$orgUuid) {
            return response()->json([
                'data' => [
                    'projects' => [],
                    'sprints' => [],
                    'tickets' => []
                ]
            ]);
        }

        $organization = Organization::where('uuid', $orgUuid)->firstOrFail();

        // 1. Projects
        $projects = $projectService->listProjectsForUser($user, $orgUuid);

        // 2. Sprints
        $projectIds = $projects->pluck('id');
        $boardIds = DB::table('boards')->whereIn('project_id', $projectIds)->pluck('id');
        $sprints = Sprint::whereIn('board_id', $boardIds)
            ->with(['tickets', 'board.project'])
            ->get();

        // 3. Tickets (Backlog + Active/Future sprints)
        // Optimized: only load necessary relations and use withCount for comments
        $tickets = Ticket::whereIn('project_id', $projectIds)
            ->where(function ($query) {
                $query->whereNull('sprint_id')
                    ->orWhereHas('sprint', function ($q) {
                        $q->whereIn('status', ['active', 'future']);
                    });
            })
            ->with([
                'project.organization',
                'assignee',
                'reporter',
                'sprint',
                'parent',
                'epic',
                'subtasks',
                'starredByUsers' => function ($q) {
                    $userId = \Illuminate\Support\Facades\Auth::id();
                    if ($userId) {
                        $q->where('users.id', $userId);
                    }
                }
            ])
            ->withCount('comments')
            ->get();

        return response()->json([
            'data' => [
                'projects' => \App\Http\Resources\Api\v1\ProjectResource::collection($projects),
                'sprints' => \App\Http\Resources\Api\v1\SprintResource::collection($sprints),
                'tickets' => \App\Http\Resources\Api\v1\TicketResource::collection($tickets),
            ]
        ]);
    }

    /**
     * Fetch all dashboard-required data in a single optimized payload.
     */
    public function yourWork(Request $request, \App\Services\ProjectService $projectService)
    {
        $user = $request->user();
        $roleSlug = $user->role?->slug;
        $orgUuid = $request->query('organization_uuid');

        if (!$orgUuid || $orgUuid === 'all') {
            if ($roleSlug !== 'admin') {
                $firstOrg = $user->organizations()->first();
                $orgUuid = $firstOrg ? $firstOrg->uuid : null;
            }
        }

        // 1. Projects
        $projects = collect();
        if ($roleSlug === 'admin' && (!$orgUuid || $orgUuid === 'all')) {
            $projects = Project::with(['boards', 'members.role', 'organization'])->get();
        } else if ($orgUuid) {
            $projects = $projectService->listProjectsForUser($user, $orgUuid);
        }

        // 2. Assigned Tickets
        $assignedTicketsQuery = Ticket::where('assignee_id', $user->id)->where('type', '!=', 'Epic');
        if ($projectUuid && $projectUuid !== 'all') {
            $assignedTicketsQuery->whereHas('project', function ($q) use ($projectUuid) {
                $q->where('uuid', $projectUuid);
            });
        } elseif ($orgUuid && $roleSlug !== 'admin') {
            $assignedTicketsQuery->whereHas('project.organization', function ($q) use ($orgUuid) {
                $q->where('uuid', $orgUuid);
            });
        }
        $assignedTickets = $assignedTicketsQuery->with([
            'project.organization',
            'assignee',
            'reporter',
            'sprint',
            'parent',
            'epic',
            'subtasks',
            'starredByUsers' => function ($q) use ($user) {
                $q->where('users.id', $user->id);
            }
        ])->withCount('comments')->get();

        // 3. Starred Tickets
        $starredTickets = $user->starredTickets()
            ->where('type', '!=', 'Epic')
            ->where(function ($query) use ($orgUuid, $projectUuid) {
                if ($projectUuid && $projectUuid !== 'all') {
                    $query->whereHas('project', function ($q) use ($projectUuid) {
                        $q->where('uuid', $projectUuid);
                    });
                } else if ($orgUuid) {
                    $query->whereHas('project.organization', function ($q) use ($orgUuid) {
                        $q->where('uuid', $orgUuid);
                    });
                }
            })
            ->with([
                'project.organization',
                'assignee',
                'reporter',
                'sprint',
                'parent',
                'epic',
                'subtasks',
                'starredByUsers' => function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                }
            ])
            ->withCount('comments')
            ->get();

        // 4. Recently Viewed Tickets
        $recentTickets = $user->recentlyViewedTickets()
            ->where('type', '!=', 'Epic')
            ->where(function ($query) use ($orgUuid, $projectUuid) {
                if ($projectUuid && $projectUuid !== 'all') {
                    $query->whereHas('project', function ($q) use ($projectUuid) {
                        $q->where('uuid', $projectUuid);
                    });
                } else if ($orgUuid) {
                    $query->whereHas('project.organization', function ($q) use ($orgUuid) {
                        $q->where('uuid', $orgUuid);
                    });
                }
            })
            ->with([
                'project.organization',
                'assignee',
                'reporter',
                'sprint',
                'parent',
                'epic',
                'subtasks',
                'starredByUsers' => function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                }
            ])
            ->withCount('comments')
            ->take(10)
            ->get();

        // 5. Analytics (leveraging cache)
        $analytics = [];
        if ($roleSlug === 'admin' && (!$orgUuid || $orgUuid === 'all')) {
            $totalOrgs = Organization::count();
            $totalUsers = User::count();
            $activeSubs = Organization::where('subscription_plan', '!=', 'FREE')->count();
            
            $recentActivities = ActivityLog::with('user')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => $log->uuid,
                        'user' => [
                            'name' => $log->user?->name ?? 'System',
                            'avatar' => $log->user?->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                        ],
                        'action' => $log->action,
                        'target' => $log->target_type,
                        'time' => $log->created_at->diffForHumans(),
                        'type' => 'edit',
                    ];
                });

            $analytics = [
                'role' => 'SUPER_ADMIN',
                'stats' => [
                    'total_organizations' => $totalOrgs,
                    'total_users' => $totalUsers,
                    'active_subscriptions' => $activeSubs,
                    'revenue_trend' => '+12.5% vs last month',
                ],
                'recent_activities' => $recentActivities,
                'critical_issues' => []
            ];
        } else {
            if (!$orgUuid) {
                $analytics = [
                    'role' => 'EMPLOYEE',
                    'stats' => [
                        'total_projects' => 0,
                        'open_tickets' => 0,
                        'closed_tickets' => 0,
                        'active_sprints' => 0,
                        'epics_count' => 0,
                        'epic_stories_count' => 0,
                        'developer_days' => 0,
                    ],
                    'recent_activities' => [],
                    'critical_issues' => []
                ];
            } else {
                // Try reading cached stats
                $cached = $this->dashboardRepo->getCachedStats($orgUuid, $roleSlug ?? 'employee');
                if ($cached) {
                    $analytics = [
                        'role' => $roleSlug === 'org_admin' ? 'ORG_ADMIN' : 'EMPLOYEE',
                        'stats' => $cached->stats,
                        'recent_activities' => $cached->recent_activities,
                        'critical_issues' => $cached->critical_issues,
                    ];
                } else {
                    $organization = Organization::where('uuid', $orgUuid)->firstOrFail();
                    if ($projectUuid && $projectUuid !== 'all') {
                        $projectIds = Project::where('uuid', $projectUuid)->pluck('id');
                        $totalProjects = 1;
                    } else {
                        $totalProjects = Project::where('organization_id', $organization->id)->count();
                        $projectIds = Project::where('organization_id', $organization->id)->pluck('id');
                    }
                    
                    $openTickets = Ticket::whereIn('project_id', $projectIds)
                        ->where('type', '!=', 'Epic')
                        ->where('status', '!=', 'Done')
                        ->count();
                        
                    $closedTickets = Ticket::whereIn('project_id', $projectIds)
                        ->where('type', '!=', 'Epic')
                        ->where('status', 'Done')
                        ->count();

                    $boardIds = DB::table('boards')->whereIn('project_id', $projectIds)->pluck('id');
                    $activeSprints = Sprint::whereIn('board_id', $boardIds)
                        ->where('status', 'active')
                        ->count();

                    $epicsCount = Ticket::whereIn('project_id', $projectIds)->where('type', 'Epic')->count();
                    $epicStoriesCount = Ticket::whereIn('project_id', $projectIds)->where('type', 'Story')->whereNotNull('epic_id')->count();
                    
                    $totalWorkLogHours = DB::table('ticket_work_logs')
                        ->whereIn('ticket_id', Ticket::whereIn('project_id', $projectIds)->where('type', '!=', 'Epic')->pluck('id'))
                        ->sum('hours');
                    $developerDays = round($totalWorkLogHours / 8, 1);

                    $recentActivities = ActivityLog::with('user')
                        ->whereIn('target_type', ['Ticket', 'Project', 'Sprint'])
                        ->orderBy('created_at', 'desc')
                        ->limit(10)
                        ->get()
                        ->map(function ($log) {
                            return [
                                'id' => $log->uuid,
                                'user' => [
                                    'name' => $log->user?->name ?? 'System',
                                    'avatar' => $log->user?->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                                ],
                                'action' => $log->action,
                                'target' => $log->target_type,
                                'time' => $log->created_at->diffForHumans(),
                                'type' => 'edit',
                            ];
                        })->toArray();

                    $criticalIssues = Ticket::whereIn('project_id', $projectIds)
                        ->where('type', '!=', 'Epic')
                        ->whereIn('priority', ['High', 'Critical'])
                        ->where('status', '!=', 'Done')
                        ->with('assignee')
                        ->limit(5)
                        ->get()
                        ->map(function ($ticket) {
                            return [
                                'id' => $ticket->uuid,
                                'key' => $ticket->key,
                                'title' => $ticket->title,
                                'priority' => $ticket->priority,
                                'status' => $ticket->status,
                                'updatedAt' => $ticket->updated_at->diffForHumans(),
                                'assignee' => $ticket->assignee ? [[
                                    'id' => $ticket->assignee->uuid,
                                    'name' => $ticket->assignee->name,
                                    'avatar' => $ticket->assignee->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                                ]] : [],
                            ];
                        })->toArray();

                    $stats = [
                        'total_projects' => $totalProjects,
                        'open_tickets' => $openTickets,
                        'closed_tickets' => $closedTickets,
                        'active_sprints' => $activeSprints,
                        'epics_count' => $epicsCount,
                        'epic_stories_count' => $epicStoriesCount,
                        'developer_days' => $developerDays,
                    ];

                    $this->dashboardRepo->updateCachedStats($orgUuid, $roleSlug ?? 'employee', $stats, $recentActivities, $criticalIssues);

                    $analytics = [
                        'role' => $roleSlug === 'org_admin' ? 'ORG_ADMIN' : 'EMPLOYEE',
                        'stats' => $stats,
                        'recent_activities' => $recentActivities,
                        'critical_issues' => $criticalIssues,
                    ];
                }
            }
        }

        return response()->json([
            'data' => [
                'projects' => \App\Http\Resources\Api\v1\ProjectResource::collection($projects),
                'assigned_tickets' => \App\Http\Resources\Api\v1\TicketResource::collection($assignedTickets),
                'starred_tickets' => \App\Http\Resources\Api\v1\TicketResource::collection($starredTickets),
                'recent_tickets' => \App\Http\Resources\Api\v1\TicketResource::collection($recentTickets),
                'analytics' => $analytics,
            ]
        ]);
    }
}
