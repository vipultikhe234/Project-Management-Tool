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
        $userParam = $this->route('user');
        $userId = null;

        if ($userParam instanceof User) {
            $userId = $userParam->id;
        } elseif (is_string($userParam)) {
            $userId = User::where('uuid', $userParam)->first()?->id;
        }

        // Fallback: segment 4 (e.g., api/v1/users/{uuid})
        if (!$userId) {
            $segment = $this->segment(4);
            if ($segment && is_string($segment)) {
                $userId = User::where('uuid', $segment)->first()?->id;
            }
        }

        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                \Illuminate\Validation\Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => $this->isMethod('POST') ? 'required|string|min:8' : 'nullable|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'organization_uuid' => 'sometimes|nullable|exists:organizations,uuid',
            'status' => 'sometimes|string|in:active,inactive,suspended,ACTIVE,INACTIVE,SUSPENDED',
        ];
    }

    /**
     * Prepare data before validation — strip empty optional fields.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('organization_uuid') && empty($this->organization_uuid)) {
            $this->request->remove('organization_uuid');
        }
        if ($this->isMethod('PUT') && $this->has('password') && empty($this->password)) {
            $this->request->remove('password');
        }
    }
}
