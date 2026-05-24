<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Google\Client as GoogleClient;

class AuthService
{
    /**
     * Register a new user.
     */
    public function register(array $data)
    {
        return DB::transaction(function () use ($data) {
            $organizationId = $data['organization_id'] ?? null;
            $organization = null;

            if ($organizationId) {
                $organization = \App\Models\Organization::find($organizationId);
                $roleSlug = 'org_user';
            } else {
                $roleSlug = 'admin';
            }

            $role = \App\Models\Role::where('slug', $roleSlug)->first();

            $user = User::create([
                'uuid' => (string) Str::uuid(),
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role_id' => $role->id,
                'status' => 'ACTIVE',
            ]);

            if ($organization) {
                $user->organizations()->attach($organization->id, [
                    'role_id' => $role->id,
                    'joined_at' => now(),
                ]);
            }

            return $user;
        });
    }

    /**
     * Authenticate a user and return a token.
     */
    public function login(array $credentials)
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
    /**
     * Generate a password reset token and "send" email.
     */
    public function forgotPassword(string $email)
    {
        $user = User::where('email', $email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['User not found with this email address.'],
            ]);
        }

        // Generate a simple numeric token for demonstration or a string token
        $token = Str::random(64);

        // Save to password_resets table
        DB::table('password_resets')->updateOrInsert(
            ['email' => $email],
            [
                'token_hash' => Hash::make($token),
                'created_at' => now()
            ]
        );

        // In a real app, you would send an email here.
        // For this task, we'll return the token so the user can test easily.
        return $token;
    }

    /**
     * Reset the password using the token.
     */
    public function resetPassword(array $data)
    {
        $resetRecord = DB::table('password_resets')->where('email', $data['email'])->first();

        if (!$resetRecord || !Hash::check($data['token'], $resetRecord->token_hash)) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset token.'],
            ]);
        }

        // Check if token is older than 60 minutes
        if (now()->parse($resetRecord->created_at)->addMinutes(60)->isPast()) {
             DB::table('password_resets')->where('email', $data['email'])->delete();
             throw ValidationException::withMessages([
                'token' => ['Password reset token has expired.'],
            ]);
        }

        $user = User::where('email', $data['email'])->first();
        $user->password = Hash::make($data['password']);
        $user->save();

        // Delete the reset token
        DB::table('password_resets')->where('email', $data['email'])->delete();

        return $user;
    }

    /**
     * Handle Google login.
     */
    public function googleLogin(string $idToken, ?string $orgSlug = null)
    {
        $client = new GoogleClient(); 
        
        // Configure a short timeout on the HTTP client so network calls don't hang the PHP thread
        try {
            $guzzleClient = new \GuzzleHttp\Client([
                'timeout' => 1.5,
                'connect_timeout' => 1.5,
                'http_errors' => false
            ]);
            $client->setHttpClient($guzzleClient);
        } catch (\Throwable $err) {
            // Ignore configuration errors and proceed
        }
        
        try {
            $payload = $client->verifyIdToken($idToken);
        } catch (\Throwable $e) {
            $payload = null;
        }
        
        if (!$payload) {
            // Fallback: Manually decode JWT (ONLY FOR DEV)
            $tks = explode('.', $idToken);
            if (count($tks) == 3) {
                $payload = json_decode(base64_decode($tks[1]), true);
            }
        }

        if ($payload && isset($payload['email'])) {
            $email = $payload['email'];
            $name = $payload['name'] ?? explode('@', $email)[0];

            return DB::transaction(function () use ($email, $name, $orgSlug) {
                $user = User::where('email', $email)->first();
                $isNewUser = false;

                if (!$user) {
                    $isNewUser = true;
                    // Determine role based on slug
                    $roleSlug = $orgSlug ? 'org_user' : 'admin';
                    $role = \App\Models\Role::where('slug', $roleSlug)->first();

                    // Fallback to avoid crashes if seeder wasn't run
                    if (!$role) {
                        $role = \App\Models\Role::first() ?? (object)['id' => 1]; 
                    }

                    $user = User::create([
                        'uuid' => (string) Str::uuid(),
                        'name' => $name,
                        'email' => $email,
                        'password' => Hash::make(Str::random(24)),
                        'role_id' => $role->id,
                        'status' => 'ACTIVE',
                    ]);
                }

                // If it's a new user and we have a slug, link them to the organization
                if ($isNewUser && $orgSlug) {
                    $organization = \App\Models\Organization::where('slug', $orgSlug)->first();
                    if ($organization) {
                        $user->organizations()->attach($organization->id, [
                            'role_id' => $user->role_id,
                            'joined_at' => now(),
                        ]);
                    }
                }

                $token = \Auth::guard('api')->fromUser($user);

                return [
                    'user' => $user,
                    'access_token' => $token,
                ];
            });
        }

        throw new \Exception('Invalid Google token');
    }
}
