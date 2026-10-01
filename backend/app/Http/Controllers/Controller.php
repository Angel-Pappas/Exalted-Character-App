<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * A field of the JSON body decoded as objects rather than PHP arrays.
     *
     * Laravel's own input decoding turns `{}` into `[]`, and its global
     * middleware trims strings and turns "" into null. Character sheets are
     * stored verbatim, so they are read from the raw body instead. Callers
     * validate the field's presence and type through the normal request first.
     */
    protected function rawJsonField(Request $request, string $field): mixed
    {
        $body = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);

        return $body->{$field};
    }
}
