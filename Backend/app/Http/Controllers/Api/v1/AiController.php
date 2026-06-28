<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    /**
     * Generate task description or acceptance criteria.
     */
    public function generateDescription(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'nullable|string|in:Story,Task,Bug,Epic,Subtask,Spike,Improvement',
        ]);

        $title = $request->input('title');
        $type = $request->input('type') ?? 'Task';

        $apiKey = env('GEMINI_API_KEY');
        if ($apiKey) {
            try {
                // Call Google Gemini API
                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => "Write an Agile ticket description and acceptance criteria in clean Markdown for a {$type} titled: \"{$title}\". Please include sections: Overview, Requirements, and Acceptance Criteria (using Gherkin Given-When-Then format)."]
                            ]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($text) {
                        return response()->json(['data' => ['text' => $text]]);
                    }
                }
            } catch (\Throwable $e) {
                // Fallback to mock
            }
        }

        // Mock AI response
        $mockText = "### Overview\n" .
            "As a user, I want to be able to **{$title}** so that I can accomplish my work efficiently and without issues within the SprintNIX platform.\n\n" .
            "### Requirements\n" .
            "1. Implement the user interface components to facilitate this requirement.\n" .
            "2. Ensure complete data validation rules are applied on the backend.\n" .
            "3. Create appropriate database migrations and indexes for performance.\n" .
            "4. Write extensive unit and integration tests.\n\n" .
            "### Acceptance Criteria\n" .
            "- **Scenario 1: Successful interaction**\n" .
            "  - **Given** I am an authenticated user on the relevant screen\n" .
            "  - **When** I trigger the action to \"{$title}\"\n" .
            "  - **Then** the system should complete the action and display a success notification.\n" .
            "- **Scenario 2: Validation Failure**\n" .
            "  - **Given** I enter invalid inputs for the action\n" .
            "  - **When** I attempt to submit the action\n" .
            "  - **Then** the system should reject the submission and highlight the incorrect fields.";

        return response()->json(['data' => ['text' => $mockText]]);
    }

    /**
     * Analyze a bug report and suggest fix.
     */
    public function analyzeBug(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'steps_to_reproduce' => 'nullable|string',
            'expected_result' => 'nullable|string',
            'actual_result' => 'nullable|string',
            'environment' => 'nullable|string',
        ]);

        $title = $request->input('title');
        $steps = $request->input('steps_to_reproduce');
        $expected = $request->input('expected_result');
        $actual = $request->input('actual_result');
        $env = $request->input('environment') ?? 'Production';

        $apiKey = env('GEMINI_API_KEY');
        if ($apiKey) {
            try {
                $prompt = "Analyze this bug report and suggest potential causes and fixes:\n" .
                    "Title: {$title}\n" .
                    "Environment: {$env}\n" .
                    "Steps to Reproduce: {$steps}\n" .
                    "Expected Result: {$expected}\n" .
                    "Actual Result: {$actual}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($text) {
                        return response()->json(['data' => ['analysis' => $text]]);
                    }
                }
            } catch (\Throwable $e) {
                // Fallback
            }
        }

        $mockAnalysis = "### AI Bug Analysis Report\n" .
            "**Potential Root Cause:**\n" .
            "- There is likely an unhandled exception or strict data-type mismatch in the controller validation logic when handling parameters for \"{$title}\" in the **{$env}** environment.\n" .
            "- It could also be due to network latency, missing API headers, or stale frontend state.\n\n" .
            "**Suggested Fixes:**\n" .
            "1. **Backend Validation:** Review the Request class rules to ensure they align with the frontend payload schema.\n" .
            "2. **Error Boundary:** Wrap the execution logic inside a `try-catch` block and log the detailed error stack trace to the system logs.\n" .
            "3. **Null Check:** Ensure nullable parameters are properly handled before accessing fields on model relations.";

        return response()->json(['data' => ['analysis' => $mockAnalysis]]);
    }

    /**
     * Summarize sprint results.
     */
    public function summarizeSprint(Request $request)
    {
        $request->validate([
            'sprint_name' => 'required|string|max:255',
            'completed_tickets' => 'required|integer',
            'pending_tickets' => 'required|integer',
            'total_story_points' => 'required|integer',
        ]);

        $name = $request->input('sprint_name');
        $completed = $request->input('completed_tickets');
        $pending = $request->input('pending_tickets');
        $sp = $request->input('total_story_points');

        $apiKey = env('GEMINI_API_KEY');
        if ($apiKey) {
            try {
                $prompt = "Write a professional sprint summary for an Agile team:\n" .
                    "Sprint: {$name}\n" .
                    "Completed Tickets: {$completed}\n" .
                    "Pending Tickets: {$pending}\n" .
                    "Total Story Points: {$sp}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($text) {
                        return response()->json(['data' => ['summary' => $text]]);
                    }
                }
            } catch (\Throwable $e) {
                // Fallback
            }
        }

        $rate = ($completed + $pending) > 0 ? round(($completed / ($completed + $pending)) * 100, 1) : 0;
        $mockSummary = "### Sprint Summary: {$name}\n" .
            "Overall, the team achieved a **{$rate}%** ticket completion rate during this sprint cycle. We completed **{$completed}** tickets, while **{$pending}** tickets are carried over to the backlog/next sprint.\n\n" .
            "**Key Achievements:**\n" .
            "- Successfully completed **{$completed}** core feature cards delivering estimated value of **{$sp}** story points.\n" .
            "- Maintained consistent velocity and successfully unblocked critical tasks.\n\n" .
            "**Areas of Improvement:**\n" .
            "- We recommend refining initial story estimation guidelines to reduce carrier-over tasks.\n" .
            "- Strengthen QA feedback loops to catch bug reports earlier in the sprint.";

        return response()->json(['data' => ['summary' => $mockSummary]]);
    }
}
