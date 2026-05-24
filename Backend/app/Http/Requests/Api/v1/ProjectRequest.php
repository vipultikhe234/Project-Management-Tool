<?php

namespace App\Http\Requests\Api\v1;

use App\Models\Project;
use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectUuid = $this->route('uuid');
        $orgUuid = $this->input('organization_uuid');

        // Resolve organization ID for unique key validation scoping
        $orgId = null;
        if ($orgUuid) {
            $orgId = Organization::where('uuid', $orgUuid)->first()?->id;
        }

        // If updating a project, fetch its existing organization ID
        if ($projectUuid && !$orgId) {
            $project = Project::where('uuid', $projectUuid)->first();
            if ($project) {
                $orgId = $project->organization_id;
            }
        }

        $uniqueRule = Rule::unique('projects', 'key');
        if ($orgId) {
            $uniqueRule = $uniqueRule->where('organization_id', $orgId);
        }

        if ($projectUuid) {
            $project = Project::where('uuid', $projectUuid)->first();
            if ($project) {
                $uniqueRule = $uniqueRule->ignore($project->id);
            }
        }

        return [
            'organization_uuid' => 'sometimes|required|exists:organizations,uuid',
            'key' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:10',
                $uniqueRule
            ],
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'avatar' => 'nullable|string',
            'type' => 'sometimes|string|in:kanban,scrum',
            'allowed_types' => 'sometimes|array',
            'allowed_types.*' => 'string|in:Story,Task,Bug,Epic,Subtask,Spike',
        ];
    }
}
