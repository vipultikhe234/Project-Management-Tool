<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Module extends Model
{
    protected $fillable = ['uuid', 'name', 'slug', 'icon', 'sort_order'];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function subModules()
    {
        return $this->hasMany(SubModule::class)->orderBy('sort_order');
    }
}
