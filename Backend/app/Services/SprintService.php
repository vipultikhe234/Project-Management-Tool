<?php

namespace App\Services;

use App\Models\Sprint;
use App\Models\Board;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;
use App\Models\Project;
use App\Models\Organization;

class SprintService
{
    /**
     * Get all sprints for a board, project, or organization.
     */
    public function getBoardSprints(?string $boardUuid = null, ?string $projectUuid = null, ?string $orgUuid = null): Collection
    {
        $query = Sprint::query()->with('tickets');

        if ($boardUuid && $boardUuid !== 'all' && $boardUuid !== 'undefined') {
            $board = Board::where('uuid', $boardUuid)->firstOrFail();
            return Sprint::where('board_id', $board->id)->with('tickets')->get();
        } elseif ($projectUuid && $projectUuid !== 'all' && $projectUuid !== 'undefined') {
            $project = Project::where('uuid', $projectUuid)->firstOrFail();
            $boardIds = Board::where('project_id', $project->id)->pluck('id');
            return Sprint::whereIn('board_id', $boardIds)->with('tickets')->get();
        } elseif ($orgUuid && $orgUuid !== 'all' && $orgUuid !== 'undefined') {
            $org = Organization::where('uuid', $orgUuid)->firstOrFail();
            $projectIds = Project::where('organization_id', $org->id)->pluck('id');
            $boardIds = Board::whereIn('project_id', $projectIds)->pluck('id');
            return Sprint::whereIn('board_id', $boardIds)->with('tickets')->get();
        }

        return new Collection();
    }

    /**
     * Create a new sprint.
     */
    public function createSprint(array $data, User $user): Sprint
    {
        $board = Board::where('uuid', $data['board_uuid'])->firstOrFail();

        return Sprint::create([
            'uuid' => (string) Str::uuid(),
            'board_id' => $board->id,
            'name' => $data['name'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'goal' => $data['goal'] ?? null,
            'status' => 'future', // future, active, completed
            'created_by' => $user->id,
        ]);
    }

    /**
     * Start a sprint.
     */
    public function startSprint(string $uuid, array $data): Sprint
    {
        return DB::transaction(function () use ($uuid, $data) {
            $sprint = Sprint::where('uuid', $uuid)->firstOrFail();

            // Check if there is already an active sprint on this board
            $activeSprintExists = Sprint::where('board_id', $sprint->board_id)
                ->where('status', 'active')
                ->exists();

            if ($activeSprintExists) {
                throw new \Exception('There is already an active sprint running on this board.');
            }

            $sprint->update([
                'status' => 'active',
                'start_date' => $data['start_date'] ?? now(),
                'end_date' => $data['end_date'] ?? now()->addWeeks(2),
                'goal' => $data['goal'] ?? $sprint->goal,
            ]);

            return $sprint;
        });
    }

    /**
     * Complete a sprint and roll unfinished tickets to the backlog.
     */
    public function completeSprint(string $uuid): Sprint
    {
        return DB::transaction(function () use ($uuid) {
            $sprint = Sprint::where('uuid', $uuid)->firstOrFail();

            if ($sprint->status !== 'active') {
                throw new \Exception('Only active sprints can be completed.');
            }

            $sprint->update([
                'status' => 'completed',
            ]);

            // Uncompleted tickets are rolled back to the board's backlog (sprint_id = null)
            Ticket::where('sprint_id', $sprint->id)
                ->where('status', '!=', 'Done')
                ->update(['sprint_id' => null]);

            return $sprint;
        });
    }
}
