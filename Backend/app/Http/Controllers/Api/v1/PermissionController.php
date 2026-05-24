<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Module;
use App\Models\SubModule;
use App\Models\RolePermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PermissionController extends Controller
{
    /**
     * Get permission list for a role.
     */
    public function getRolePermissions($roleId)
    {
        $role = Role::findOrFail($roleId);

        // Fetch all modules with submodules
        $modules = Module::with(['subModules' => function ($query) {
            $query->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        // Fetch currently allowed sub_module_ids for this role
        $allowedSubModuleIds = RolePermission::where('role_id', $roleId)
            ->where('is_allowed', true)
            ->pluck('sub_module_id')
            ->toArray();

        // Add checked / is_allowed flag to each submodule
        $formattedModules = $modules->map(function ($module) use ($allowedSubModuleIds) {
            return [
                'id' => $module->id,
                'uuid' => $module->uuid,
                'name' => $module->name,
                'slug' => $module->slug,
                'icon' => $module->icon,
                'sort_order' => $module->sort_order,
                'sub_modules' => $module->subModules->map(function ($sub) use ($allowedSubModuleIds) {
                    return [
                        'id' => $sub->id,
                        'uuid' => $sub->uuid,
                        'name' => $sub->name,
                        'slug' => $sub->slug,
                        'route' => $sub->route,
                        'sort_order' => $sub->sort_order,
                        'is_allowed' => in_array($sub->id, $allowedSubModuleIds),
                    ];
                }),
            ];
        });

        return response()->json([
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
            ],
            'data' => $formattedModules
        ]);
    }

    /**
     * Toggle permission for a role.
     */
    public function togglePermission(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'role_id' => 'required|integer|exists:roles,id',
            'sub_module_uuid' => 'required|string|exists:sub_modules,uuid',
            'is_allowed' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $subModule = SubModule::where('uuid', $request->sub_module_uuid)->firstOrFail();

        $permission = RolePermission::updateOrCreate(
            [
                'role_id' => $request->role_id,
                'sub_module_id' => $subModule->id,
            ],
            [
                'is_allowed' => $request->is_allowed,
            ]
        );

        return response()->json([
            'message' => 'Permission updated successfully',
            'data' => [
                'role_id' => $permission->role_id,
                'sub_module_id' => $permission->sub_module_id,
                'is_allowed' => (bool) $permission->is_allowed,
            ]
        ]);
    }
}
