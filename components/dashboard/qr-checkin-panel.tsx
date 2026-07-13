"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export function QrCheckinPanel({
  tenantId,
  action,
}: {
  tenantId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [scanning, setScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [query, setQuery] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setScannerSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanning() {
    if (!window.BarcodeDetector) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length > 0) {
            setQuery(results[0].rawValue);
            stopScanning();
            formRef.current?.requestSubmit();
            return;
          }
        } catch {
          // Detection can throw transiently on odd frames; keep scanning.
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setScanning(false);
    }
  }

  function stopScanning() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  return (
    <div className="jg-card p-5">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Quick check-in</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Scan a member&apos;s digital membership card QR, or type their email, to check them into this event.
      </p>

      {scannerSupported ? (
        <div className="mt-3">
          {scanning ? (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full max-w-xs rounded-lg bg-black" muted playsInline />
              <Button type="button" variant="secondary" size="sm" onClick={stopScanning}>
                Cancel scan
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={startScanning}>
              <Camera className="h-4 w-4" />
              Scan with camera
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Camera scanning isn&apos;t supported in this browser — paste the code or type an email below.
        </p>
      )}

      <form ref={formRef} action={action} className="mt-3 flex flex-wrap gap-2">
        <TenantScopeHiddenFields tenantId={tenantId} />
        <Input
          name="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste code or type email"
          className="max-w-xs"
        />
        <Button type="submit" size="sm">
          Check in
        </Button>
      </form>
    </div>
  );
}
