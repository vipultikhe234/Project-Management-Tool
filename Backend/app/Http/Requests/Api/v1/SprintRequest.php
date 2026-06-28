<?php

namespace App\Http\Requests\Api\v1;

use Illuminate\Foundation\Http\FormRequest;

class SprintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'board_uuid' => $isUpdate ? 'nullable|exists:boards,uuid' : 'required|exists:boards,uuid',
            'name' => ($isUpdate ? 'sometimes' : 'required') . '|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'goal' => 'nullable|string',
            'status' => 'sometimes|string|in:future,active,completed',
        ];
    }
}
