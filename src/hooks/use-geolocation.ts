"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/stores";
import { reverseGeocode } from "@/lib/location/helpers";

export function useGeolocation(watch = false) {
  const {
    latitude,
    longitude,
    accuracy,
    address,
    isLoading,
    error,
    setLocation,
    setAddress,
    setLoading,
    setError,
  } = useLocationStore();

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    setLoading(true);

    const onSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocation(lat, lng, position.coords.accuracy);
      setLoading(false);
      reverseGeocode(lat, lng).then((addr) => {
        if (addr) setAddress(addr);
      });
    };

    const onError = (err: GeolocationPositionError) => {
      setError(err.message);
      setLoading(false);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    if (watch) {
      const id = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        options
      );
      return () => navigator.geolocation.clearWatch(id);
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [watch, setLocation, setAddress, setLoading, setError]);

  return { latitude, longitude, accuracy, address, isLoading, error };
}
