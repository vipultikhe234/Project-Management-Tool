<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface UserRepositoryInterface
{
    public function all();
    public function find(int $id);
    public function findByUuid(string $uuid);
    public function create(array $data);
    public function update(User $user, array $data);
    public function delete(User $user);
}
