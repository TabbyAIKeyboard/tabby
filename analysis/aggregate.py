#!/usr/bin/env python3
"""Aggregate per-participant suggestion logs into the numbers reported in the paper.

Usage: python3 analysis/aggregate.py
Reads *-suggestion-log-*.csv from the parent directory; prints a LaTeX table body
and the summary statistics quoted in the Results section.
"""
import csv, glob, os, collections, statistics as st

ORDER = ["Rhea", "Daniel", "Iman", "Sofia", "Arjun"]        # P1..P5 in seed order
SHAPE = {"Rhea": "dense semantic", "Daniel": "broad episodic",
         "Iman": "procedural", "Sofia": "stylistic", "Arjun": "sparse"}

def load():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    out = {}
    for path in sorted(glob.glob(os.path.join(base, "*-suggestion-log-*.csv"))):
        name = os.path.basename(path).split("-")[0].capitalize()
        # drop trailing blank lines emitted by the exporter
        out[name] = [r for r in csv.DictReader(open(path)) if r.get("id")]
    return out

def stats(rows):
    n = len(rows)
    acc = [r for r in rows if r["outcome"] == "accepted"]
    ed  = [int(r["edit_distance"]) for r in acc if r["edit_distance"] != ""]
    ttd = [int(r["time_to_decision_ms"]) for r in rows if r["time_to_decision_ms"]]
    return dict(
        n=n,
        accepted=len(acc),
        acc_rate=len(acc) / n if n else 0.0,
        as_is=sum(1 for e in ed if e == 0),
        edited=sum(1 for e in ed if e > 0),
        med_edit=st.median([e for e in ed if e > 0]) if any(e > 0 for e in ed) else 0,
        dism_x=sum(1 for r in rows if r["outcome"] == "dismissed_explicit"),
        dism_i=sum(1 for r in rows if r["outcome"] == "dismissed_implicit"),
        med_ttd=st.median(ttd) if ttd else 0,
    )

def main():
    data = load()
    pooled = [r for rows in data.values() for r in rows]

    conds = collections.Counter(r["condition"] for r in pooled)
    print("conditions present:", dict(conds))
    assert set(conds) == {"kg_grounded"}, "baseline rows present - update the paper's framing"

    print("\n% --- LaTeX table body (Table 1) ---")
    for name in ORDER:
        s = stats(data[name])
        print(f"    {name} & {SHAPE[name]} & {s['n']} & {s['acc_rate']:.2f} & "
              f"{s['as_is']} & {s['edited']} & {s['med_ttd']/1000:.1f} \\\\")

    p = stats(pooled)
    print(f"\n    \\midrule\n    Pooled & --- & {p['n']} & {p['acc_rate']:.2f} & "
          f"{p['as_is']} & {p['edited']} & {p['med_ttd']/1000:.1f} \\\\")

    print("\n% --- summary quoted in prose ---")
    print(f"suggestions={p['n']}  accepted={p['accepted']}  acceptance={p['acc_rate']:.3f}")
    print(f"as_is={p['as_is']}  edited={p['edited']}  median_edit_distance_when_edited={p['med_edit']}")
    print(f"dismissed_explicit={p['dism_x']}  dismissed_implicit={p['dism_i']}")
    print(f"median_ttd_ms={p['med_ttd']:.0f}")

    # memory-type attribution: occurrences over shown vs accepted suggestions
    shown = collections.Counter(); acc = collections.Counter()
    for r in pooled:
        types = [t for t in r["memory_types"].split("|") if t]
        for t in types:
            shown[t] += 1
            if r["outcome"] == "accepted":
                acc[t] += 1
    print("\n% --- memory-type attribution ---")
    for t, c in shown.most_common():
        print(f"{t:11s} shown={c:3d}  accepted={acc[t]:3d}  rate={acc[t]/c:.2f}")

    per = [len([t for t in r['memory_types'].split('|') if t]) for r in pooled]
    print(f"\nmean memory types retrieved per suggestion: {st.mean(per):.2f}")

if __name__ == "__main__":
    main()
