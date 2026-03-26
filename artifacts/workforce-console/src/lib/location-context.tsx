import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLocations, DEMO_MODE } from "./mock-adapter";
import type { MockLocation } from "./mock-data";

interface LocationContextType {
  locations: MockLocation[];
  selectedLocationId: string | null;
  selectedLocation: MockLocation | null;
  setLocationId: (id: string | null) => void;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  locations: [],
  selectedLocationId: null,
  selectedLocation: null,
  setLocationId: () => {},
  isLoading: false,
});

const STORAGE_KEY = "workforce_location";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000,
  });

  const setLocationId = (id: string | null) => {
    setSelectedLocationId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Auto-select first location on first load if none stored
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setLocationId(locations[0].id);
    }
  }, [locations]);

  const selectedLocation =
    locations.find((l) => l.id === selectedLocationId) ?? null;

  return (
    <LocationContext.Provider
      value={{ locations, selectedLocationId, selectedLocation, setLocationId, isLoading }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

export { DEMO_MODE };
