<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DashboardStatistic extends Model
{
    protected $table = 'dashboard_statistics';

    protected $fillable = [
        'uuid',
        'organization_uuid',
        'role_slug',
        'stats',
        'recent_activities',
        'critical_issues',
    ];

    protected $casts = [
        'stats' => 'array',
        'recent_activities' => 'array',
        'critical_issues' => 'array',
    ];
}
