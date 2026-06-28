<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface DashboardRepositoryInterface
{
    public function getCachedStats(string $orgUuid, string $roleSlug);
    public function updateCachedStats(string $orgUuid, string $roleSlug, array $stats, array $activities, array $criticalIssues);
}
