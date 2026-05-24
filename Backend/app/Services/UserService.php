<?php

namespace App\Services;

use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class UserService
{
    /**
     * Get a paginated list of users.
     */
    public function listUsers(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = User::with(['role', 'organizations']);

        if (isset($filters['organization_uuid'])) {
            $query->where(function ($query) use ($filters) {
                $query->whereHas('organizations', function ($q) use ($filters) {
                    $q->where('organizations.uuid', $filters['organization_uuid']);
                })->orWhereHas('role', function ($q) {
                    $q->where('slug', 'admin');
                });
            });
        }

        if (isset($filters['role_slug'])) {
            $query->whereHas('role', function ($q) use ($filters) {
                $q->where('slug', $filters['role_slug']);
            });
        }

        $limit = isset($filters['per_page']) ? (int)$filters['per_page'] : $perPage;

        return $query->paginate($limit);
    }

    /**
     * Create a new user.
     */
    public function createUser(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'uuid' => (string) Str::uuid(),
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role_id' => $data['role_id'],
                'status' => $data['status'] ?? 'active',
            ]);

            if (isset($data['organization_uuid'])) {
                $role = Role::find($data['role_id']);
                // Only associate with organization if NOT a Super Admin
                if ($role && $role->slug !== 'admin') {
                    $organization = Organization::where('uuid', $data['organization_uuid'])->first();
                    if ($organization) {
                        $user->organizations()->attach($organization->id, [
                            'role_id' => $role->id,
                            'joined_at' => now(),
                        ]);
                    }
                }
            }

            return $user;
        });
    }

    /**
     * Update an existing user.
     */
    public function updateUser(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            if (isset($data['password']) && !empty($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }

            $user->update($data);

            if (isset($data['organization_uuid'])) {
                $roleId = $data['role_id'] ?? $user->role_id;
                $role = Role::find($roleId);
                // Only sync organization if NOT a Super Admin
                if ($role && $role->slug !== 'admin') {
                    $organization = Organization::where('uuid', $data['organization_uuid'])->first();
                    if ($organization) {
                        $user->organizations()->sync([$organization->id => [
                            'role_id' => $role->id,
                            'joined_at' => now(),
                        ]]);
                    }
                } else {
                    // If it is a Super Admin, remove any existing organization links
                    $user->organizations()->detach();
                }
            }

            return $user->load(['role', 'organizations']);
        });
    }

    /**
     * Find a user by UUID.
     */
    public function findByUuid(string $uuid): User
    {
        return User::where('uuid', $uuid)->with('role')->firstOrFail();
    }

    /**
     * Delete a user.
     */
    public function deleteUser(User $user): bool
    {
        return $user->delete();
    }
}
