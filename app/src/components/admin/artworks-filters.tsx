"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOCATION_PRESET_OPTIONS } from "@/lib/location-options";
import { MEDIUM_PRESET_OPTIONS } from "@/lib/medium-options";

type FilterArtist = {
  id: string;
  name: string;
};

type ArtworksFiltersProps = {
  artists: FilterArtist[];
  selectedArtistId: string;
  selectedMediumPreset: string;
  selectedLocationPreset: string;
  locationCustomQuery: string;
  showFramed: boolean;
  showUnframed: boolean;
};

const CUSTOM_LOCATION_VALUE = "__custom__";

export function ArtworksFilters({
  artists,
  selectedArtistId,
  selectedMediumPreset,
  selectedLocationPreset,
  locationCustomQuery,
  showFramed,
  showUnframed,
}: ArtworksFiltersProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationSelection, setLocationSelection] = useState(
    locationCustomQuery ? CUSTOM_LOCATION_VALUE : selectedLocationPreset
  );
  const useCustomLocation = locationSelection === CUSTOM_LOCATION_VALUE;
  const formStateKey = [
    selectedArtistId,
    selectedMediumPreset,
    selectedLocationPreset,
    locationCustomQuery,
    showFramed ? "1" : "0",
    showUnframed ? "1" : "0",
  ].join("|");

  function handleClear() {
    setLocationSelection("");
    router.push("/artworks");
  }

  return (
    <section className="mb-4 rounded-lg border p-3">
      <div className="flex items-center justify-between md:hidden">
        <h2 className="text-sm font-medium">Filters</h2>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-sm"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-controls="artworks-filters-form"
        >
          {mobileOpen ? "Hide" : "Show"}
        </button>
      </div>

      <form
        key={formStateKey}
        id="artworks-filters-form"
        method="GET"
        className={`${mobileOpen ? "mt-3 block" : "hidden"} md:mt-0 md:block`}
      >
        <div className="grid gap-3 md:grid-cols-2 lg:flex lg:flex-wrap lg:items-end xl:flex-nowrap">
          <label className="block lg:min-w-0 lg:basis-40 lg:shrink">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Artist
            </span>
            <select
              name="artistId"
              className="w-full rounded border px-3 py-2 text-sm"
              defaultValue={selectedArtistId}
            >
              <option value="">All artists</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:min-w-0 lg:basis-52 lg:shrink">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Medium & Support
            </span>
            <select
              name="mediumPreset"
              className="w-full rounded border px-3 py-2 text-sm"
              defaultValue={selectedMediumPreset}
            >
              <option value="">All media</option>
              {MEDIUM_PRESET_OPTIONS.map((medium) => (
                <option key={medium} value={medium}>
                  {medium}
                </option>
              ))}
            </select>
          </label>

          <div className="block lg:min-w-0 lg:flex-[1_1_18rem] xl:flex-[1_1_22rem]">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Location
            </span>
            <div className="grid gap-2 lg:flex lg:items-center lg:gap-2">
              <div className="lg:min-w-0 lg:flex-1">
                <select
                  name={useCustomLocation ? undefined : "locationPreset"}
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={locationSelection}
                  onChange={(event) => setLocationSelection(event.target.value)}
                >
                  <option value="">All locations</option>
                  {LOCATION_PRESET_OPTIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                  <option value={CUSTOM_LOCATION_VALUE}>Other...</option>
                </select>
              </div>
            </div>
            {useCustomLocation ? (
              <div className="mt-2">
                <input
                  name="locationCustom"
                  className="w-full rounded border px-3 py-2 text-sm"
                  defaultValue={locationCustomQuery}
                  placeholder="Custom location contains..."
                />
              </div>
            ) : null}
          </div>

          <div className="block lg:min-w-0 lg:shrink-0">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Framing
            </span>
            <div className="flex items-center gap-3 rounded border px-3 py-2 text-sm lg:whitespace-nowrap">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="showFramed"
                  value="1"
                  defaultChecked={showFramed}
                />
                Framed
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="showUnframed"
                  value="1"
                  defaultChecked={showUnframed}
                />
                Unframed
              </label>
            </div>
          </div>

          <div className="flex items-end gap-2 lg:ml-auto lg:shrink-0">
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white"
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
