<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\OrganizationRequest;
use App\Http\Resources\Api\v1\OrganizationResource;
use App\Services\OrganizationService;
use App\Models\Organization;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    protected $organizationService;

    public function __construct(OrganizationService $organizationService)
    {
        $this->organizationService = $organizationService;
    }

    /**
     * Display a listing of organizations for the authenticated user.
     */
    public function index(Request $request)
    {
        $organizations = $this->organizationService->getUserOrganizations($request->user());
        return OrganizationResource::collection($organizations);
    }

    /**
     * Store a newly created organization.
     */
    public function store(OrganizationRequest $request)
    {
        $organization = $this->organizationService->register($request->validated(), $request->user());
        return new OrganizationResource($organization);
    }

    /**
     * Display the specified organization.
     */
    public function show(string $uuid)
    {
        $organization = Organization::where('uuid', $uuid)->firstOrFail();
        return new OrganizationResource($organization);
    }

    /**
     * Update the specified organization.
     */
    public function update(OrganizationRequest $request, string $uuid)
    {
        $organization = Organization::where('uuid', $uuid)->firstOrFail();
        $organization->update($request->validated());
        return new OrganizationResource($organization);
    }
    /**
     * Get organization by slug (public).
     */
    public function getBySlugPublic(string $slug)
    {
        $organization = Organization::where('slug', $slug)->firstOrFail();
        return new OrganizationResource($organization);
    }

    /**
     * List all organizations (public).
     */
    public function listPublic()
    {
        $organizations = Organization::all();
        return OrganizationResource::collection($organizations);
    }
}
