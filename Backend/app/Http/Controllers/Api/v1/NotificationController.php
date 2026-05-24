<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Display a listing of the user's notifications.
     */
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get();

        return response()->json([
            'data' => $notifications->map(function ($notif) {
                return [
                    'uuid' => $notif->uuid,
                    'title' => $notif->title,
                    'message' => $notif->message,
                    'is_read' => $notif->is_read,
                    'type' => $notif->type,
                    'data' => $notif->data,
                    'created_at' => $notif->created_at->diffForHumans(),
                ];
            })
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function read(string $uuid)
    {
        $notification = Notification::where('uuid', $uuid)->firstOrFail();
        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Notification marked as read successfully']);
    }
}
