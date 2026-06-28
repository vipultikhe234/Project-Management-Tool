<?php

namespace App\Repositories\Eloquent;

use App\Models\Sprint;
use App\Repositories\Contracts\SprintRepositoryInterface;

class SprintRepository implements SprintRepositoryInterface
{
    public function all()
    {
        return Sprint::all();
    }

    public function find(int $id)
    {
        return Sprint::findOrFail($id);
    }

    public function findByUuid(string $uuid)
    {
        return Sprint::where('uuid', $uuid)->firstOrFail();
    }

    public function create(array $data)
    {
        return Sprint::create($data);
    }

    public function update(Sprint $sprint, array $data)
    {
        $sprint->update($data);
        return $sprint;
    }

    public function start(Sprint $sprint)
    {
        // Set other active sprints for the same board to planned/completed?
        // Usually only one active sprint per board
        Sprint::where('board_id', $sprint->board_id)
            ->where('status', 'active')
            ->update(['status' => 'completed', 'end_date' => now()]);

        $sprint->update([
            'status' => 'active',
            'start_date' => now()
        ]);
        return $sprint;
    }

    public function complete(Sprint $sprint)
    {
        $sprint->update([
            'status' => 'completed',
            'end_date' => now()
        ]);
        return $sprint;
    }
}
