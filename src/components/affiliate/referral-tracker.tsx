import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { captureReferralFromSearch } from "@/lib/referral";

/** Captures ?ref= from URL into localStorage/cookie for checkout attribution. */
export function ReferralTracker() {
  const location = useLocation();

  useEffect(() => {
    captureReferralFromSearch(location.searchStr || window.location.search);
  }, [location.searchStr]);

  return null;
}
