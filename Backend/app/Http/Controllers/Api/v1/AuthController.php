<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Handle user login.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $credentials = $request->only('email', 'password');

        /** @var \PHPOpenSourceSaver\JWTAuth\JWTGuard $guard */
        $guard = Auth::guard('api');

        if (!$token = $guard->attempt($credentials)) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Handle user registration.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'organization_id' => 'nullable|integer|exists:organizations,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = $this->authService->register($request->all());
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }

        return response()->json([
            'message' => 'User registered successfully',
            'data' => $user
        ], 201);
    }

    /**
     * Get the authenticated User.
     */
    public function me()
    {
        return response()->json([
            'data' => new \App\Http\Resources\Api\v1\UserResource(Auth::guard('api')->user()->load(['role', 'organizations']))
        ]);
    }

    /**
     * Handle user logout.
     */
    public function logout()
    {
        Auth::guard('api')->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh a token.
     */
    public function refresh()
    {
        /** @var \PHPOpenSourceSaver\JWTAuth\JWTGuard $guard */
        $guard = Auth::guard('api');
        
        return $this->respondWithToken($guard->refresh());
    }

    /**
     * Handle Google login.
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'org_slug' => 'nullable|string'
        ]);

        try {
            $data = $this->authService->googleLogin($request->token, $request->org_slug);
            
            return response()->json([
                'message' => 'Google login successful',
                'data' => [
                    'access_token' => $data['access_token'],
                    'token_type' => 'bearer',
                    'expires_in' => Auth::guard('api')->factory()->getTTL() * 60,
                    'user' => new \App\Http\Resources\Api\v1\UserResource($data['user']->load(['role', 'organizations']))
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    /**
     * Handle forgot password request.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $token = $this->authService->forgotPassword($request->email);

        return response()->json([
            'message' => 'Password reset link sent to your email',
            'debug_token' => $token // In production, don't return this!
        ]);
    }

    /**
     * Handle password reset.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $this->authService->resetPassword($request->all());

        return response()->json([
            'message' => 'Password has been reset successfully'
        ]);
    }

    /**
     * Get the token array structure.
     */
    protected function respondWithToken($token)
    {
        /** @var \PHPOpenSourceSaver\JWTAuth\JWTGuard $guard */
        $guard = Auth::guard('api');

        return response()->json([
            'message' => 'Login successful',
            'data' => [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => $guard->factory()->getTTL() * 60,
                'user' => new \App\Http\Resources\Api\v1\UserResource($guard->user()->load(['role', 'organizations']))
            ]
        ]);
    }
}
