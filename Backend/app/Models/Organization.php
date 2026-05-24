<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Organization extends Model
{
    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'subscription_plan',
        'primary_domain',
        'created_by',
    ];

    /**
     * User who created the organization.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Users who are members of this organization.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_users')
                    ->using(OrganizationUser::class)
                    ->withPivot('role_id', 'joined_at');
    }
}
