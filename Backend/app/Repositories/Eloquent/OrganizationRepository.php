<?php

namespace App\Repositories\Eloquent;

use App\Models\Organization;
use App\Repositories\Contracts\OrganizationRepositoryInterface;

class OrganizationRepository implements OrganizationRepositoryInterface
{
    public function all()
    {
        return Organization::all();
    }

    public function find(int $id)
    {
        return Organization::findOrFail($id);
    }

    public function findByUuid(string $uuid)
    {
        return Organization::where('uuid', $uuid)->firstOrFail();
    }

    public function findBySlug(string $slug)
    {
        return Organization::where('slug', $slug)->firstOrFail();
    }

    public function create(array $data)
    {
        return Organization::create($data);
    }

    public function update(Organization $org, array $data)
    {
        $org->update($data);
        return $org;
    }
}
