import type { Metadata } from "next";
import { PeopleDirectory } from "@/components/console/people/people-directory";

export const metadata: Metadata = { title: "People & roles" };

export default function ConsolePeoplePage() {
  return <PeopleDirectory />;
}
