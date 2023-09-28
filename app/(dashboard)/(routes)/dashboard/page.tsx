import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs/app-beta";

export default function Home() {
  return (
    <div className="">
      <p>Dashboard Page (Protected)</p>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
