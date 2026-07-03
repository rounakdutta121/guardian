"use client";

import { useEffect, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useLocationStore } from "@/stores";
import { reverseGeocode } from "@/lib/location/helpers";
import { communicationPermissions } from "@/lib/communication";

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

  const watchIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyPosition = (lat: number, lng: number, acc: number | null) => {
      if (cancelled) return;
      setLocation(lat, lng, acc ?? undefined);
      setLoading(false);
      reverseGeocode(lat, lng).then((addr) => {
        if (!cancelled && addr) setAddress(addr);
      });
    };

    const startNative = async () => {
      setLoading(true);
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location !== "granted") {
          const requested = await Geolocation.requestPermissions({
            permissions: ["location", "coarseLocation"],
          });
          if (requested.location !== "granted") {
            setError("Location permission denied");
            setLoading(false);
            return;
          }
        }

        if (watch) {
          watchIdRef.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (pos, err) => {
              if (err) {
                setError(err.message);
                setLoading(false);
                return;
              }
              if (pos) {
                applyPosition(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  pos.coords.accuracy
                );
              }
            }
          );
        } else {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
          });
          applyPosition(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Location failed");
          setLoading(false);
        }
      }
    };

    const startBrowser = () => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported");
        return;
      }

      setLoading(true);
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      };

      const onSuccess = (position: GeolocationPosition) => {
        applyPosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      };

      const onError = (err: GeolocationPositionError) => {
        setError(err.message);
        setLoading(false);
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
    };

    if (Capacitor.isNativePlatform()) {
      void startNative();
    } else {
      startBrowser();
    }

    return () => {
      cancelled = true;
      if (watchIdRef.current) {
        void Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
    };
  }, [watch, setLocation, setAddress, setLoading, setError]);

  return { latitude, longitude, accuracy, address, isLoading, error };
}
