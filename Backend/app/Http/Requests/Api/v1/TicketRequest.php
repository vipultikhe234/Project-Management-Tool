<?php

namespace App\Http\Requests\Api\v1;

use Illuminate\Foundation\Http\FormRequest;

class TicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_uuid' => 'required_without:uuid|exists:projects,uuid',
            'sprint_uuid' => 'nullable|exists:sprints,uuid',
            'parent_uuid' => 'nullable|exists:tickets,uuid',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|in:To Do,Ready Reopen,In Progress,In Review ( CR ),Ready for QA,QA,Done',
            'priority' => 'sometimes|string|in:Low,Medium,High,Critical',
            'type' => 'sometimes|string|in:Story,Task,Bug,Epic,Subtask,Spike',
            'epic_uuid' => [
                'nullable',
                'exists:tickets,uuid',
                function ($attribute, $value, $fail) {
                    $ticketUuid = $this->route('uuid');
                    $projectUuid = $this->input('project_uuid');

                    // Resolve project UUID if not supplied (for update actions)
                    if (!$projectUuid && $ticketUuid) {
                        $ticket = \App\Models\Ticket::where('uuid', $ticketUuid)->first();
                        if ($ticket) {
                            $projectUuid = $ticket->project?->uuid;
                        }
                    }

                    if ($projectUuid) {
                        $epic = \App\Models\Ticket::where('uuid', $value)->first();
                        $project = \App\Models\Project::where('uuid', $projectUuid)->first();

                        if ($epic && $project && $epic->project_id !== $project->id) {
                            $fail('The selected epic must belong to the same project.');
                        }
                        
                        if ($epic && $epic->type !== 'Epic') {
                            $fail('The selected ticket is not an Epic.');
                        }
                    }
                }
            ],
            'story_points' => 'nullable|integer|min:0',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'work_logs' => 'nullable|array',
            'assignee_uuid' => 'nullable|exists:users,uuid',
            'code_reviewer_uuid' => 'nullable|exists:users,uuid',
        ];
    }
}
