<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tickets Table
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('key', 50)->unique(); // e.g. SPRINT-1, ALPHA-1024
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('board_id')->nullable()->constrained('boards')->onDelete('set null');
            $table->foreignId('sprint_id')->nullable()->constrained('sprints')->onDelete('set null');
            $table->foreignId('epic_id')->nullable()->constrained('tickets')->onDelete('set null');
            $table->foreignId('parent_id')->nullable()->constrained('tickets')->onDelete('cascade'); // self-referencing subtask
            $table->string('title', 255);
            $table->longText('description')->nullable();
            $table->string('status', 50)->default('To Do'); // To Do, In Progress, In Review, Done, Blocked
            $table->string('priority', 50)->default('Medium'); // Low, Medium, High, Critical
            $table->string('type', 50)->default('Task'); // Story, Task, Bug, Epic, Subtask
            $table->integer('story_points')->nullable();
            $table->date('due_date')->nullable();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('reporter_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->softDeletes();
            $table->timestamps();
        });

        // 2. Ticket Comments Table
        Schema::create('ticket_comments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('body');
            $table->timestamps();
        });

        // 3. Ticket Attachments Table
        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->integer('file_size');
            $table->string('mime_type', 100);
            $table->timestamps();
        });

        // 4. Ticket Watchers Table
        Schema::create('ticket_watchers', function (Blueprint $table) {
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->primary(['ticket_id', 'user_id']);
        });

        // 5. Ticket Checklists Table
        Schema::create('ticket_checklists', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->string('title', 255)->default('Checklist');
            $table->timestamps();
        });

        // 6. Ticket Checklist Items Table
        Schema::create('ticket_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('checklist_id')->constrained('ticket_checklists')->onDelete('cascade');
            $table->string('title', 255);
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_checklist_items');
        Schema::dropIfExists('ticket_checklists');
        Schema::dropIfExists('ticket_watchers');
        Schema::dropIfExists('ticket_attachments');
        Schema::dropIfExists('ticket_comments');
        Schema::dropIfExists('tickets');
    }
};
