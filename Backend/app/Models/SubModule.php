<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SubModule extends Model
{
    protected $fillable = ['uuid', 'module_id', 'name', 'slug', 'route', 'sort_order'];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permissions', 'sub_module_id', 'role_id')
                    ->withPivot('is_allowed')
                    ->withTimestamps();
    }
}
