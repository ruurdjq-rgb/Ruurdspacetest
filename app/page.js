"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TaskCard from "../components/TaskCard";

// Helper: datum van vandaag als 'YYYY-MM-DD' (zelfde formaat als een Postgres date)
function vandaagISO() {
  const d = new Date();
  const jaar = d.getFullYear();
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${jaar}-${maand}-${dag}`;
}

export default function Dashboard() {
  const [taken, setTaken] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState(null);

  const vandaag = vandaagISO();

  // Haal alle open follow-up taken op, inclusief gekoppelde leadgegevens.
  // Dit volgt de gevraagde query-logica:
  //   from follow_up_tasks t left join leads l on t.lead_id = l.id
  //   where t.status = 'open' order by t.due_date asc
  async function laadTaken() {
    setLaden(true);
    setFout(null);

    const { data, error } = await supabase
      .from("follow_up_tasks")
      .select(
        `
        id,
        lead_id,
        type,
        omschrijving,
        due_date,
        priority,
        status,
        owner,
        completed_at,
        leads (
          id,
          bedrijf,
          contactpersoon,
          email,
          telefoon,
          status
        )
      `
      )
      .eq("status", "open")
      .order("due_date", { ascending: true });

    if (error) {
      setFout(error.message);
      setTaken([]);
    } else {
      setTaken(data || []);
    }
    setLaden(false);
  }

  useEffect(() => {
    laadTaken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Splits in twee secties op basis van due_date t.o.v. vandaag.
  // Vandaag / Te laat: due_date <= vandaag  (oudste bovenaan -> al asc gesorteerd)
  // Later gepland:     due_date >  vandaag  (op due_date oplopend)
  const vandaagEnTeLaat = taken.filter((t) => t.due_date <= vandaag);
  const laterGepland = taken.filter((t) => t.due_date > vandaag);

  return (
    <main className="page">
      <h1>Sales Follow-up Dashboard</h1>
      <p className="subtitle">
        Open taken &middot; vandaag is {vandaag}
      </p>

      {fout && (
        <div className="error">
          Er ging iets mis bij het laden: {fout}
          <br />
          Controleer je .env.local en of de tabellen bestaan in Supabase.
        </div>
      )}

      {laden ? (
        <p>Laden...</p>
      ) : (
        <>
          {/* SECTIE 1: Vandaag / Te laat */}
          <h2 className="section-title">
            Vandaag / Te laat
            <span className="count-badge">{vandaagEnTeLaat.length}</span>
          </h2>
          {vandaagEnTeLaat.length === 0 ? (
            <p className="empty">Niks open voor vandaag. Lekker bezig.</p>
          ) : (
            vandaagEnTeLaat.map((taak) => (
              <TaskCard
                key={taak.id}
                taak={taak}
                vandaag={vandaag}
                onChanged={laadTaken}
              />
            ))
          )}

          {/* SECTIE 2: Later gepland */}
          <h2 className="section-title">
            Later gepland
            <span className="count-badge">{laterGepland.length}</span>
          </h2>
          {laterGepland.length === 0 ? (
            <p className="empty">Geen toekomstige follow-ups gepland.</p>
          ) : (
            laterGepland.map((taak) => (
              <TaskCard
                key={taak.id}
                taak={taak}
                vandaag={vandaag}
                onChanged={laadTaken}
              />
            ))
          )}
        </>
      )}
    </main>
  );
}
