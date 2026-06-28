<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\ProjectRequest;
use App\Http\Resources\Api\v1\ProjectResource;
use App\Services\ProjectService;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    protected $projectService;

    public function __construct(ProjectService $projectService)
    {
        $this->projectService = $projectService;
    }

    /**
     * Display a listing of projects.
     */
    public function index(Request $request)
    {
        $orgUuid = $request->query('organization_uuid');
        $user = $request->user();

        if ($orgUuid === 'all' || !$orgUuid) {
            if ($user->role?->slug === 'admin') {
                $projects = \App\Models\Project::with(['boards', 'members.role', 'organization'])->get();
                return ProjectResource::collection($projects);
            }
            
            // Fallback for non-superadmins: get their first organization
            $firstOrg = $user->organizations()->first();
            if ($firstOrg) {
                $projects = $this->projectService->listProjectsForUser($user, $firstOrg->uuid);
                return ProjectResource::collection($projects);
            }
            
            return response()->json(['message' => 'organization_uuid is required'], 422);
        }

        $projects = $this->projectService->listProjectsForUser($user, $orgUuid);
        return ProjectResource::collection($projects);
    }

    /**
     * Store a newly created project.
     */
    public function store(ProjectRequest $request)
    {
        $project = $this->projectService->createProject($request->validated(), $request->user());
        return new ProjectResource($project);
    }

    /**
     * Display the specified project.
     */
    public function show(string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        return new ProjectResource($project);
    }

    /**
     * Update the specified project.
     */
    public function update(ProjectRequest $request, string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        $project = $this->projectService->updateProject($project, $request->validated());
        return new ProjectResource($project);
    }

    /**
     * Remove the specified project from storage.
     */
    public function destroy(string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        $this->projectService->deleteProject($project);
        return response()->json(['message' => 'Project archived/deleted successfully']);
    }

    /**
     * Add a member to the project.
     */
    public function addMember(Request $request, string $uuid)
    {
        $request->validate([
            'user_uuid' => 'required|exists:users,uuid',
            'role_id' => 'required|exists:roles,id',
        ]);

        $project = $this->projectService->findByUuid($uuid);
        $added = $this->projectService->addMember(
            $project, 
            $request->input('user_uuid'), 
            $request->input('role_id')
        );

        if (!$added) {
            return response()->json(['message' => 'User is already a member of this project'], 400);
        }

        return response()->json(['message' => 'Member added successfully']);
    }

    /**
     * Get OKRs for a project.
     */
    public function getOkrs(string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        $okrs = \App\Models\OKR::where('project_id', $project->id)->get();
        return response()->json(['data' => $okrs]);
    }

    /**
     * Store a new OKR.
     */
    public function storeOkr(Request $request, string $uuid)
    {
        $request->validate([
            'objective' => 'required|string|max:255',
            'key_results' => 'required|array',
        ]);

        $project = $this->projectService->findByUuid($uuid);
        $okr = \App\Models\OKR::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'project_id' => $project->id,
            'objective' => $request->input('objective'),
            'key_results' => $request->input('key_results'),
        ]);

        return response()->json(['data' => $okr], 201);
    }

    /**
     * Get Risks for a project.
     */
    public function getRisks(string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        $risks = \App\Models\Risk::where('project_id', $project->id)->get();
        return response()->json(['data' => $risks]);
    }

    /**
     * Store a new Risk.
     */
    public function storeRisk(Request $request, string $uuid)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'impact' => 'required|in:Low,Medium,High,Critical',
            'probability' => 'required|in:Low,Medium,High',
            'mitigation_plan' => 'nullable|string',
        ]);

        $project = $this->projectService->findByUuid($uuid);
        $risk = \App\Models\Risk::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'project_id' => $project->id,
            'title' => $request->input('title'),
            'impact' => $request->input('impact'),
            'probability' => $request->input('probability'),
            'mitigation_plan' => $request->input('mitigation_plan'),
        ]);

        return response()->json(['data' => $risk], 201);
    }

    /**
     * Get Project Health Score.
     */
    public function getHealthScore(string $uuid)
    {
        $project = $this->projectService->findByUuid($uuid);
        
        $overdueTasks = \App\Models\Ticket::where('project_id', $project->id)
            ->where('status', '!=', 'Done')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->count();

        $openBugs = \App\Models\Ticket::where('project_id', $project->id)
            ->where('status', '!=', 'Done')
            ->where('type', 'Bug')
            ->count();

        $incompleteSprintTasks = \App\Models\Ticket::where('project_id', $project->id)
            ->whereNotNull('sprint_id')
            ->where('status', '!=', 'Done')
            ->count();

        $score = 100 - ($overdueTasks * 5) - ($openBugs * 10) - ($incompleteSprintTasks * 2);
        if ($score < 0) $score = 0;

        $status = 'Healthy';
        if ($score < 50) {
            $status = 'Critical';
        } elseif ($score < 80) {
            $status = 'Warning';
        }

        return response()->json([
            'data' => [
                'score' => $score,
                'status' => $status,
                'overdue_tasks' => $overdueTasks,
                'open_bugs' => $openBugs,
                'incomplete_sprint_tasks' => $incompleteSprintTasks,
            ]
        ]);
    }
}
