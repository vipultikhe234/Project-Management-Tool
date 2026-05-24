<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class TicketService
{
    /**
     * Get a filtered, paginated list of tickets.
     */
    public function listTickets(array $filters, int $perPage = 50): LengthAwarePaginator
    {
        $query = Ticket::with(['project', 'assignee', 'reporter', 'comments', 'attachments']);

        $limit = isset($filters['per_page']) ? (int)$filters['per_page'] : 200;

        if (isset($filters['project_uuid']) && $filters['project_uuid'] !== 'all') {
            $project = Project::where('uuid', $filters['project_uuid'])->first();
            if ($project) {
                $query->where('project_id', $project->id);
            }
        }

        if (isset($filters['organization_uuid']) && $filters['organization_uuid'] !== 'all') {
            $query->whereHas('project.organization', function ($q) use ($filters) {
                $q->where('uuid', $filters['organization_uuid']);
            });
        }

        if (isset($filters['sprint_uuid'])) {
            $sprint = Sprint::where('uuid', $filters['sprint_uuid'])->first();
            if ($sprint) {
                $query->where('sprint_id', $sprint->id);
            }
        } elseif (isset($filters['backlog']) && $filters['backlog'] === 'true') {
            $query->whereNull('sprint_id');
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (isset($filters['assignee_uuid'])) {
            $assignee = User::where('uuid', $filters['assignee_uuid'])->first();
            if ($assignee) {
                $query->where('assignee_id', $assignee->id);
            }
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('key', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $query->paginate($limit);
    }

    /**
     * Create a ticket and auto-generate the issue key based on the project.
     */
    public function createTicket(array $data, User $creator): Ticket
    {
        return DB::transaction(function () use ($data, $creator) {
            $project = Project::where('uuid', $data['project_uuid'])->firstOrFail();
            
            // Auto generate next ticket key (e.g. ALPHA-12)
            $nextNum = Ticket::where('project_id', $project->id)->withTrashed()->count() + 1;
            $key = $project->key . '-' . $nextNum;

            $sprintId = null;
            if (isset($data['sprint_uuid'])) {
                $sprint = Sprint::where('uuid', $data['sprint_uuid'])->first();
                $sprintId = $sprint ? $sprint->id : null;
            }

            $assigneeId = null;
            if (isset($data['assignee_uuid'])) {
                $assignee = User::where('uuid', $data['assignee_uuid'])->first();
                $assigneeId = $assignee ? $assignee->id : null;
            }

            $parentTicketId = null;
            if (isset($data['parent_uuid'])) {
                $parentTicket = Ticket::where('uuid', $data['parent_uuid'])->first();
                $parentTicketId = $parentTicket ? $parentTicket->id : null;
            }

            $epicId = null;
            if (isset($data['epic_uuid'])) {
                $epicTicket = Ticket::where('uuid', $data['epic_uuid'])->first();
                $epicId = $epicTicket ? $epicTicket->id : null;
            }

            $ticket = Ticket::create([
                'uuid' => (string) Str::uuid(),
                'key' => $key,
                'project_id' => $project->id,
                'board_id' => $project->boards()->first()?->id,
                'sprint_id' => $sprintId,
                'parent_id' => $parentTicketId,
                'epic_id' => $epicId,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'To Do',
                'priority' => $data['priority'] ?? 'Medium',
                'type' => $data['type'] ?? 'Task',
                'story_points' => $data['story_points'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'work_logs' => $data['work_logs'] ?? null,
                'assignee_id' => $assigneeId,
                'reporter_id' => $creator->id,
                'created_by' => $creator->id,
            ]);

            // Create Audit Log
            ActivityLog::create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $creator->id,
                'action' => "created {$ticket->type} {$key}",
                'target_type' => 'Ticket',
                'target_id' => $ticket->id,
                'new_value' => json_encode($ticket->toArray()),
            ]);

            // Create notification for assignee
            if ($assigneeId && $assigneeId !== $creator->id) {
                Notification::create([
                    'uuid' => (string) Str::uuid(),
                    'user_id' => $assigneeId,
                    'title' => 'Issue Assigned',
                    'message' => "{$creator->name} assigned you the ticket: {$ticket->key} - {$ticket->title}",
                    'type' => 'ticket_assigned',
                    'data' => ['ticket_uuid' => $ticket->uuid],
                ]);
            }

            return $ticket;
        });
    }

    /**
     * Update a ticket, log modified fields, and create notifications.
     */
    public function updateTicket(Ticket $ticket, array $data, User $updater): Ticket
    {
        return DB::transaction(function () use ($ticket, $data, $updater) {
            $original = $ticket->getOriginal();

            if (array_key_exists('sprint_uuid', $data)) {
                $sprint = $data['sprint_uuid'] ? Sprint::where('uuid', $data['sprint_uuid'])->first() : null;
                $data['sprint_id'] = $sprint ? $sprint->id : null;
                unset($data['sprint_uuid']);
            }

            if (array_key_exists('assignee_uuid', $data)) {
                $assignee = $data['assignee_uuid'] ? User::where('uuid', $data['assignee_uuid'])->first() : null;
                $data['assignee_id'] = $assignee ? $assignee->id : null;
                unset($data['assignee_uuid']);
            }

            if (array_key_exists('epic_uuid', $data)) {
                $epic = $data['epic_uuid'] ? Ticket::where('uuid', $data['epic_uuid'])->first() : null;
                $data['epic_id'] = $epic ? $epic->id : null;
                unset($data['epic_uuid']);
            }

            if (array_key_exists('code_reviewer_uuid', $data)) {
                $reviewer = $data['code_reviewer_uuid'] ? User::where('uuid', $data['code_reviewer_uuid'])->first() : null;
                $data['reporter_id'] = $reviewer ? $reviewer->id : null;
                unset($data['code_reviewer_uuid']);
            }

            $ticket->update($data);

            $changes = $ticket->getChanges();
            
            if (!empty($changes)) {
                foreach ($changes as $field => $newValue) {
                    // Skip technical fields in public logging
                    if (in_array($field, ['updated_at'])) continue;

                    $oldValue = $original[$field] ?? null;

                    $action = "updated {$field} on issue {$ticket->key}";
                    if ($field === 'status') {
                        $action = "updated status on issue {$ticket->key} from {$oldValue} to {$newValue}";
                    } elseif ($field === 'priority') {
                        $action = "updated priority on issue {$ticket->key} from {$oldValue} to {$newValue}";
                    } elseif ($field === 'story_points') {
                        $displayOld = $oldValue ?? 'None';
                        $displayNew = $newValue ?? 'None';
                        $action = "updated estimate on issue {$ticket->key} from {$displayOld} to {$displayNew}";
                    } elseif ($field === 'title') {
                        $action = "updated title on issue {$ticket->key} from '{$oldValue}' to '{$newValue}'";
                    } elseif ($field === 'assignee_id') {
                        $oldUser = $oldValue ? \App\Models\User::find($oldValue) : null;
                        $newUser = $newValue ? \App\Models\User::find($newValue) : null;
                        $displayOld = $oldUser ? $oldUser->name : 'Unassigned';
                        $displayNew = $newUser ? $newUser->name : 'Unassigned';
                        $action = "changed assignee on issue {$ticket->key} from {$displayOld} to {$displayNew}";
                    } elseif ($field === 'sprint_id') {
                        $oldSprint = $oldValue ? \App\Models\Sprint::find($oldValue) : null;
                        $newSprint = $newValue ? \App\Models\Sprint::find($newValue) : null;
                        $displayOld = $oldSprint ? $oldSprint->name : 'Backlog';
                        $displayNew = $newSprint ? $newSprint->name : 'Backlog';
                        $action = "changed sprint on issue {$ticket->key} from {$displayOld} to {$displayNew}";
                    } elseif ($field === 'epic_id') {
                        $oldEpic = $oldValue ? \App\Models\Ticket::find($oldValue) : null;
                        $newEpic = $newValue ? \App\Models\Ticket::find($newValue) : null;
                        $displayOld = $oldEpic ? $oldEpic->title : 'None';
                        $displayNew = $newEpic ? $newEpic->title : 'None';
                        $action = "changed epic on issue {$ticket->key} from {$displayOld} to {$displayNew}";
                    } elseif ($field === 'reporter_id') {
                        $oldReviewer = $oldValue ? \App\Models\User::find($oldValue) : null;
                        $newReviewer = $newValue ? \App\Models\User::find($newValue) : null;
                        $displayOld = $oldReviewer ? $oldReviewer->name : 'None';
                        $displayNew = $newReviewer ? $newReviewer->name : 'None';
                        $action = "changed code reviewer on issue {$ticket->key} from {$displayOld} to {$displayNew}";
                    }

                    ActivityLog::create([
                        'uuid' => (string) Str::uuid(),
                        'user_id' => $updater->id,
                        'action' => $action,
                        'target_type' => 'Ticket',
                        'target_id' => $ticket->id,
                        'old_value' => is_array($oldValue) || is_object($oldValue) ? json_encode($oldValue) : (string) $oldValue,
                        'new_value' => is_array($newValue) || is_object($newValue) ? json_encode($newValue) : (string) $newValue,
                    ]);
                }

                // If assignee changed, notify the new assignee
                if (isset($changes['assignee_id']) && $changes['assignee_id'] && $changes['assignee_id'] !== $updater->id) {
                    Notification::create([
                        'uuid' => (string) Str::uuid(),
                        'user_id' => $changes['assignee_id'],
                        'title' => 'Issue Assigned',
                        'message' => "{$updater->name} assigned you the ticket: {$ticket->key} - {$ticket->title}",
                        'type' => 'ticket_assigned',
                        'data' => ['ticket_uuid' => $ticket->uuid],
                    ]);
                }
            }

            return $ticket->load(['project', 'assignee', 'reporter', 'comments', 'attachments', 'workLogs.user']);
        });
    }

    /**
     * Delete a ticket.
     */
    public function deleteTicket(Ticket $ticket): bool
    {
        return $ticket->delete();
    }
}
