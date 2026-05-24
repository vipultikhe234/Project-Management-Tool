<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'name',
        'email',
        'password',
        'role_id',
        'status',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Organizations where the user is a member.
     */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_users')
                    ->using(OrganizationUser::class)
                    ->withPivot('role_id', 'joined_at');
    }

    /**
     * Organizations created by this user.
     */
    public function createdOrganizations(): HasMany
    {
        return $this->hasMany(Organization::class, 'created_by');
    }

    /**
     * User's system role.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get list of allowed sub-module routes for the user.
     */
    public function getPermissionsList(): array
    {
        if ($this->role_id === 1 || ($this->role && $this->role->slug === 'admin')) {
            return SubModule::pluck('route')->filter()->unique()->toArray();
        }

        if (!$this->role_id) {
            return [];
        }

        return SubModule::whereHas('roles', function ($query) {
            $query->where('roles.id', $this->role_id)
                  ->where('role_permissions.is_allowed', true);
        })->pluck('route')->filter()->unique()->toArray();
    }

    /**
     * Get the filtered hierarchical modules and sub-modules tree for the user.
     */
    public function getFilteredModules(): array
    {
        $modules = Module::with(['subModules' => function ($query) {
            $query->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        $isAdmin = $this->role_id === 1 || ($this->role && $this->role->slug === 'admin');

        if ($isAdmin) {
            return $modules->map(function ($module) {
                return [
                    'id' => $module->id,
                    'uuid' => $module->uuid,
                    'name' => $module->name,
                    'slug' => $module->slug,
                    'icon' => $module->icon,
                    'sort_order' => $module->sort_order,
                    'sub_modules' => $module->subModules->map(function ($sub) {
                        return [
                            'id' => $sub->id,
                            'uuid' => $sub->uuid,
                            'name' => $sub->name,
                            'slug' => $sub->slug,
                            'route' => $sub->route,
                            'sort_order' => $sub->sort_order,
                        ];
                    })->values()->toArray(),
                ];
            })->values()->toArray();
        }

        $allowedSubModuleIds = RolePermission::where('role_id', $this->role_id)
            ->where('is_allowed', true)
            ->pluck('sub_module_id')
            ->toArray();

        return $modules->map(function ($module) use ($allowedSubModuleIds) {
            $allowedSubs = $module->subModules->filter(function ($sub) use ($allowedSubModuleIds) {
                return in_array($sub->id, $allowedSubModuleIds);
            });

            if ($allowedSubs->isEmpty()) {
                return null;
            }

            return [
                'id' => $module->id,
                'uuid' => $module->uuid,
                'name' => $module->name,
                'slug' => $module->slug,
                'icon' => $module->icon,
                'sort_order' => $module->sort_order,
                'sub_modules' => $allowedSubs->map(function ($sub) {
                    return [
                        'id' => $sub->id,
                        'uuid' => $sub->uuid,
                        'name' => $sub->name,
                        'slug' => $sub->slug,
                        'route' => $sub->route,
                        'sort_order' => $sub->sort_order,
                    ];
                })->values()->toArray(),
            ];
        })->filter()->values()->toArray();
    }

    /**
     * Tickets starred by the user.
     */
    public function starredTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'starred_tickets')->withTimestamps();
    }

    /**
     * Tickets recently viewed by the user.
     */
    public function recentlyViewedTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'recently_viewed_tickets')
                    ->withPivot('viewed_at')
                    ->withTimestamps()
                    ->orderByPivot('viewed_at', 'desc');
    }
}
