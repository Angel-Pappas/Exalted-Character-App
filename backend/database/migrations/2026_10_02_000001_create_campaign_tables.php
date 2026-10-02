<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Campaigns: one story a group plays. Adds only — no existing row is changed
// except that every character gains `kind`, defaulting to a PC.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->string('kind', 8)->default('pc')->after('name');
        });

        // Deleting the Storyteller's account deletes the campaign (never its characters).
        Schema::create('campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->foreignUuid('storyteller_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // Everyone in the campaign, the Storyteller included.
        Schema::create('campaign_members', function (Blueprint $table) {
            $table->foreignUuid('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['campaign_id', 'user_id']);
        });

        // Which characters are in which campaign, and whether each is public there.
        Schema::create('campaign_characters', function (Blueprint $table) {
            $table->foreignUuid('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('character_id')->constrained()->cascadeOnDelete();
            $table->string('visibility', 8);
            $table->timestamps();
            $table->primary(['campaign_id', 'character_id']);
        });

        // A character owner's private notes about another PC in its Circle.
        Schema::create('circle_notes', function (Blueprint $table) {
            $table->foreignUuid('character_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('subject_id')->constrained('characters')->cascadeOnDelete();
            $table->text('notes');
            $table->timestamps();
            $table->primary(['character_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_notes');
        Schema::dropIfExists('campaign_characters');
        Schema::dropIfExists('campaign_members');
        Schema::dropIfExists('campaigns');
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};
