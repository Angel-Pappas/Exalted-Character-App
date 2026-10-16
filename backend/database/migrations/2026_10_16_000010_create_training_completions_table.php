<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Finished trainings. The training itself is an Expense line in the sheet's
 * milestone ledger; whether it is done is kept here, outside the sheet, so the
 * Storyteller can mark it without touching the sheet (the owner's open page
 * saves the whole sheet and would overwrite such a change).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_completions', function (Blueprint $table) {
            $table->foreignUuid('character_id')->constrained()->cascadeOnDelete();
            $table->string('entry_id');
            $table->date('completed_on');
            $table->foreignUuid('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->primary(['character_id', 'entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_completions');
    }
};
