<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'slug'];

    public function subModules()
    {
        return $this->belongsToMany(SubModule::class, 'role_permissions', 'role_id', 'sub_module_id')
                    ->withPivot('is_allowed')
                    ->withTimestamps();
    }
}
