<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class OrganizationService
{
    /**
     * Register a new organization and assign the creator as ORG_ADMIN.
     */
    public function register(array $data, User $user)
    {
        return DB::transaction(function () use ($data, $user) {
            return Organization::create([
                'uuid' => (string) Str::uuid(),
                'name' => $data['name'],
                'slug' => $data['slug'] ?? Str::slug($data['name']),
                'subscription_plan' => $data['subscription_plan'] ?? 'FREE',
                'primary_domain' => $data['primary_domain'] ?? null,
                'created_by' => $user->id,
            ]);
        });
    }

    /**
     * Get all organizations for a user.
     */
    public function getUserOrganizations(User $user)
    {
        // Load role if not loaded
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        if ($user->role?->slug === 'admin') {
            return Organization::all();
        }

        return $user->organizations()->withPivot('role_id', 'joined_at')->get();
    }
}
