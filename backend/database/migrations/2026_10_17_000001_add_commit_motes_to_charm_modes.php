<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Commit dots that come with a mode (Angel, 2026-10-17): an Exalt type's mode
 * that commits a mote (As the Crow Flies, Liminal), or an upgrade that adds one
 * (Mind-Hand Manipulation). The sheet adds them to the charm's own dots while the
 * character owns the mode — its own Exalt type's, and unlocked.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charm_modes', function (Blueprint $table) {
            $table->unsignedTinyInteger('commit_motes')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('charm_modes', function (Blueprint $table) {
            $table->dropColumn('commit_motes');
        });
    }
};
