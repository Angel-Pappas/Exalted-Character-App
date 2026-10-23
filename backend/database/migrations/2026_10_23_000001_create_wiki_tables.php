<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// People & Places: a character owner's private wiki of people, places and groups.
// Adds only; nothing existing changes.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wiki_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('character_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 8);
            $table->string('name', 200);
            // A person's current place, a place's surrounding place, a group's base.
            $table->foreignUuid('place_id')->nullable()->constrained('wiki_pages')->nullOnDelete();
            // The main text and the optional sections, as the editor's JSON.
            $table->json('body')->nullable();
            $table->json('sections')->nullable();
            // Where the uploaded image is stored (local disk), if there is one.
            $table->string('image_path')->nullable();
            $table->timestamps();
            $table->index('character_id');
        });

        // Which groups each page belongs to (a person in the entourage, a legion in the villains' pay).
        Schema::create('wiki_page_groups', function (Blueprint $table) {
            $table->foreignUuid('page_id')->constrained('wiki_pages')->cascadeOnDelete();
            $table->foreignUuid('group_id')->constrained('wiki_pages')->cascadeOnDelete();
            $table->primary(['page_id', 'group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wiki_page_groups');
        Schema::dropIfExists('wiki_pages');
    }
};
