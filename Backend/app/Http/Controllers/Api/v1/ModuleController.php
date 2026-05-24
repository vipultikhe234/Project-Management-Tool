<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\SubModule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ModuleController extends Controller
{
    /**
     * List all modules with their sub-modules.
     */
    public function index()
    {
        $modules = Module::with(['subModules' => function ($query) {
            $query->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        return response()->json([
            'data' => $modules
        ]);
    }

    /**
     * Create a parent module.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100|unique:modules,slug',
            'icon' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $module = Module::create([
            'name' => $request->name,
            'slug' => Str::slug($request->slug),
            'icon' => $request->icon ?? 'LayoutDashboard',
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return response()->json([
            'message' => 'Module created successfully',
            'data' => $module
        ], 201);
    }

    /**
     * Create a sub-module.
     */
    public function storeSubModule(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'module_uuid' => 'required|string|exists:modules,uuid',
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100|unique:sub_modules,slug',
            'route' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $module = Module::where('uuid', $request->module_uuid)->firstOrFail();

        $subModule = SubModule::create([
            'module_id' => $module->id,
            'name' => $request->name,
            'slug' => Str::slug($request->slug),
            'route' => $request->route,
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return response()->json([
            'message' => 'Sub-module created successfully',
            'data' => $subModule
        ], 201);
    }

    /**
     * Delete a module.
     */
    public function destroy($uuid)
    {
        $module = Module::where('uuid', $uuid)->firstOrFail();
        $module->delete();

        return response()->json([
            'message' => 'Module deleted successfully'
        ]);
    }

    /**
     * Delete a sub-module.
     */
    public function destroySubModule($uuid)
    {
        $subModule = SubModule::where('uuid', $uuid)->firstOrFail();
        $subModule->delete();

        return response()->json([
            'message' => 'Sub-module deleted successfully'
        ]);
    }
}
