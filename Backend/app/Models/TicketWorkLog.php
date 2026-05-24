<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketWorkLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'ticket_id',
        'user_id',
        'hours',
        'log_date',
        'description',
    ];

    protected $casts = [
        'hours' => 'float',
        'log_date' => 'date',
    ];

    /**
     * Parent ticket of this work log.
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * User who logged this work.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
