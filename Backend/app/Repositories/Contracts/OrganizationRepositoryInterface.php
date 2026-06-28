<?php

namespace App\Repositories\Contracts;

use App\Models\Organization;

interface OrganizationRepositoryInterface
{
    public function all();
    public function find(int $id);
    public function findByUuid(string $uuid);
    public function findBySlug(string $slug);
    public function create(array $data);
    public function update(Organization $org, array $data);
}
