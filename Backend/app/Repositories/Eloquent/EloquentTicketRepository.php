<?php

namespace App\Repositories\Eloquent;

use App\Models\Ticket;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Repositories\Contracts\TicketRepositoryInterface;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class EloquentTicketRepository implements TicketRepositoryInterface
{
    public function listTickets(array $filters, int $perPage = 50)
    {
        $query = Ticket::query();

        // Optimized load for lists: do NOT load heavy relations like comments, attachments, worklogs
        $query->with([
            'project.organization',
            'assignee',
            'reporter',
            'sprint',
            'parent',
            'epic',
        ]);

        // Handled relation counts via withCount to avoid N+1 count calls in resource
        $query->withCount('comments');

        if (\Illuminate\Support\Facades\Auth::check()) {
            $userId = \Illuminate\Support\Facades\Auth::id();
            $query->with(['starredByUsers' => function ($q) use ($userId) {
                $q->where('users.id', $userId);
            }]);
        }

        $limit = isset($filters['per_page']) ? (int)$filters['per_page'] : $perPage;

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
        } elseif (isset($filters['sprint_status'])) {
            $query->whereHas('sprint', function ($q) use ($filters) {
                $q->where('status', $filters['sprint_status']);
            });
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

    public function findByUuid(string $uuid, array $relations = [])
    {
        $query = Ticket::where('uuid', $uuid);
        if (!empty($relations)) {
            $query->with($relations);
        } else {
            // Load full relationships including worklogs and comments for detail page
            $query->with([
                'project.organization', 
                'assignee', 
                'reporter', 
                'comments.user', 
                'attachments.user', 
                'subtasks', 
                'workLogs.user'
            ]);
        }

        if (\Illuminate\Support\Facades\Auth::check()) {
            $userId = \Illuminate\Support\Facades\Auth::id();
            $query->with(['starredByUsers' => function ($q) use ($userId) {
                $q->where('users.id', $userId);
            }]);
        }

        return $query->firstOrFail();
    }

    public function create(array $data, User $creator)
    {
        return DB::transaction(function () use ($data, $creator) {
            $project = Project::where('uuid', $data['project_uuid'])->firstOrFail();
            
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

            ActivityLog::create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $creator->id,
                'action' => "created {$ticket->type} {$key}",
                'target_type' => 'Ticket',
                'target_id' => $ticket->id,
                'new_value' => json_encode($ticket->toArray()),
            ]);

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

    public function update(Ticket $ticket, array $data, User $updater)
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

            $ticket->update($data);
            $changes = $ticket->getChanges();
            
            if (!empty($changes)) {
                foreach ($changes as $field => $newValue) {
                    if (in_array($field, ['updated_at'])) continue;

                    $oldValue = $original[$field] ?? null;
                    $action = "updated {$field} on issue {$ticket->key}";

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

            return $ticket;
        });
    }

    public function delete(Ticket $ticket)
    {
        return $ticket->delete();
    }

    public function toggleStar(Ticket $ticket, User $user)
    {
        $exists = $user->starredTickets()->where('ticket_id', $ticket->id)->exists();
        if ($exists) {
            $user->starredTickets()->detach($ticket->id);
            return false;
        } else {
            $user->starredTickets()->attach($ticket->id);
            return true;
        }
    }

    public function recordView(Ticket $ticket, User $user)
    {
        $user->recentlyViewedTickets()->syncWithoutDetaching([
            $ticket->id => ['viewed_at' => now()]
        ]);

        $user->recentlyViewedTickets()->updateExistingPivot($ticket->id, [
            'viewed_at' => now()
        ]);
    }
}
