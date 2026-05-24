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
        // 1. Projects Table
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('key', 10)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('avatar', 255)->nullable();
            $table->string('status', 50)->default('active'); // active, archived
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->softDeletes();
            $table->timestamps();
        });

        // 2. Project Members Pivot Table
        Schema::create('project_members', function (Blueprint $table) {
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['project_id', 'user_id']);
        });

        // 3. Boards Table (Scrum / Kanban Boards)
        Schema::create('boards', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->string('name', 255);
            $table->string('type', 50)->default('kanban'); // kanban, scrum
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // 4. Sprints Table
        Schema::create('sprints', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('board_id')->constrained('boards')->onDelete('cascade');
            $table->string('name', 255);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->text('goal')->nullable();
            $table->string('status', 50)->default('future'); // future, active, completed
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprints');
        Schema::dropIfExists('boards');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('projects');
    }
};
