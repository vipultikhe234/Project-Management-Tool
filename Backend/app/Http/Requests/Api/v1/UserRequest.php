<?php

namespace App\Http\Requests\Api\v1;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\User;
use App\Models\Organization;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userUuid = $this->route('user');
        $userId = $userUuid ? User::where('uuid', $userUuid)->first()?->id : null;

        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . ($userId ?? 'NULL'),
            'password' => $this->isMethod('POST') ? 'required|string|min:8' : 'nullable|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'organization_uuid' => 'sometimes|nullable|exists:organizations,uuid',
            'status' => 'sometimes|string|in:active,inactive,suspended,ACTIVE,INACTIVE,SUSPENDED',
        ];
    }
}
