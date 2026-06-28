<?php

namespace App\Repositories\Contracts;

use App\Models\Sprint;

interface SprintRepositoryInterface
{
    public function all();
    public function find(int $id);
    public function findByUuid(string $uuid);
    public function create(array $data);
    public function update(Sprint $sprint, array $data);
    public function start(Sprint $sprint);
    public function complete(Sprint $sprint);
}
