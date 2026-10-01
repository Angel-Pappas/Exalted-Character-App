<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\CharmController;
use App\Http\Controllers\ExaltTypeController;
use App\Http\Controllers\GameDataController;
use Illuminate\Support\Facades\Route;

// Loaded with the `web` middleware group under the /api prefix (see
// bootstrap/app.php): the React app is served from the same origin, so it
// authenticates with the session cookie and Laravel's CSRF protection.

Route::get('me', [AuthController::class, 'me']);

Route::middleware('throttle:auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::put('me/username', [AuthController::class, 'updateUsername']);
    Route::put('me/password', [AuthController::class, 'updatePassword'])->middleware('throttle:auth');

    Route::apiResource('characters', CharacterController::class);
    Route::get('game-data', [GameDataController::class, 'show']);
    Route::put('game-data', [GameDataController::class, 'update']);
    Route::get('exalt-types', [ExaltTypeController::class, 'index']);
    Route::get('charms', [CharmController::class, 'index']);

    Route::middleware('can:admin')->group(function () {
        Route::post('exalt-types', [ExaltTypeController::class, 'store']);
        Route::put('exalt-types/{exaltType}', [ExaltTypeController::class, 'update']);
        Route::delete('exalt-types/{exaltType}', [ExaltTypeController::class, 'destroy']);

        Route::post('charms', [CharmController::class, 'store']);
        Route::put('charms/{charm}', [CharmController::class, 'update']);
        Route::put('charms/{charm}/review-action', [CharmController::class, 'updateReviewAction']);
        Route::delete('charms/{charm}', [CharmController::class, 'destroy']);

        Route::prefix('admin')->group(function () {
            Route::get('users', [Admin\UserController::class, 'index']);
            Route::put('users/{user}/role', [Admin\UserController::class, 'updateRole']);
            Route::delete('users/{user}', [Admin\UserController::class, 'destroy']);
            Route::get('characters', [Admin\CharacterController::class, 'index']);
            Route::put('characters/{character}/owner', [Admin\CharacterController::class, 'move']);
        });
    });
});
