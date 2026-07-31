"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function LawyerProfileEditor({ profile }: { profile: any }) {
  const router = useRouter();
  const [name, setName] = useState(profile.user.name || "");
  const [firmName, setFirmName] = useState(profile.firmName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [specialties, setSpecialties] = useState((profile.specialties || []).join(", "));
  const [languages, setLanguages] = useState((profile.languages || []).join(", "));
  const [jurisdictions, setJurisdictions] = useState((profile.jurisdictions || []).join(", "));
  const [consultationTypes, setConsultationTypes] = useState((profile.consultationTypes || []).join(", "));
  const [availability, setAvailability] = useState(profile.availability || "AVAILABLE");
  const [barRegistration, setBarRegistration] = useState(profile.barRegistration || "");
  const [yearsExperience, setYearsExperience] = useState(profile.yearsExperience || 0);
  const [hourlyRate, setHourlyRate] = useState(profile.hourlyRate || 0);
  const [fixedFeeFrom, setFixedFeeFrom] = useState(profile.fixedFeeFrom || 0);
  const [city, setCity] = useState(profile.city || "");
  const [isPublic, setIsPublic] = useState(Boolean(profile.isPublic));
  const [searchable, setSearchable] = useState(profile.searchable !== false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save() {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/lawyer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firmName,
          bio,
          specialties: splitCsv(specialties),
          languages: splitCsv(languages),
          jurisdictions: splitCsv(jurisdictions),
          consultationTypes: splitCsv(consultationTypes),
          availability,
          searchable,
          barRegistration,
          yearsExperience: Number(yearsExperience || 0),
          hourlyRate: Number(hourlyRate || 0),
          fixedFeeFrom: Number(fixedFeeFrom || 0),
          city,
          isPublic
        })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || "Unable to save profile.");

      setMessage({ type: "success", text: "Profile saved." });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save profile."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardContent className="grid gap-4 p-6 md:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Firm or practice name" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Specialties, comma separated" />
        <Input value={jurisdictions} onChange={(e) => setJurisdictions(e.target.value)} placeholder="Jurisdictions, comma separated" />
        <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Languages, comma separated" />
        <Input value={consultationTypes} onChange={(e) => setConsultationTypes(e.target.value)} placeholder="Consultation types, e.g. Online, In person" />
        <Input value={barRegistration} onChange={(e) => setBarRegistration(e.target.value)} placeholder="Bar registration or verification note" />
        <Input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value || 0))} placeholder="Years of experience" />
        <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value || 0))} placeholder="Hourly rate" />
        <Input type="number" value={fixedFeeFrom} onChange={(e) => setFixedFeeFrom(Number(e.target.value || 0))} placeholder="Starting fee" />
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
        >
          <option value="AVAILABLE">Available</option>
          <option value="LIMITED">Limited availability</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
        <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Show in client lawyer search
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
          <input type="checkbox" checked={searchable} onChange={(e) => setSearchable(e.target.checked)} />
          Allow AI lawyer recommendations to include my public profile
        </label>
        <div className="md:col-span-2">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you handle, how do you work, and what kind of clients do you help?" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
        </div>
        {message ? (
          <div
            className={`md:col-span-2 rounded-2xl border p-3 text-sm ${
              message.type === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
