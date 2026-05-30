<?php

namespace App\Http\Resources\Api\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'key' => $this->key,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'type' => $this->type,
            'story_points' => $this->story_points,
            'start_date' => $this->start_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'work_logs' => $this->work_logs,
            'project' => [
                'uuid' => $this->project?->uuid,
                'key' => $this->project?->key,
                'name' => $this->project?->name,
                'organization_uuid' => $this->project?->organization?->uuid,
            ],
            'sprint' => $this->sprint ? [
                'uuid' => $this->sprint->uuid,
                'name' => $this->sprint->name,
                'status' => $this->sprint->status,
            ] : null,
            'assignee' => $this->assignee ? [
                'uuid' => $this->assignee->uuid,
                'name' => $this->assignee->name,
                'avatar' => $this->assignee->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
            ] : null,
            'reporter' => $this->reporter ? [
                'uuid' => $this->reporter->uuid,
                'name' => $this->reporter->name,
                'avatar' => $this->reporter->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
            ] : null,
            'code_reviewer' => $this->reporter ? [
                'uuid' => $this->reporter->uuid,
                'name' => $this->reporter->name,
                'avatar' => $this->reporter->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
            ] : null,
            'parent' => $this->parent ? [
                'uuid' => $this->parent->uuid,
                'key' => $this->parent->key,
                'title' => $this->parent->title,
            ] : null,
            'epic' => $this->epic ? [
                'uuid' => $this->epic->uuid,
                'key' => $this->epic->key,
                'title' => $this->epic->title,
            ] : null,
            'subtasks' => $this->subtasks->map(function ($subtask) {
                return [
                    'uuid' => $subtask->uuid,
                    'key' => $subtask->key,
                    'title' => $subtask->title,
                    'status' => $subtask->status,
                    'priority' => $subtask->priority,
                ];
            }),
            'work_logs_list' => $this->workLogs->map(function ($log) {
                return [
                    'uuid' => $log->uuid,
                    'hours' => $log->hours,
                    'log_date' => $log->log_date?->toDateString(),
                    'description' => $log->description,
                    'created_at' => $log->created_at->toDateTimeString(),
                    'user' => [
                        'uuid' => $log->user?->uuid,
                        'name' => $log->user?->name,
                    ],
                ];
            }),
            'comments_count' => $this->relationLoaded('comments') ? $this->comments->count() : $this->comments()->count(),
            'comments' => $this->when($this->relationLoaded('comments') && $request->is('*/tickets/*') && !$request->is('*/tickets'), function () {
                return $this->comments->map(function ($comment) {
                    return [
                        'uuid' => $comment->uuid,
                        'body' => $comment->body,
                        'user' => [
                            'uuid' => $comment->user?->uuid,
                            'name' => $comment->user?->name,
                            'avatar' => $comment->user?->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                        ],
                        'created_at' => $comment->created_at->toDateTimeString(),
                    ];
                });
            }),
            'is_starred' => $request->user() ? (
                $this->relationLoaded('starredByUsers') 
                    ? $this->starredByUsers->contains('id', $request->user()->id) 
                    : $this->starredByUsers()->where('user_id', $request->user()->id)->exists()
            ) : false,
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
