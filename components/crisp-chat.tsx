"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
  useEffect(() => {
    const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID!;
    Crisp.configure(crispWebsiteId);
  }, []);

  return null;
};
