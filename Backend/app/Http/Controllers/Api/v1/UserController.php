<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\UserRequest;
use App\Http\Resources\Api\v1\UserResource;
use App\Services\UserService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $users = $this->userService->listUsers($request->all());
        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request)
    {
        $user = $this->userService->createUser($request->validated());
        return new UserResource($user->load('role'));
    }

    /**
     * Display the specified resource.
     */
    public function show(string $uuid)
    {
        $user = $this->userService->findByUuid($uuid);
        return new UserResource($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, string $uuid)
    {
        $user = $this->userService->findByUuid($uuid);
        $user = $this->userService->updateUser($user, $request->validated());
        return new UserResource($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $uuid)
    {
        $user = $this->userService->findByUuid($uuid);
        $this->userService->deleteUser($user);
        return response()->json(['message' => 'User deleted successfully']);
    }
}
