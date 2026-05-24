<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketChecklist extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'ticket_id',
        'title',
    ];

    /**
     * Parent ticket of this checklist.
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Items inside this checklist.
     */
    public function items(): HasMany
    {
        return $this->hasMany(TicketChecklistItem::class, 'checklist_id');
    }
}
