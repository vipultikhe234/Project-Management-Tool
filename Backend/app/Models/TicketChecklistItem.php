<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketChecklistItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'checklist_id',
        'title',
        'is_completed',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
    ];

    /**
     * Parent checklist of this item.
     */
    public function checklist(): BelongsTo
    {
        return $this->belongsTo(TicketChecklist::class, 'checklist_id');
    }
}
