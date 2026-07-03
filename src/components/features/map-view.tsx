"use client";

interface MapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  className?: string;
  zoom?: number;
}

export function MapView({
  latitude,
  longitude,
  destinationLat,
  destinationLng,
  className = "h-48 w-full rounded-2xl",
  zoom = 15,
}: MapViewProps) {
  if (!latitude || !longitude) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted text-sm text-muted-foreground`}
      >
        Waiting for location...
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  let src: string;

  if (apiKey) {
    const markers = [`color:red%7C${latitude},${longitude}`];
    if (destinationLat && destinationLng) {
      markers.push(`color:green%7C${destinationLat},${destinationLng}`);
    }
    src = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${latitude},${longitude}&zoom=${zoom}`;
    if (destinationLat && destinationLng) {
      src = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${latitude},${longitude}&destination=${destinationLat},${destinationLng}&mode=walking`;
    }
  } else {
    src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
  }

  return (
    <iframe
      title="Map"
      src={src}
      className={`${className} border-0`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
