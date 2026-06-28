<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\SprintRequest;
use App\Http\Resources\Api\v1\SprintResource;
use App\Services\SprintService;
use App\Models\Sprint;
use Illuminate\Http\Request;

class SprintController extends Controller
{
    protected $sprintService;

    public function __construct(SprintService $sprintService)
    {
        $this->sprintService = $sprintService;
    }

    /**
     * Get sprints for a specific board.
     */
    public function index(Request $request)
    {
        $boardUuid = $request->query('board_uuid');
        $projectUuid = $request->query('project_uuid');
        $orgUuid = $request->query('organization_uuid');

        if (!$boardUuid && !$projectUuid && !$orgUuid) {
            return response()->json(['message' => 'At least one of board_uuid, project_uuid, or organization_uuid is required'], 422);
        }

        $sprints = $this->sprintService->getBoardSprints($boardUuid, $projectUuid, $orgUuid);
        return SprintResource::collection($sprints);
    }

    /**
     * Store a newly created sprint.
     */
    public function store(SprintRequest $request)
    {
        $sprint = $this->sprintService->createSprint($request->validated(), $request->user());
        return new SprintResource($sprint);
    }

    /**
     * Update an existing sprint.
     */
    public function update(SprintRequest $request, string $uuid)
    {
        try {
            $sprint = $this->sprintService->updateSprint($uuid, $request->validated());
            return new SprintResource($sprint);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Delete an existing sprint.
     */
    public function destroy(string $uuid)
    {
        try {
            $this->sprintService->destroySprint($uuid);
            return response()->json(['message' => 'Sprint deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Start a sprint (make it active).
     */
    public function start(Request $request, string $uuid)
    {
        $request->validate([
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'goal' => 'nullable|string',
        ]);

        try {
            $sprint = $this->sprintService->startSprint($uuid, $request->all());
            return new SprintResource($sprint);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Complete a sprint (make it completed).
     */
    public function complete(string $uuid)
    {
        try {
            $sprint = $this->sprintService->completeSprint($uuid);
            return new SprintResource($sprint);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
