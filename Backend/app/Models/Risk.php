<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Risk extends Model
{
    protected $table = 'risks';

    protected $fillable = [
        'uuid',
        'project_id',
        'title',
        'impact',
        'probability',
        'mitigation_plan',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
