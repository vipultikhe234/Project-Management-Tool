<?php

namespace App\Repositories\Contracts;

use App\Models\Project;
use App\Models\User;

interface ProjectRepositoryInterface
{
    public function all();
    public function find(int $id);
    public function findByUuid(string $uuid);
    public function listForUser(User $user, string $orgUuid);
    public function create(array $data);
    public function update(Project $project, array $data);
    public function delete(Project $project);
    public function addMember(Project $project, int $userId, int $roleId);
}
