import { useMemo, useRef, useState } from "react";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTJkvB_UKRhc9TY5CuSY98gtGJJa2SpQSFBWZ-XXz_nvy7KZO_xz9ighfBXB-FUPk30g/exec";

// Your checklist steps (we’ll replace with the real ones later)
const STEPS = [
  { id: "BOM", name: "Correct parts supplied (BOM)" },
  { id: "T1", name: "Tube cut length T1 within spec" },
  { id: "T2", name: "Tube cut length T2 within spec" },
  { id: "PHASE", name: "Phase angle within spec" },
  { id: "WELD_VIS", name: "Weld visual OK" },
  { id: "TORQUE", name: "Torque test OK" },
];

function normalizeWO(raw) {
  return String(raw || "").trim();
}

export default function App() {
  const [screen, setScreen] = useState("start"); // start | wizard | review | done
  const [operator, setOperator] = useState("");
  const [woInput, setWoInput] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const woRef = useRef(null);

  const [stepIndex, setStepIndex] = useState(0);

  // For each step: which WOs PASS + optional comment
  const [answers, setAnswers] = useState(() =>
    STEPS.map((s) => ({
      stepId: s.id,
      stepName: s.name,
      selectedWOs: [], // WOs that satisfy the step
      comment: "",
    }))
  );

  const currentStep = STEPS[stepIndex];
  const canStart = operator.trim().length > 0 && workOrders.length > 0;

  // ----- Work order scanning -----
  function addWorkOrder(raw) {
    const wo = normalizeWO(raw);
    if (!wo) return;
    setWorkOrders((prev) => (prev.includes(wo) ? prev : [...prev, wo]));
  }

  function onWOKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addWorkOrder(woInput);
      setWoInput("");
    }
  }

  function removeWO(wo) {
    setWorkOrders((prev) => prev.filter((x) => x !== wo));

    // Also remove it from any step selections
    setAnswers((prev) =>
      prev.map((a) => ({
        ...a,
        selectedWOs: a.selectedWOs.filter((x) => x !== wo),
      }))
    );
  }

  // ----- Step selection logic -----
  const selectedWOs = answers[stepIndex]?.selectedWOs ?? [];

  const allSelected = useMemo(() => {
    if (workOrders.length === 0) return false;
    return workOrders.every((wo) => selectedWOs.includes(wo));
  }, [workOrders, selectedWOs]);

  const noneSelected = selectedWOs.length === 0;

  function toggleWO(wo) {
    setAnswers((prev) =>
      prev.map((a, i) => {
        if (i !== stepIndex) return a;
        const has = a.selectedWOs.includes(wo);
        return { ...a, selectedWOs: has ? a.selectedWOs.filter((x) => x !== wo) : [...a.selectedWOs, wo] };
      })
    );
  }

  function setSelectAll(checked) {
    setAnswers((prev) =>
      prev.map((a, i) => {
        if (i !== stepIndex) return a;
        return { ...a, selectedWOs: checked ? [...workOrders] : [] };
      })
    );
  }

  function setComment(comment) {
    setAnswers((prev) => prev.map((a, i) => (i === stepIndex ? { ...a, comment } : a)));
  }

  // ----- Navigation -----
  function next() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else setScreen("review");
  }

  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
    else setScreen("start");
  }

