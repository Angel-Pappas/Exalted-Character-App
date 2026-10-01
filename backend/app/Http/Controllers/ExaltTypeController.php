<?php

namespace App\Http\Controllers;

use App\Models\ExaltType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ExaltTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ExaltType::query()->orderBy('sort_order')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $exaltType = ExaltType::create($this->validated($request) + [
            'sort_order' => (int) $request->integer('sort_order'),
        ]);

        return response()->json($exaltType->refresh(), 201);
    }

    public function update(Request $request, ExaltType $exaltType): Response
    {
        $exaltType->update($this->validated($request));

        return response()->noContent();
    }

    public function destroy(ExaltType $exaltType): Response
    {
        $exaltType->delete();

        return response()->noContent();
    }

    /**
     * @return array{name: string, caste_label: string, castes: list<string>}
     */
    private function validated(Request $request): array
    {
        /** @var array{name: string, caste_label: string, castes: list<string>} */
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'caste_label' => ['required', 'in:Caste,Aspect'],
            'castes' => ['present', 'array', 'list'],
            'castes.*' => ['string', 'max:255'],
        ]);
    }
}
