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
        return true; // Authentication handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150|min:3',
            'slug' => 'required|string|max:100|unique:organizations,slug,' . ($this->route('organization') ? Organization::where('uuid', $this->route('organization'))->first()?->id : 'NULL'),
            'subscription_plan' => 'sometimes|string|in:FREE,PRO,ENTERPRISE',
            'primary_domain' => 'nullable|string|max:255',
        ];
    }
}
