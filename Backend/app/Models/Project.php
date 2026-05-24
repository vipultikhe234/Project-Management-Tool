<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'organization_id',
        'key',
        'name',
        'description',
        'avatar',
        'allowed_types',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'allowed_types' => 'array',
        ];
    }

    /**
     * Parent organization of this project.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * User who created the project.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Members assigned to this project.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
                    ->withPivot('role_id', 'joined_at');
    }

    /**
     * Agile boards associated with this project.
     */
    public function boards(): HasMany
    {
        return $this->hasMany(Board::class);
    }

    /**
     * Issues (tickets) in this project.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}
