import { useEffect, useState } from "react";
import "./Profile.css";
import TopBar from "../components/TopBar";

type User = {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export default function Profile() {
  // ...existing logic...

  return (
    <>
      <TopBar />

      <main className="profile-page">
        {/* profile content */}
      </main>
    </>
  );
}
