<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // The live database holds the only copy of everyone's characters.
        DB::prohibitDestructiveCommands($this->app->isProduction());
        Model::shouldBeStrict(! $this->app->isProduction());

        Gate::define('admin', fn (User $user) => $user->isAdmin());

        // Login, sign-up and password changes: slow down password guessing.
        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(10)->by(strtolower((string) $request->input('username')).'|'.$request->ip()),
            Limit::perMinute(30)->by($request->ip()),
        ]);
    }
}
