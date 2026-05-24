<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'user_id',
        'action',
        'target_type',
        'target_id',
        'old_value',
        'new_value',
        'ip_address',
    ];

    /**
     * User who performed the logged action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
