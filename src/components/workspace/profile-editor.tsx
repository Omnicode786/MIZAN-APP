"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function LawyerProfileEditor({ profile }: { profile: any }) {
  const router = useRouter();
  const [name, setName] = useState(profile.user.name || "");
  const [firmName, setFirmName] = useState(profile.firmName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [specialties, setSpecialties] = useState((profile.specialties || []).join(", "));
  const [yearsExperience, setYearsExperience] = useState(profile.yearsExperience || 0);
  const [hourlyRate, setHourlyRate] = useState(profile.hourlyRate || 0);
  const [fixedFeeFrom, setFixedFeeFrom] = useState(profile.fixedFeeFrom || 0);
  const [city, setCity] = useState(profile.city || "");
  const [isPublic, setIsPublic] = useState(Boolean(profile.isPublic));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/lawyer-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        firmName,
        bio,
        specialties: specialties.split(",").map((item: string) => item.trim()).filter(Boolean),
        yearsExperience: Number(yearsExperience || 0),
        hourlyRate: Number(hourlyRate || 0),
        fixedFeeFrom: Number(fixedFeeFrom || 0),
        city,
        isPublic
      })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-6 md:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Firm or practice name" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Specialties, comma separated" />
        <Input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value || 0))} placeholder="Years of experience" />
        <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value || 0))} placeholder="Hourly rate" />
        <Input type="number" value={fixedFeeFrom} onChange={(e) => setFixedFeeFrom(Number(e.target.value || 0))} placeholder="Starting fee" />
        <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Show in client lawyer search
        </label>
        <div className="md:col-span-2">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you handle, how do you work, and what kind of clients do you help?" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
