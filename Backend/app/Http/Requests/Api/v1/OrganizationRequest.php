<?php

namespace App\Http\Requests\Api\v1;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Organization;

class OrganizationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        // Only Super Admins can create organizations globally via API
        if ($this->isMethod('POST')) {
            return $user->role?->slug === 'admin';
        }

        // For PUT/PATCH updates, allow Super Admins or Org Admins who belong to this organization
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $orgUuid = $this->route('organization');
            
            if ($user->role?->slug === 'admin') {
                return true;
            }

            if ($user->role?->slug === 'org_admin') {
                return $user->organizations()->where('organizations.uuid', $orgUuid)->exists();
            }

            return false;
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => 'required|string|max:150|min:3',
            'slug' => 'required|string|max:100|unique:organizations,slug,' . ($this->route('organization') ? Organization::where('uuid', $this->route('organization'))->first()?->id : 'NULL'),
            'primary_domain' => 'nullable|string|max:255',
        ];

        if ($this->user()?->role?->slug === 'admin') {
            $rules['subscription_plan'] = 'sometimes|string|in:FREE,PRO,ENTERPRISE';
        }

        return $rules;
    }
}
