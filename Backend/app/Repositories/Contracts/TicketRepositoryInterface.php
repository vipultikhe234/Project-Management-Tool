<?php

namespace App\Repositories\Contracts;

use App\Models\Ticket;
use App\Models\User;

interface TicketRepositoryInterface
{
    public function listTickets(array $filters, int $perPage = 50);
    public function findByUuid(string $uuid, array $relations = []);
    public function create(array $data, User $creator);
    public function update(Ticket $ticket, array $data, User $updater);
    public function delete(Ticket $ticket);
    public function toggleStar(Ticket $ticket, User $user);
    public function recordView(Ticket $ticket, User $user);
}
