<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Board;
use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use App\Repositories\Contracts\ProjectRepositoryInterface;
use App\Repositories\Contracts\OrganizationRepositoryInterface;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    protected $projectRepository;
    protected $orgRepository;

    public function __construct(
        ProjectRepositoryInterface $projectRepository,
        OrganizationRepositoryInterface $orgRepository
    ) {
        $this->projectRepository = $projectRepository;
        $this->orgRepository = $orgRepository;
    }

    /**
     * List all projects for a user within an organization.
     */
    public function listProjectsForUser(User $user, string $orgUuid)
    {
        return $this->projectRepository->listForUser($user, $orgUuid);
    }

    /**
     * Create a new project, default board, and assign the creator as a project admin.
     */
    public function createProject(array $data, User $user): Project
    {
        return DB::transaction(function () use ($data, $user) {
            $organization = $this->orgRepository->findByUuid($data['organization_uuid']);
            
            // Create Project
            $project = $this->projectRepository->create([
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
            
            $this->projectRepository->addMember($project, $user->id, $roleId);

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
        return $this->projectRepository->findByUuid($uuid);
    }

    /**
     * Update project attributes.
     */
    public function updateProject(Project $project, array $data): Project
    {
        return $this->projectRepository->update($project, $data);
    }

    /**
     * Delete a project.
     */
    public function deleteProject(Project $project): bool
    {
        return $this->projectRepository->delete($project);
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

        $this->projectRepository->addMember($project, $user->id, $roleId);

        return true;
    }
}
