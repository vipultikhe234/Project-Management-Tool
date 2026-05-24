<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = ['role_id', 'sub_module_id', 'is_allowed'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function subModule()
    {
        return $this->belongsTo(SubModule::class);
    }
}
