"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Beschikbare opties (komen overeen met de afspraken in de database)
const TASK_TYPES = [
  "bellen",
  "mailen",
  "offerte_reminder",
  "offerte_nabellen",
  "custom_followup",
  "anders",
];

const PRIORITIES = ["laag", "normaal", "hoog"];

export default function TaskCard({ taak, vandaag, onChanged }) {
  const lead = taak.leads || {};
  const [bezig, setBezig] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  // Velden voor het "nieuwe follow-up" formulier
  const [nieuweDue, setNieuweDue] = useState("");
  const [nieuwType, setNieuwType] = useState("bellen");
  const [nieuweOmschrijving, setNieuweOmschrijving] = useState("");
  const [nieuwePriority, setNieuwePriority] = useState("normaal");

  // Bepaal of de taak te laat / vandaag / toekomstig is (voor de kleur-rand)
  let klasse = "future";
  if (taak.due_date < vandaag) klasse = "overdue";
  else if (taak.due_date === vandaag) klasse = "today";

  // Actie 1: taak afvinken als gedaan
  async function markeerGedaan() {
    setBezig(true);
    const nu = new Date().toISOString();
    const { error } = await supabase
      .from("follow_up_tasks")
      .update({ status: "done", completed_at: nu, updated_at: nu })
      .eq("id", taak.id);

    setBezig(false);
    if (error) {
      alert("Kon taak niet afvinken: " + error.message);
      return;
    }
    onChanged(); // herlaad de lijst (de taak verdwijnt want hij is niet meer 'open')
  }

  // Actie 2: nieuwe follow-up plannen voor dezelfde lead
  async function planNieuweFollowUp(e) {
    e.preventDefault();
    if (!nieuweDue) {
      alert("Kies eerst een datum voor de nieuwe follow-up.");
      return;
    }

    setBezig(true);
    const { error } = await supabase.from("follow_up_tasks").insert({
      lead_id: taak.lead_id, // zelfde lead
      status: "open",
      owner: taak.owner, // bestaande owner overnemen
      priority: nieuwePriority || "normaal",
      due_date: nieuweDue,
      type: nieuwType,
      omschrijving: nieuweOmschrijving,
    });

    setBezig(false);
    if (error) {
      alert("Kon nieuwe follow-up niet aanmaken: " + error.message);
      return;
    }

    // Reset formulier en herlaad
    setPlanOpen(false);
    setNieuweDue("");
    setNieuwType("bellen");
    setNieuweOmschrijving("");
    setNieuwePriority("normaal");
    onChanged();
  }

  return (
    <div className={`task-card ${klasse}`}>
      <div className="task-top">
        <div>
          <div className="company">{lead.bedrijf || "Onbekend bedrijf"}</div>
          {lead.contactpersoon && (
            <div className="contact">{lead.contactpersoon}</div>
          )}
          <div className="contact-links">
            {lead.telefoon && <a href={`tel:${lead.telefoon}`}>{lead.telefoon}</a>}
            {lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}
          </div>
        </div>
      </div>

      {/* Meta-tags: type, due_date, priority, statussen, owner */}
      <div className="meta">
        <span className="tag">{taak.type}</span>
        <span
          className={`tag due ${klasse === "overdue" ? "due-overdue" : ""}`}
        >
          {klasse === "overdue" ? "Te laat: " : "Due: "}
          {taak.due_date}
        </span>
        <span className={`tag prio-${taak.priority}`}>
          prio: {taak.priority || "normaal"}
        </span>
        <span className="tag">taak: {taak.status}</span>
        {lead.status && <span className="tag">lead: {lead.status}</span>}
        {taak.owner && <span className="tag">owner: {taak.owner}</span>}
      </div>

      {taak.omschrijving && (
        <div className="omschrijving">{taak.omschrijving}</div>
      )}

      <div className="actions">
        <button className="btn-done" onClick={markeerGedaan} disabled={bezig}>
          Gedaan
        </button>
        <button
          className="btn-plan"
          onClick={() => setPlanOpen((v) => !v)}
          disabled={bezig}
        >
          {planOpen ? "Annuleren" : "Nieuwe follow-up plannen"}
        </button>
      </div>

      {/* Inline formulier voor een nieuwe follow-up op dezelfde lead */}
      {planOpen && (
        <form className="plan-form" onSubmit={planNieuweFollowUp}>
          <label>
            Nieuwe datum
            <input
              type="date"
              value={nieuweDue}
              onChange={(e) => setNieuweDue(e.target.value)}
              required
            />
          </label>

          <label>
            Type
            <select
              value={nieuwType}
              onChange={(e) => setNieuwType(e.target.value)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={nieuwePriority}
              onChange={(e) => setNieuwePriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="full">
            Omschrijving
            <textarea
              rows={2}
              value={nieuweOmschrijving}
              onChange={(e) => setNieuweOmschrijving(e.target.value)}
              placeholder="Bijv. nabellen over offerte"
            />
          </label>

          <div className="full">
            <button type="submit" className="btn-done" disabled={bezig}>
              Opslaan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
