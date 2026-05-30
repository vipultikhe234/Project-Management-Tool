<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\ProjectRequest;
use App\Http\Resources\Api\v1\ProjectResource;
use App\Services\ProjectService;
use App\Models\Project;
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
                $projects = Project::with(['boards', 'members.role', 'organization'])->get();
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
        $project = Project::where('uuid', $uuid)->firstOrFail();
        $project = $this->projectService->updateProject($project, $request->validated());
        return new ProjectResource($project);
    }

    /**
     * Remove the specified project from storage.
     */
    public function destroy(string $uuid)
    {
        $project = Project::where('uuid', $uuid)->firstOrFail();
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

        $project = Project::where('uuid', $uuid)->firstOrFail();
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
}
