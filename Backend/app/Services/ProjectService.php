<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Board;
use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class ProjectService
{
    /**
     * List all projects for a user within an organization.
     */
    public function listProjectsForUser(User $user, string $orgUuid): Collection
    {
        $organization = Organization::where('uuid', $orgUuid)->firstOrFail();
        
        // Super admin can see all projects in the org
        if ($user->role?->slug === 'admin') {
            return Project::where('organization_id', $organization->id)
                ->with(['boards', 'members.role', 'organization'])
                ->get();
        }

        // Other roles see projects they are members of
        return Project::where('organization_id', $organization->id)
            ->whereHas('members', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['boards', 'members.role', 'organization'])
            ->get();
    }

    /**
     * Create a new project, default board, and assign the creator as a project admin.
     */
    public function createProject(array $data, User $user): Project
    {
        return DB::transaction(function () use ($data, $user) {
            $organization = Organization::where('uuid', $data['organization_uuid'])->firstOrFail();
            
            // Create Project
            $project = Project::create([
                'uuid' => (string) Str::uuid(),
                'organization_id' => $organization->id,
                'key' => strtoupper($data['key']),
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'avatar' => $data['avatar'] ?? null,
                'status' => 'active',
                'created_by' => $user->id,
            ]);

            // Assign creator as Project Member (admin role or same role as organization user)
            $orgAdminRole = Role::where('slug', 'org_admin')->first();
            $roleId = $orgAdminRole ? $orgAdminRole->id : $user->role_id;
            
            $project->members()->attach($user->id, [
                'role_id' => $roleId,
                'joined_at' => now(),
            ]);

            // Create Default Board
            Board::create([
                'uuid' => (string) Str::uuid(),
                'project_id' => $project->id,
                'name' => $project->name . ' Board',
                'type' => $data['type'] ?? 'kanban', // kanban or scrum
                'created_by' => $user->id,
            ]);

            return $project;
        });
    }

    /**
     * Find project by UUID.
     */
    public function findByUuid(string $uuid): Project
    {
        return Project::where('uuid', $uuid)->with(['members', 'boards'])->firstOrFail();
    }

    /**
     * Update project attributes.
     */
    public function updateProject(Project $project, array $data): Project
    {
        $project->update($data);
        return $project;
    }

    /**
     * Delete a project.
     */
    public function deleteProject(Project $project): bool
    {
        return $project->delete();
    }

    /**
     * Add a member to a project.
     */
    public function addMember(Project $project, string $userUuid, int $roleId): bool
    {
        $user = User::where('uuid', $userUuid)->firstOrFail();
        
        if ($project->members()->where('user_id', $user->id)->exists()) {
            return false;
        }

        $project->members()->attach($user->id, [
            'role_id' => $roleId,
            'joined_at' => now(),
        ]);

        return true;
    }
}