async function submitReal() {
  try {
    const payload = {
      operator: operator.trim(),
      workOrders,
      answers, // includes selectedWOs + comment per step
    };

const res = await fetch(APPS_SCRIPT_URL, {
  method: "POST",
  // ✅ Use a “simple” content-type to avoid CORS preflight
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify(payload),
});


    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) {
      throw new Error(data.error || `Submit failed (HTTP ${res.status})`);
    }

    alert(`Submitted! Sheets created: ${data.sheetsCreated?.length || 0}`);
    setScreen("done");
  } catch (err) {
    alert("Submit failed: " + err);
  }
}


  // Optional: auto-select all WOs for every step when starting (common in batch checks)
  function startChecklist() {
    // default all selected for each step (operator unchecks exceptions)
    setAnswers(STEPS.map((s) => ({
      stepId: s.id,
      stepName: s.name,
      selectedWOs: [...workOrders],
      comment: "",
    })));
    setStepIndex(0);
    setScreen("wizard");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Steershaft Checklist</h1>

        {screen === "start" && (
          <>
            <div style={styles.row}>
              <label style={styles.label}>Operator Name</label>
              <input
                style={styles.input}
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Type name"
              />
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Scan Work Orders (multiple)</label>
              <input
                ref={woRef}
                style={styles.inputBig}
                value={woInput}
                onChange={(e) => setWoInput(e.target.value)}
                onKeyDown={onWOKeyDown}
                placeholder="Scan and press Enter"
              />
              <div style={styles.hint}>Scanner usually types + presses Enter automatically.</div>
            </div>

            <div style={styles.woList}>
              {workOrders.map((wo) => (
                <div key={wo} style={styles.woChip}>
                  <span style={{ fontWeight: 800 }}>{wo}</span>
                  <button style={styles.removeBtn} onClick={() => removeWO(wo)}>✕</button>
                </div>
              ))}
              {workOrders.length === 0 && <div style={styles.muted}>No work orders scanned yet.</div>}
            </div>

            <div style={styles.actions}>
              <button
                style={{ ...styles.btn, ...(canStart ? {} : styles.btnDisabled) }}
                disabled={!canStart}
                onClick={startChecklist}
              >
                Start Checklist
              </button>
            </div>
          </>
        )}

        {screen === "wizard" && (
          <>
            <div style={styles.badgeRow}>
              <div style={styles.badge}>Step {stepIndex + 1} / {STEPS.length}</div>
              <div style={styles.badge}>WO Count: {workOrders.length}</div>
              <div style={styles.badge}>Selected: {selectedWOs.length}/{workOrders.length}</div>
            </div>

            <h2 style={styles.h2}>{currentStep.name}</h2>

            {/* Select all */}
            <label style={styles.selectAllRow}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => setSelectAll(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={{ fontWeight: 900 }}>Select all work orders</span>
            </label>

            {/* Work order list */}
            <div style={styles.woPickList}>
              {workOrders.map((wo) => {
                const checked = selectedWOs.includes(wo);
                return (
                  <label key={wo} style={styles.woPickRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWO(wo)}
                      style={styles.checkbox}
                    />
                    <span style={{ fontWeight: 800 }}>{wo}</span>
                    {!checked ? <span style={styles.failTag}>NOT SELECTED</span> : null}
                  </label>
                );
              })}
            </div>

            {noneSelected && (
              <div style={styles.warning}>
                ⚠️ None selected. That means all WOs fail this step (is that intended?).
              </div>
            )}

            <div style={styles.row}>
              <label style={styles.label}>Comment (optional)</label>
              <input
                style={styles.input}
                value={answers[stepIndex].comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Notes for this step..."
              />
            </div>

            <div style={styles.actionsBetween}>
              <button style={styles.btnSecondary} onClick={back}>Back</button>
              <button style={styles.btn} onClick={next}>
                {stepIndex === STEPS.length - 1 ? "Review" : "Next"}
              </button>
            </div>
          </>
        )}

        {screen === "review" && (
          <>
            <h2 style={styles.h2}>Review</h2>
            <div style={styles.muted}><b>Operator:</b> {operator}</div>
            <div style={styles.muted}><b>Work Orders:</b> {workOrders.join(", ")}</div>

            <div style={{ marginTop: 12 }}>
              {answers.map((a) => {
                const passCount = a.selectedWOs.length;
                const failCount = workOrders.length - passCount;
                return (
                  <div key={a.stepId} style={styles.reviewRow}>
                    <div style={{ fontWeight: 900 }}>{a.stepName}</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={styles.badgeSmall}>PASS: {passCount}</span>
                      <span style={{ ...styles.badgeSmall, marginLeft: 8 }}>FAIL: {failCount}</span>
                      {a.comment ? <div style={{ ...styles.muted, marginTop: 6 }}>{a.comment}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.actionsBetween}>
              <button style={styles.btnSecondary} onClick={() => setScreen("wizard")}>Back</button>
              <button style={styles.btn} onClick={submitReal}>Submit</button>
            </div>
          </>
        )}

        {screen === "done" && (
          <>
            <h2 style={styles.h2}>Done ✅</h2>
            <div style={styles.muted}>
              Next: connect submit to Google Sheets and generate one filled sheet per WO.
            </div>

            <div style={styles.actions}>
              <button
                style={styles.btn}
                onClick={() => {
                  setOperator("");
                  setWoInput("");
                  setWorkOrders([]);
                  setAnswers(STEPS.map((s) => ({ stepId: s.id, stepName: s.name, selectedWOs: [], comment: "" })));
                  setStepIndex(0);
                  setScreen("start");
                  setTimeout(() => woRef.current?.focus(), 50);
                }}
              >
                Start New
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0b1220", padding: 16, display: "flex", justifyContent: "stretch", alignItems: "stretch", fontFamily: "system-ui" },
  card: { width: "100%", maxwidth:"none",minHeight: "calc(100vh - 32px)", background: "#111827", color: "#e5e7eb", borderRadius: 16, padding: 18, boxShadow: "0 12px 28px rgba(0,0,0,0.35)" },
  h1: { margin: 0, fontSize: 26 },
  h2: { marginTop: 14, marginBottom: 10, fontSize: 22 },
  row: { marginTop: 14 },
  label: { display: "block", marginBottom: 8, color: "#cbd5e1", fontWeight: 900 },
  input: { width: "100%", padding: "14px 14px", borderRadius: 12, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb", fontSize: 16 },
  inputBig: { width: "100%", padding: "18px 16px", borderRadius: 14, border: "2px solid #334155", background: "#0b1220", color: "#e5e7eb", fontSize: 20, fontWeight: 900 },
  hint: { marginTop: 8, color: "#94a3b8" },
  woList: { marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 },
  woChip: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 999, background: "#0b1220", border: "1px solid #334155" },
  removeBtn: { border: "none", background: "#334155", color: "white", width: 32, height: 32, borderRadius: 999, fontSize: 16, cursor: "pointer" },
  actions: { marginTop: 18, display: "flex", justifyContent: "flex-end" },
  actionsBetween: { marginTop: 18, display: "flex", justifyContent: "space-between", gap: 10 },
  btn: { background: "#22c55e", color: "#052e16", border: "none", borderRadius: 14, padding: "16px 18px", fontSize: 18, fontWeight: 900, cursor: "pointer" },
  btnSecondary: { background: "#1f2937", color: "#e5e7eb", border: "1px solid #334155", borderRadius: 14, padding: "16px 18px", fontSize: 18, fontWeight: 900, cursor: "pointer" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  badgeRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 },
  badge: { background: "#0b1220", border: "1px solid #334155", borderRadius: 999, padding: "8px 12px", fontWeight: 900, color: "#cbd5e1" },
  badgeSmall: { background: "#0b1220", border: "1px solid #334155", borderRadius: 999, padding: "4px 10px", fontWeight: 900, color: "#cbd5e1" },
  muted: { color: "#94a3b8" },
  reviewRow: { marginTop: 10, padding: 12, borderRadius: 14, background: "#0b1220", border: "1px solid #334155" },
  woPickList: { marginTop: 10, display: "grid", gap: 10 },
  woPickRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    background: "#0b1220",
    border: "1px solid #334155",
    cursor: "pointer"
  },
  checkbox: { width: 22, height: 22 },
  selectAllRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    background: "#0b1220",
    border: "1px solid #334155",
    cursor: "pointer",
    marginTop: 6
  },
  failTag: {
    marginLeft: "auto",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #334155",
    color: "#cbd5e1",
    fontWeight: 900,
    fontSize: 12
  },
  warning: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #7c2d12",
    background: "#1f2937",
    color: "#fde68a",
    fontWeight: 800
  }
};
