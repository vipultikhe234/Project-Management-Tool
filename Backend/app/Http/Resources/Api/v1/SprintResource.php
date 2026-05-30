<?php

namespace App\Http\Resources\Api\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SprintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'board_uuid' => $this->board?->uuid,
            'project_uuid' => $this->board?->project?->uuid,
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateTimeString(),
            'end_date' => $this->end_date?->toDateTimeString(),
            'goal' => $this->goal,
            'status' => $this->status,
            'tickets_count' => $this->tickets->count(),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
