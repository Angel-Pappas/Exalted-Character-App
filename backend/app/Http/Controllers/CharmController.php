<?php

namespace App\Http\Controllers;

use App\Models\Charm;
use App\Services\CharmLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CharmController extends Controller
{
    public function __construct(private CharmLibrary $library) {}

    public function index(): JsonResponse
    {
        return response()->json($this->library->all());
    }

    public function store(Request $request): JsonResponse
    {
        [$fields, $lists] = $this->validated($request);

        $charm = $this->library->save($fields, $lists);

        return response()->json($charm->refresh(), 201);
    }

    public function update(Request $request, Charm $charm): Response
    {
        [$fields, $lists] = $this->validated($request);

        $this->library->save($fields, $lists, $charm);

        return response()->noContent();
    }

    /** The temporary admin triage flag (see CharmLibraryTab). */
    public function updateReviewAction(Request $request, Charm $charm): Response
    {
        $validated = $request->validate([
            'review_action' => ['nullable', 'in:freetext,set_list,ask_admin,no_action'],
        ]);

        $charm->update($validated);

        return response()->noContent();
    }

    public function destroy(Charm $charm): Response
    {
        $charm->delete();

        return response()->noContent();
    }

    /**
     * @return array{0: array<string, mixed>, 1: array{abilities: list<string>, prerequisite_abilities: list<string>, prerequisite_charms: list<string>, choice_options: list<string>, target_options: list<string>}}
     */
    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'page' => ['nullable', 'integer'],
            'description' => ['nullable', 'string', 'max:65000'],
            'mechanical_key' => ['nullable', 'string', 'max:255'],
            'mechanical_description' => ['nullable', 'string', 'max:65000'],
            'prerequisite_essence' => ['nullable', 'integer'],
            'choice_type' => ['nullable', 'in:ability,attribute,custom,freetext,multiselect'],
            'target_choice_type' => ['nullable', 'in:ability,attribute,custom,freetext'],
            'multiselect_cap_basis' => ['nullable', 'in:essence,target_rating'],
            'pick_counts' => ['nullable', 'array', 'list'],
            'pick_counts.*' => ['integer'],
            'abilities' => ['present', 'array', 'list'],
            'abilities.*' => ['string', 'max:255', 'distinct'],
            'prerequisite_abilities' => ['present', 'array', 'list'],
            'prerequisite_abilities.*' => ['string', 'max:65000'],
            'prerequisite_charms' => ['present', 'array', 'list'],
            'prerequisite_charms.*' => ['string', 'max:65000'],
            'choice_options' => ['present', 'array', 'list'],
            'choice_options.*' => ['string', 'max:500', 'distinct'],
            'target_options' => ['present', 'array', 'list'],
            'target_options.*' => ['string', 'max:500', 'distinct'],
        ]);

        $fields = [
            'type' => $validated['type'] ?? 'Universal',
            'name' => $validated['name'],
            'page' => $validated['page'] ?? null,
            // The global middleware turns "" into null; the column is NOT NULL.
            'description' => $validated['description'] ?? '',
            'mechanical_key' => $validated['mechanical_key'] ?? null,
            'mechanical_description' => $validated['mechanical_description'] ?? null,
            'prerequisite_essence' => $validated['prerequisite_essence'] ?? null,
            'choice_type' => $validated['choice_type'] ?? null,
            'target_choice_type' => $validated['target_choice_type'] ?? null,
            'multiselect_cap_basis' => $validated['multiselect_cap_basis'] ?? null,
            'pick_counts' => $validated['pick_counts'] ?? null,
        ];

        $lists = [
            'abilities' => $validated['abilities'],
            'prerequisite_abilities' => $validated['prerequisite_abilities'],
            'prerequisite_charms' => $validated['prerequisite_charms'],
            'choice_options' => $validated['choice_options'],
            'target_options' => $validated['target_options'],
        ];

        return [$fields, $lists];
    }
}
