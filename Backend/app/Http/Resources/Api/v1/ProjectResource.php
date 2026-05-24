<?php

namespace App\Http\Resources\Api\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'avatar' => $this->avatar,
            'allowed_types' => $this->allowed_types ?? ['Story', 'Task', 'Bug', 'Epic', 'Subtask', 'Spike'],
            'status' => $this->status,
            'boards' => $this->boards->map(function ($board) {
                return [
                    'uuid' => $board->uuid,
                    'name' => $board->name,
                    'type' => $board->type,
                ];
            }),
            'members' => $this->members->map(function ($member) {
                return [
                    'uuid' => $member->uuid,
                    'name' => $member->name,
                    'avatar' => $member->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                    'role' => [
                        'id' => $member->role?->id,
                        'name' => $member->role?->name,
                        'slug' => $member->role?->slug,
                    ],
                ];
            }),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
