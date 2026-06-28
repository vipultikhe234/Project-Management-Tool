<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\Contracts\TicketRepositoryInterface;

class TicketService
{
    protected $ticketRepository;

    public function __construct(TicketRepositoryInterface $ticketRepository)
    {
        $this->ticketRepository = $ticketRepository;
    }

    /**
     * Get a filtered, paginated list of tickets.
     */
    public function listTickets(array $filters, int $perPage = 50)
    {
        return $this->ticketRepository->listTickets($filters, $perPage);
    }

    /**
     * Create a ticket.
     */
    public function createTicket(array $data, User $creator): Ticket
    {
        return $this->ticketRepository->create($data, $creator);
    }

    /**
     * Update a ticket.
     */
    public function updateTicket(Ticket $ticket, array $data, User $updater): Ticket
    {
        return $this->ticketRepository->update($ticket, $data, $updater);
    }

    /**
     * Delete a ticket.
     */
    public function deleteTicket(Ticket $ticket): bool
    {
        return $this->ticketRepository->delete($ticket);
    }

    /**
     * Find a ticket by its UUID.
     */
    public function findByUuid(string $uuid, array $relations = []): Ticket
    {
        return $this->ticketRepository->findByUuid($uuid, $relations);
    }

    /**
     * Toggle starred ticket.
     */
    public function toggleStar(Ticket $ticket, User $user): bool
    {
        return $this->ticketRepository->toggleStar($ticket, $user);
    }

    /**
     * Record a recently viewed event.
     */
    public function recordView(Ticket $ticket, User $user): void
    {
        $this->ticketRepository->recordView($ticket, $user);
    }
}
