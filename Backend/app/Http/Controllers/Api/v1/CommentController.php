<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketComment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CommentController extends Controller
{


    /**
     * Store a comment for a specific ticket.
     */
    public function store(Request $request, string $ticketUuid)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $ticket = Ticket::where('uuid', $ticketUuid)->firstOrFail();
        
        $comment = TicketComment::create([
            'uuid' => (string) Str::uuid(),
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'body' => $request->input('body'),
        ]);

        return response()->json([
            'data' => [
                'uuid' => $comment->uuid,
                'body' => $comment->body,
                'user' => [
                    'uuid' => $request->user()->uuid,
                    'name' => $request->user()->name,
                    'avatar' => $request->user()->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                ],
                'created_at' => $comment->created_at->toDateTimeString(),
            ]
        ], 210); // 210 or 201 created. Let's return 201 or 200. Standard 201 is perfect!
    }
}
