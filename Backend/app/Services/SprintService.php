<?php

namespace App\Services;

use App\Models\Sprint;
use App\Models\Board;
use App\Models\Ticket;
use App\Models\User;
use App\Repositories\Contracts\SprintRepositoryInterface;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class SprintService
{
    protected $sprintRepository;

    public function __construct(SprintRepositoryInterface $sprintRepository)
    {
        $this->sprintRepository = $sprintRepository;
    }

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
            $project = \App\Models\Project::where('uuid', $projectUuid)->firstOrFail();
            $boardIds = Board::where('project_id', $project->id)->pluck('id');
            return Sprint::whereIn('board_id', $boardIds)->with('tickets')->get();
        } elseif ($orgUuid && $orgUuid !== 'all' && $orgUuid !== 'undefined') {
            $org = \App\Models\Organization::where('uuid', $orgUuid)->firstOrFail();
            $projectIds = \App\Models\Project::where('organization_id', $org->id)->pluck('id');
            $boardIds = Board::whereIn('project_id', $projectIds)->pluck('id');
            return Sprint::whereIn('board_id', $boardIds)->with('tickets')->get();
        }

        return new Collection();
    }

    /**
     * Check if a sprint's dates overlap with another sprint on the same board.
     */
    protected function checkDateOverlap(int $boardId, ?string $startDate, ?string $endDate, ?int $excludeSprintId = null): void
    {
        if (!$startDate || !$endDate) {
            return;
        }

        $overlapExists = Sprint::where('board_id', $boardId)
            ->when($excludeSprintId, function ($query) use ($excludeSprintId) {
                $query->where('id', '!=', $excludeSprintId);
            })
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where(function ($query) use ($startDate, $endDate) {
                // S1 <= E2 AND S2 <= E1
                $query->where('start_date', '<=', $endDate)
                      ->where('end_date', '>=', $startDate);
            })
            ->exists();

        if ($overlapExists) {
            throw new \Exception('The sprint dates overlap with another sprint on this board. Please pick non-overlapping dates.');
        }
    }

    /**
     * Create a new sprint.
     */
    public function createSprint(array $data, User $user): Sprint
    {
        $board = Board::where('uuid', $data['board_uuid'])->firstOrFail();

        $startDate = $data['start_date'] ?? null;
        $endDate = $data['end_date'] ?? null;

        $this->checkDateOverlap($board->id, $startDate, $endDate);

        return $this->sprintRepository->create([
            'uuid' => (string) Str::uuid(),
            'board_id' => $board->id,
            'name' => $data['name'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'goal' => $data['goal'] ?? null,
            'status' => 'future', // future, active, completed
            'created_by' => $user->id,
        ]);
    }

    /**
     * Update an existing sprint.
     */
    public function updateSprint(string $uuid, array $data): Sprint
    {
        $sprint = $this->sprintRepository->findByUuid($uuid);
        
        $startDate = array_key_exists('start_date', $data) ? $data['start_date'] : $sprint->start_date;
        $endDate = array_key_exists('end_date', $data) ? $data['end_date'] : $sprint->end_date;

        $this->checkDateOverlap($sprint->board_id, $startDate, $endDate, $sprint->id);

        return $this->sprintRepository->update($sprint, [
            'name' => $data['name'] ?? $sprint->name,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'goal' => array_key_exists('goal', $data) ? $data['goal'] : $sprint->goal,
            'status' => $data['status'] ?? $sprint->status,
        ]);
    }

    /**
     * Delete a sprint and roll its tickets back to the backlog.
     */
    public function destroySprint(string $uuid): void
    {
        DB::transaction(function () use ($uuid) {
            $sprint = $this->sprintRepository->findByUuid($uuid);
            
            // Set all tickets in this sprint back to the backlog (sprint_id = null)
            Ticket::where('sprint_id', $sprint->id)
                ->update(['sprint_id' => null]);

            $sprint->delete();
        });
    }

    /**
     * Start a sprint.
     */
    public function startSprint(string $uuid, array $data): Sprint
    {
        return DB::transaction(function () use ($uuid, $data) {
            $sprint = $this->sprintRepository->findByUuid($uuid);

            // Check if there is already an active sprint on this board
            $activeSprintExists = Sprint::where('board_id', $sprint->board_id)
                ->where('status', 'active')
                ->where('id', '!=', $sprint->id)
                ->exists();

            if ($activeSprintExists) {
                throw new \Exception('There is already an active sprint running on this board.');
            }

            $startDate = $data['start_date'] ?? now()->toDateString();
            $endDate = $data['end_date'] ?? now()->addWeeks(2)->toDateString();

            $this->checkDateOverlap($sprint->board_id, $startDate, $endDate, $sprint->id);

            return $this->sprintRepository->update($sprint, [
                'status' => 'active',
                'start_date' => $startDate,
                'end_date' => $endDate,
                'goal' => $data['goal'] ?? $sprint->goal,
            ]);
        });
    }

    /**
     * Complete a sprint and roll unfinished tickets to the backlog.
     */
    public function completeSprint(string $uuid): Sprint
    {
        return DB::transaction(function () use ($uuid) {
            $sprint = $this->sprintRepository->findByUuid($uuid);

            if ($sprint->status !== 'active') {
                throw new \Exception('Only active sprints can be completed.');
            }

            $sprint = $this->sprintRepository->complete($sprint);

            // Uncompleted tickets are rolled back to the board's backlog (sprint_id = null)
            Ticket::where('sprint_id', $sprint->id)
                ->where('status', '!=', 'Done')
                ->update(['sprint_id' => null]);

            return $sprint;
        });
    }
}
