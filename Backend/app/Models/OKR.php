<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OKR extends Model
{
    protected $table = 'okrs';

    protected $fillable = [
        'uuid',
        'project_id',
        'objective',
        'key_results',
    ];

    protected $casts = [
        'key_results' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
