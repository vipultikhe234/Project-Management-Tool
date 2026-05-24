<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\Project;
use App\Models\Ticket;
use App\Models\ActivityLog;
use App\Models\Sprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dynamic dashboard metrics based on role and organization.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $roleSlug = $user->role?->slug;

        // 1. Super Admin Dashboard View (System-wide if no specific org or 'all' is selected)
        $orgUuid = $request->query('organization_uuid');
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

        // 2. Organization Admin / Employee Dashboard View
        if (!$orgUuid) {
            // Fallback to first user organization if not provided
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
                    ],
                    'recent_activities' => [],
                    'critical_issues' => []
                ]
            ]);
        }

        $organization = Organization::where('uuid', $orgUuid)->firstOrFail();
        
        $totalProjects = Project::where('organization_id', $organization->id)->count();
        
        $projectIds = Project::where('organization_id', $organization->id)->pluck('id');
        
        $openTickets = Ticket::whereIn('project_id', $projectIds)
            ->where('status', '!=', 'Done')
            ->count();
            
        $closedTickets = Ticket::whereIn('project_id', $projectIds)
            ->where('status', 'Done')
            ->count();

        // Get board IDs
        $boardIds = DB::table('boards')->whereIn('project_id', $projectIds)->pluck('id');
        $activeSprints = Sprint::whereIn('board_id', $boardIds)
            ->where('status', 'active')
            ->count();

        // Fetch Recent Activities related to these projects
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
            });

        // Fetch Critical/High Priority tickets in these projects
        $criticalIssues = Ticket::whereIn('project_id', $projectIds)
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
            });

        return response()->json([
            'data' => [
                'role' => $roleSlug === 'org_admin' ? 'ORG_ADMIN' : 'EMPLOYEE',
                'stats' => [
                    'total_projects' => $totalProjects,
                    'open_tickets' => $openTickets,
                    'closed_tickets' => $closedTickets,
                    'active_sprints' => $activeSprints,
                ],
                'recent_activities' => $recentActivities,
                'critical_issues' => $criticalIssues,
            ]
        ]);
    }
}
