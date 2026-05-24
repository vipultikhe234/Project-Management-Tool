<?php

namespace App\Http\Resources\Api\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'subscription_plan' => $this->subscription_plan,
            'primary_domain' => $this->primary_domain,
            'role' => $this->pivot && $this->pivot->relationLoaded('role') ? $this->pivot->role->name : ($this->pivot->role_id ?? null ? \App\Models\Role::find($this->pivot->role_id)?->name : null),
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString(),
        ];
    }
}
