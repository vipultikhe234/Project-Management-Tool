<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\OrganizationController;
use App\Http\Controllers\Api\v1\UserController;
use App\Http\Controllers\Api\v1\RoleController;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\ProjectController;
use App\Http\Controllers\Api\v1\SprintController;
use App\Http\Controllers\Api\v1\TicketController;
use App\Http\Controllers\Api\v1\CommentController;
use App\Http\Controllers\Api\v1\NotificationController;
use App\Http\Controllers\Api\v1\DashboardController;
use App\Http\Controllers\Api\v1\ModuleController;
use App\Http\Controllers\Api\v1\PermissionController;
use App\Http\Controllers\Api\v1\ReportController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:api');

// API v1 Public Routes
Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/google-login', [AuthController::class, 'googleLogin']);
    Route::get('/organizations/list', [OrganizationController::class, 'listPublic']);
    Route::get('/organizations/by-slug/{slug}', [OrganizationController::class, 'getBySlugPublic']);
});

// API v1 Protected Routes
Route::prefix('v1')->middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Roles
    Route::get('/roles', [RoleController::class, 'index']);
    
    // Organizations
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::get('/organizations/{uuid}', [OrganizationController::class, 'show']);
    Route::put('/organizations/{uuid}', [OrganizationController::class, 'update']);
    
    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{uuid}', [ProjectController::class, 'show']);
    Route::put('/projects/{uuid}', [ProjectController::class, 'update']);
    Route::delete('/projects/{uuid}', [ProjectController::class, 'destroy']);
    Route::post('/projects/{uuid}/members', [ProjectController::class, 'addMember']);

    // Sprints
    Route::get('/sprints', [SprintController::class, 'index']);
    Route::post('/sprints', [SprintController::class, 'store']);
    Route::put('/sprints/{uuid}/start', [SprintController::class, 'start']);
    Route::put('/sprints/{uuid}/complete', [SprintController::class, 'complete']);

    // Tickets
    Route::get('/tickets/starred', [TicketController::class, 'getStarred']);
    Route::get('/tickets/recent', [TicketController::class, 'getRecent']);
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::post('/tickets/{uuid}/star', [TicketController::class, 'toggleStar']);
    Route::post('/tickets/{uuid}/view', [TicketController::class, 'recordView']);
    Route::get('/tickets/{uuid}', [TicketController::class, 'show']);
    Route::put('/tickets/{uuid}', [TicketController::class, 'update']);
    Route::delete('/tickets/{uuid}', [TicketController::class, 'destroy']);
    Route::get('/tickets/{uuid}/activity-logs', [TicketController::class, 'getActivityLogs']);

    // Ticket Work Logs
    Route::post('/tickets/{ticketUuid}/work-logs', [TicketController::class, 'storeWorkLog']);
    Route::put('/work-logs/{uuid}', [TicketController::class, 'updateWorkLog']);
    Route::delete('/work-logs/{uuid}', [TicketController::class, 'destroyWorkLog']);

    // Ticket Comments
    Route::post('/tickets/{ticketUuid}/comments', [CommentController::class, 'store']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{uuid}/read', [NotificationController::class, 'read']);

    // Dashboard Analytics
    Route::get('/dashboard-analytics', [DashboardController::class, 'index']);
    Route::get('/workspace/bootstrap', [DashboardController::class, 'bootstrap']);
    Route::get('/your-work', [DashboardController::class, 'yourWork']);
    Route::get('/reports', [ReportController::class, 'index']);

    // Access Management
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::post('/modules', [ModuleController::class, 'store']);
    Route::post('/sub-modules', [ModuleController::class, 'storeSubModule']);
    Route::delete('/modules/{uuid}', [ModuleController::class, 'destroy']);
    Route::delete('/sub-modules/{uuid}', [ModuleController::class, 'destroySubModule']);

    Route::get('/permissions/role/{role_id}', [PermissionController::class, 'getRolePermissions']);
    Route::post('/permissions/toggle', [PermissionController::class, 'togglePermission']);
});
