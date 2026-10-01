<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The global charm library and its child lists. Postgres returned child rows
     * in insertion order; MySQL guarantees no order, so every list that the app
     * shows in sequence carries an explicit `position`.
     */
    public function up(): void
    {
        Schema::create('charm_library', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type')->default('Universal');
            $table->string('name')->default('');
            $table->integer('page')->nullable();
            $table->text('description');
            $table->string('mechanical_key')->nullable();
            $table->text('mechanical_description')->nullable();
            $table->integer('prerequisite_essence')->nullable();
            $table->string('choice_type', 32)->nullable();
            $table->string('target_choice_type', 32)->nullable();
            $table->string('multiselect_cap_basis', 32)->nullable();
            $table->json('pick_counts')->nullable();
            $table->boolean('needs_review')->default(false);
            $table->string('review_action', 32)->nullable();
            $table->timestamps();
        });

        Schema::create('charm_abilities', function (Blueprint $table) {
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->string('ability');
            $table->integer('position')->default(0);
            $table->primary(['charm_id', 'ability']);
        });

        Schema::create('charm_modes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->text('label');
            $table->text('mode_text')->nullable();
            $table->integer('prerequisite_essence')->nullable();
            $table->integer('position')->default(0);
        });

        Schema::create('charm_mode_prerequisite_abilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mode_id')->constrained('charm_modes')->cascadeOnDelete();
            $table->text('text');
            $table->integer('position')->default(0);
        });

        Schema::create('charm_prerequisite_abilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->text('text');
            $table->integer('position')->default(0);
        });

        Schema::create('charm_prerequisite_charms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->text('charm_name');
            $table->integer('position')->default(0);
        });

        Schema::create('charm_choice_options', function (Blueprint $table) {
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->string('option', 500);
            $table->integer('sort_order')->default(0);
            $table->primary(['charm_id', 'option']);
        });

        Schema::create('charm_target_options', function (Blueprint $table) {
            $table->foreignUuid('charm_id')->constrained('charm_library')->cascadeOnDelete();
            $table->string('option', 500);
            $table->integer('sort_order')->default(0);
            $table->primary(['charm_id', 'option']);
        });

        // A tier belongs to exactly one of: a charm, or one of its modes.
        Schema::create('charm_essence_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('charm_id')->nullable()->constrained('charm_library')->cascadeOnDelete();
            $table->foreignUuid('mode_id')->nullable()->constrained('charm_modes')->cascadeOnDelete();
            $table->integer('essence_threshold');
            $table->text('effect_text');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charm_essence_tiers');
        Schema::dropIfExists('charm_target_options');
        Schema::dropIfExists('charm_choice_options');
        Schema::dropIfExists('charm_prerequisite_charms');
        Schema::dropIfExists('charm_prerequisite_abilities');
        Schema::dropIfExists('charm_mode_prerequisite_abilities');
        Schema::dropIfExists('charm_modes');
        Schema::dropIfExists('charm_abilities');
        Schema::dropIfExists('charm_library');
    }
};
