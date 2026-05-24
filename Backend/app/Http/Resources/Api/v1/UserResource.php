<?php

namespace App\Http\Resources\Api\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'role' => [
                'id' => $this->role?->id,
                'name' => $this->role?->name,
                'slug' => $this->role?->slug,
            ],
            'organizations' => $this->organizations->map(function ($org) {
                // Safely get the role name from the pivot
                $roleName = 'Unknown';
                if ($org->pivot) {
                    $role = \App\Models\Role::find($org->pivot->role_id);
                    $roleName = $role ? $role->name : 'Unknown';
                }
                return [
                    'uuid' => $org->uuid,
                    'name' => $org->name,
                    'role' => $roleName,
                ];
            }),
            'permissions' => $this->getPermissionsList(),
            'modules' => $this->getFilteredModules(),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
