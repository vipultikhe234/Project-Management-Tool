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
        $userId = null;

        // 1. Check 'user' parameter
        $userParam = $this->route('user');
        if ($userParam instanceof User) {
            $userId = $userParam->id;
        } elseif (is_string($userParam)) {
            $userId = User::where('uuid', $userParam)->first()?->id;
        }

        // 2. Check all route parameters
        if (!$userId && $this->route()) {
            foreach ($this->route()->parameters() as $param) {
                if ($param instanceof User) {
                    $userId = $param->id;
                    break;
                } elseif (is_string($param)) {
                    $found = User::where('uuid', $param)->first();
                    if ($found) {
                        $userId = $found->id;
                        break;
                    }
                }
            }
        }

        // 3. Fallback: Scan all URL segments for a valid UUID pattern
        if (!$userId) {
            foreach ($this->segments() as $segment) {
                if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $segment)) {
                    $found = User::where('uuid', $segment)->first();
                    if ($found) {
                        $userId = $found->id;
                        break;
                    }
                }
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
