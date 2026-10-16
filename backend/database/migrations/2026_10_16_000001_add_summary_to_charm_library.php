<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A charm's suggested one-line summary, shown on its card on the character sheet.
 * Players may override it per character (`CharacterCharm.customSummary`, in the
 * character's JSON); null means none written yet, and the card falls back to the
 * start of the description.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charm_library', function (Blueprint $table) {
            $table->text('summary')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('charm_library', function (Blueprint $table) {
            $table->dropColumn('summary');
        });
    }
};
