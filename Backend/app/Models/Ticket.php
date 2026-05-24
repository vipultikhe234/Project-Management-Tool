<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'key',
        'project_id',
        'board_id',
        'sprint_id',
        'epic_id',
        'parent_id',
        'title',
        'description',
        'status',
        'priority',
        'type',
        'story_points',
        'start_date',
        'due_date',
        'work_logs',
        'assignee_id',
        'reporter_id',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'work_logs' => 'array',
    ];

    /**
     * Parent project of the ticket.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Board associated with the ticket.
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /**
     * Sprint associated with the ticket.
     */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    /**
     * Epic parent ticket (if applicable).
     */
    public function epic(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'epic_id');
    }

    /**
     * Parent ticket (for subtasks).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'parent_id');
    }

    /**
     * Child subtasks under this ticket.
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Ticket::class, 'parent_id');
    }

    /**
     * Assigned user (developer/tester/etc.).
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * User who reported the issue.
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * User who created the database record.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Comments under this ticket.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TicketComment::class);
    }

    /**
     * Work logs history records for this ticket.
     */
    public function workLogs(): HasMany
    {
        return $this->hasMany(TicketWorkLog::class);
    }

    /**
     * File attachments uploaded for this ticket.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    /**
     * Watchers of this ticket.
     */
    public function watchers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'ticket_watchers');
    }

    /**
     * Checklists associated with this ticket.
     */
    public function checklists(): HasMany
    {
        return $this->hasMany(TicketChecklist::class);
    }

    /**
     * Users who starred this ticket.
     */
    public function starredByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'starred_tickets')->withTimestamps();
    }

    /**
     * Users who recently viewed this ticket.
     */
    public function viewedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'recently_viewed_tickets')->withPivot('viewed_at')->withTimestamps();
    }
}
