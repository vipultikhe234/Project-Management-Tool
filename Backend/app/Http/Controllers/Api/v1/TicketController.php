<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\TicketRequest;
use App\Http\Resources\Api\v1\TicketResource;
use App\Services\TicketService;
use App\Models\Ticket;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    protected $ticketService;

    public function __construct(TicketService $ticketService)
    {
        $this->ticketService = $ticketService;
    }

    /**
     * Display a filtered list of tickets.
     */
    public function index(Request $request)
    {
        $tickets = $this->ticketService->listTickets($request->all());
        return TicketResource::collection($tickets);
    }

    /**
     * Store a newly created ticket.
     */
    public function store(TicketRequest $request)
    {
        $ticket = $this->ticketService->createTicket($request->validated(), $request->user());
        return new TicketResource($ticket);
    }

    /**
     * Display the specified ticket.
     */
    public function show(string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)
            ->with(['project', 'assignee', 'reporter', 'comments.user', 'attachments.user', 'subtasks', 'workLogs.user'])
            ->firstOrFail();
        return new TicketResource($ticket);
    }

    /**
     * Update the specified ticket.
     */
    public function update(TicketRequest $request, string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)->firstOrFail();
        $ticket = $this->ticketService->updateTicket($ticket, $request->validated(), $request->user());
        return new TicketResource($ticket);
    }

    /**
     * Remove the specified ticket from storage.
     */
    public function destroy(string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)->firstOrFail();
        $this->ticketService->deleteTicket($ticket);
        return response()->json(['message' => 'Ticket deleted successfully']);
    }

    /**
     * Get starred tickets for the current user.
     */
    public function getStarred(Request $request)
    {
        $user = $request->user();
        $tickets = $user->starredTickets()->with(['project', 'assignee', 'reporter'])->paginate(50);
        return TicketResource::collection($tickets);
    }

    /**
     * Get recently viewed tickets for the current user.
     */
    public function getRecent(Request $request)
    {
        $user = $request->user();
        $tickets = $user->recentlyViewedTickets()
            ->with(['project', 'assignee', 'reporter'])
            ->take(10)
            ->get();
        return TicketResource::collection($tickets);
    }

    /**
     * Toggle star for a ticket.
     */
    public function toggleStar(Request $request, string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)->firstOrFail();
        $user = $request->user();
        
        $exists = $user->starredTickets()->where('ticket_id', $ticket->id)->exists();
        if ($exists) {
            $user->starredTickets()->detach($ticket->id);
            $starred = false;
        } else {
            $user->starredTickets()->attach($ticket->id);
            $starred = true;
        }

        return response()->json([
            'message' => $starred ? 'Ticket starred' : 'Ticket unstarred',
            'is_starred' => $starred
        ]);
    }

    /**
     * Record a view event for a ticket.
     */
    public function recordView(Request $request, string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)->firstOrFail();
        $user = $request->user();

        // Update or insert recently viewed record
        $user->recentlyViewedTickets()->syncWithoutDetaching([
            $ticket->id => ['viewed_at' => now()]
        ]);

        // Touch the pivot timestamp or force update
        $user->recentlyViewedTickets()->updateExistingPivot($ticket->id, [
            'viewed_at' => now()
        ]);

        return response()->json(['message' => 'View recorded successfully']);
    }

    /**
     * Get activity logs for a specific ticket.
     */
    public function getActivityLogs(string $uuid)
    {
        $ticket = Ticket::where('uuid', $uuid)->firstOrFail();
        $logs = \App\Models\ActivityLog::where('target_type', 'Ticket')
            ->where('target_id', $ticket->id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $logs->map(function ($log) {
                return [
                    'uuid' => $log->uuid,
                    'action' => $log->action,
                    'old_value' => $log->old_value,
                    'new_value' => $log->new_value,
                    'created_at' => $log->created_at->diffForHumans(),
                    'user' => [
                        'uuid' => $log->user?->uuid,
                        'name' => $log->user?->name,
                    ]
                ];
            })
        ]);
    }

    /**
     * Store a newly created work log for a ticket.
     */
    public function storeWorkLog(Request $request, string $ticketUuid)
    {
        $request->validate([
            'hours' => 'required|numeric|min:0.01',
            'log_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $ticket = Ticket::where('uuid', $ticketUuid)->firstOrFail();
        $user = $request->user();

        $workLog = \App\Models\TicketWorkLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'hours' => $request->input('hours'),
            'log_date' => $request->input('log_date'),
            'description' => $request->input('description') ?? 'Logged time via Time Tracking',
        ]);

        $this->updateCachedWorkLogs($ticket);

        // Create Activity Log
        \App\Models\ActivityLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'action' => "logged {$workLog->hours}h on issue {$ticket->key}",
            'target_type' => 'Ticket',
            'target_id' => $ticket->id,
        ]);

        return new TicketResource($ticket->load(['project', 'assignee', 'reporter', 'comments.user', 'attachments.user', 'subtasks', 'workLogs.user']));
    }

    /**
     * Update a specific work log.
     */
    public function updateWorkLog(Request $request, string $uuid)
    {
        $request->validate([
            'hours' => 'required|numeric|min:0.01',
            'log_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $workLog = \App\Models\TicketWorkLog::where('uuid', $uuid)->firstOrFail();
        $ticket = $workLog->ticket;
        $user = $request->user();

        $workLog->update([
            'hours' => $request->input('hours'),
            'log_date' => $request->input('log_date'),
            'description' => $request->input('description') ?? $workLog->description,
        ]);

        $this->updateCachedWorkLogs($ticket);

        // Create Activity Log
        \App\Models\ActivityLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'action' => "updated work log to {$workLog->hours}h on issue {$ticket->key}",
            'target_type' => 'Ticket',
            'target_id' => $ticket->id,
        ]);

        return new TicketResource($ticket->load(['project', 'assignee', 'reporter', 'comments.user', 'attachments.user', 'subtasks', 'workLogs.user']));
    }

    /**
     * Destroy a specific work log.
     */
    public function destroyWorkLog(Request $request, string $uuid)
    {
        $workLog = \App\Models\TicketWorkLog::where('uuid', $uuid)->firstOrFail();
        $ticket = $workLog->ticket;
        $user = $request->user();

        $hours = $workLog->hours;
        $workLog->delete();

        $this->updateCachedWorkLogs($ticket);

        // Create Activity Log
        \App\Models\ActivityLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'action' => "deleted work log of {$hours}h on issue {$ticket->key}",
            'target_type' => 'Ticket',
            'target_id' => $ticket->id,
        ]);

        return new TicketResource($ticket->load(['project', 'assignee', 'reporter', 'comments.user', 'attachments.user', 'subtasks', 'workLogs.user']));
    }

    /**
     * Helper to re-compile the work_logs cache array.
     */
    private function updateCachedWorkLogs(Ticket $ticket): void
    {
        $workLogsArray = $ticket->workLogs()
            ->selectRaw('log_date, SUM(hours) as total_hours')
            ->groupBy('log_date')
            ->pluck('total_hours', 'log_date')
            ->toArray();

        $workLogsArray = array_map('floatval', $workLogsArray);

        $ticket->update(['work_logs' => $workLogsArray]);
    }
}
