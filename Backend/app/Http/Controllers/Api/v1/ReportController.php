<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Display a listing of tickets and calculated summary metrics based on filters.
     */
    public function index(Request $request)
    {
        $orgUuid = $request->query('organization_uuid');
        if (!$orgUuid) {
            return response()->json(['message' => 'organization_uuid is required'], 422);
        }

        $organization = Organization::where('uuid', $orgUuid)->firstOrFail();
        $projectIds = Project::where('organization_id', $organization->id)->pluck('id');

        $query = Ticket::whereIn('project_id', $projectIds);

        // Apply Project filter
        $projectUuid = $request->query('project_uuid');
        if ($projectUuid && $projectUuid !== 'all') {
            $project = Project::where('uuid', $projectUuid)->first();
            if ($project) {
                $query->where('project_id', $project->id);
            }
        }

        // Apply Sprint filter
        $sprintUuid = $request->query('sprint_uuid');
        if ($sprintUuid && $sprintUuid !== 'all') {
            $sprint = Sprint::where('uuid', $sprintUuid)->first();
            if ($sprint) {
                $query->where('sprint_id', $sprint->id);
            }
        }

        // Apply Epic filter
        $epicUuid = $request->query('epic_uuid');
        if ($epicUuid && $epicUuid !== 'all') {
            $epic = Ticket::where('uuid', $epicUuid)->where('type', 'Epic')->first();
            if ($epic) {
                $query->where('epic_id', $epic->id);
            }
        }

        // Apply User filter (assigned to)
        $userUuid = $request->query('user_uuid');
        if ($userUuid && $userUuid !== 'all') {
            $user = User::where('uuid', $userUuid)->first();
            if ($user) {
                $query->where('assignee_id', $user->id);
            }
        }

        // Apply Date filter
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Eager load relationships for list display
        $tickets = $query->with([
            'project.organization',
            'assignee',
            'reporter',
            'sprint',
            'epic',
            'subtasks',
            'workLogs.user',
            'starredByUsers' => function ($q) {
                $userId = auth()->id();
                if ($userId) {
                    $q->where('users.id', $userId);
                }
            }
        ])->get();

        // Calculate summary metrics
        $totalTickets = $tickets->count();
        $totalStoryPoints = $tickets->sum('story_points');

        // Status Distribution
        $statusDistribution = $tickets->groupBy('status')->map(function ($group) {
            return [
                'count' => $group->count(),
                'story_points' => $group->sum('story_points'),
            ];
        });

        // Priority Distribution
        $priorityDistribution = $tickets->groupBy('priority')->map(function ($group) {
            return [
                'count' => $group->count(),
                'story_points' => $group->sum('story_points'),
            ];
        });

        // Type Distribution
        $typeDistribution = $tickets->groupBy('type')->map(function ($group) {
            return [
                'count' => $group->count(),
                'story_points' => $group->sum('story_points'),
            ];
        });

        // Completion metrics
        $doneTickets = $tickets->filter(fn($t) => $t->status === 'Done');
        $completedCount = $doneTickets->count();
        $completedStoryPoints = $doneTickets->sum('story_points');

        // Assignee distribution
        $assigneeDistribution = $tickets->groupBy('assignee_id')->map(function ($group) {
            $first = $group->first();
            $assigneeName = $first && $first->assignee ? $first->assignee->name : 'Unassigned';
            return [
                'name' => $assigneeName,
                'count' => $group->count(),
                'story_points' => $group->sum('story_points'),
                'completed_count' => $group->filter(fn($t) => $t->status === 'Done')->count(),
                'completed_story_points' => $group->filter(fn($t) => $t->status === 'Done')->sum('story_points'),
            ];
        })->values();

        // Metadata for filters
        $boardIds = DB::table('boards')->whereIn('project_id', $projectIds)->pluck('id');
        
        $sprintsMetadata = Sprint::whereIn('board_id', $boardIds)
            ->with('board.project')
            ->get();
            
        $epicsMetadata = Ticket::whereIn('project_id', $projectIds)
            ->where('type', 'Epic')
            ->with('project')
            ->get();

        // Get unique assignee IDs who have tickets matching all active filters EXCEPT assignee itself
        $usersQuery = Ticket::whereIn('project_id', $projectIds);
        if ($projectUuid && $projectUuid !== 'all') {
            $project = Project::where('uuid', $projectUuid)->first();
            if ($project) {
                $usersQuery->where('project_id', $project->id);
            }
        }
        if ($sprintUuid && $sprintUuid !== 'all') {
            $sprint = Sprint::where('uuid', $sprintUuid)->first();
            if ($sprint) {
                $usersQuery->where('sprint_id', $sprint->id);
            }
        }
        if ($epicUuid && $epicUuid !== 'all') {
            $epic = Ticket::where('uuid', $epicUuid)->where('type', 'Epic')->first();
            if ($epic) {
                $usersQuery->where('epic_id', $epic->id);
            }
        }
        if ($startDate) {
            $usersQuery->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $usersQuery->whereDate('created_at', '<=', $endDate);
        }

        $activeAssigneeIds = $usersQuery->whereNotNull('assignee_id')->distinct()->pluck('assignee_id');
        if ($userUuid && $userUuid !== 'all') {
            $selectedUserModel = User::where('uuid', $userUuid)->first();
            if ($selectedUserModel) {
                $activeAssigneeIds->push($selectedUserModel->id);
            }
        }

        $usersMetadata = User::whereIn('id', $activeAssigneeIds)->get();

        $metadata = [
            'projects' => Project::where('organization_id', $organization->id)->get()->map(fn($p) => [
                'uuid' => $p->uuid,
                'name' => $p->name,
                'key' => $p->key,
            ]),
            'sprints' => $sprintsMetadata->map(fn($s) => [
                'uuid' => $s->uuid,
                'name' => $s->name,
                'status' => $s->status,
                'project_uuid' => $s->board?->project?->uuid,
            ]),
            'epics' => $epicsMetadata->map(fn($e) => [
                'uuid' => $e->uuid,
                'key' => $e->key,
                'title' => $e->title,
                'project_uuid' => $e->project?->uuid,
            ]),
            'users' => $usersMetadata->map(fn($u) => [
                'uuid' => $u->uuid,
                'name' => $u->name,
                'avatar' => $u->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
            ]),
        ];

        return response()->json([
            'data' => [
                'tickets' => \App\Http\Resources\Api\v1\TicketResource::collection($tickets),
                'summary' => [
                    'total_tickets' => $totalTickets,
                    'total_story_points' => $totalStoryPoints,
                    'completed_count' => $completedCount,
                    'completed_story_points' => $completedStoryPoints,
                    'completion_rate_count' => $totalTickets > 0 ? round(($completedCount / $totalTickets) * 100, 1) : 0,
                    'completion_rate_points' => $totalStoryPoints > 0 ? round(($completedStoryPoints / $totalStoryPoints) * 100, 1) : 0,
                    'status_distribution' => $statusDistribution,
                    'priority_distribution' => $priorityDistribution,
                    'type_distribution' => $typeDistribution,
                    'assignee_distribution' => $assigneeDistribution,
                ],
                'metadata' => $metadata
            ]
        ]);
    }
}
