<?php

namespace App\Repositories\Eloquent;

use App\Models\Project;
use App\Models\User;
use App\Repositories\Contracts\ProjectRepositoryInterface;

class ProjectRepository implements ProjectRepositoryInterface
{
    public function all()
    {
        return Project::all();
    }

    public function find(int $id)
    {
        return Project::findOrFail($id);
    }

    public function findByUuid(string $uuid)
    {
        return Project::where('uuid', $uuid)->firstOrFail();
    }

    public function listForUser(User $user, string $orgUuid)
    {
        $roleSlug = $user->role?->slug;
        $org = \App\Models\Organization::where('uuid', $orgUuid)->first();
        if (!$org) {
            return collect();
        }

        $belongsToOrg = $user->organizations()->where('organizations.id', $org->id)->exists();

        if ($roleSlug === 'admin' || $belongsToOrg) {
            return Project::where('organization_id', $org->id)->with(['boards', 'members.role', 'organization'])->get();
        }

        return $user->projects()
            ->where('projects.organization_id', $org->id)
            ->with(['boards', 'members.role', 'organization'])
            ->get();
    }

    public function create(array $data)
    {
        return Project::create($data);
    }

    public function update(Project $project, array $data)
    {
        $project->update($data);
        return $project;
    }

    public function delete(Project $project)
    {
        return $project->delete();
    }

    public function addMember(Project $project, int $userId, int $roleId)
    {
        if (!$project->members()->where('user_id', $userId)->exists()) {
            $project->members()->attach($userId, [
                'role_id' => $roleId,
                'joined_at' => now(),
            ]);
        }
        return $project;
    }
}
