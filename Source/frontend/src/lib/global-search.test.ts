import { describe, expect, test } from "vitest";
import {
  buildSnippet,
  matchesTokens,
  scoreEntry,
  searchEntries,
  tokenize,
  type SearchEntryKind,
  type SearchIndexEntry,
} from "./global-search";

function makeEntry(
  overrides: Partial<SearchIndexEntry> & { title: string; kind: SearchEntryKind },
): SearchIndexEntry {
  return {
    id: overrides.title,
    to: `/${overrides.kind}/${overrides.title}`,
    ...overrides,
  };
}

describe("tokenize", () => {
  test("lowercases, splits on punctuation and whitespace, drops empties", () => {
    expect(tokenize("  Weekly  Plan!! ")).toEqual(["weekly", "plan"]);
    expect(tokenize("road-map v2")).toEqual(["road", "map", "v2"]);
  });

  test("returns an empty array for a blank query", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("scoreEntry", () => {
  test("returns null when any token is absent from the entry", () => {
    const entry = makeEntry({ title: "Marketing plan", kind: "board" });
    expect(scoreEntry(entry, tokenize("marketing budget"))).toBeNull();
  });

  test("title prefix outranks a mid-word substring match", () => {
    const prefix = makeEntry({ title: "Plan of record", kind: "board" });
    const substring = makeEntry({ title: "Backup plan", kind: "board" });

    const prefixScore = scoreEntry(prefix, tokenize("plan"))!;
    const substringScore = scoreEntry(substring, tokenize("plan"))!;

    expect(prefixScore).toBeGreaterThan(substringScore);
  });

  test("a keyword-only match scores lower than a title match", () => {
    const titleHit = makeEntry({ title: "Q3 roadmap", kind: "project" });
    const keywordHit = makeEntry({
      title: "Untitled",
      kind: "project",
      keywords: "roadmap planning",
    });

    expect(scoreEntry(titleHit, tokenize("roadmap"))!).toBeGreaterThan(
      scoreEntry(keywordHit, tokenize("roadmap"))!,
    );
  });

  test("matches text found only in the body, ranked below a title hit", () => {
    const bodyHit = makeEntry({
      title: "Untitled note",
      kind: "note",
      body: "remember to email the vendor about the invoice",
    });
    const titleHit = makeEntry({ title: "Invoice", kind: "note" });

    const bodyScore = scoreEntry(bodyHit, tokenize("invoice"));
    expect(bodyScore).not.toBeNull();
    expect(scoreEntry(titleHit, tokenize("invoice"))!).toBeGreaterThan(bodyScore!);
  });
});

describe("buildSnippet", () => {
  const body =
    "The quarterly review covers revenue, churn, and the onboarding funnel for new teams.";

  test("centers the excerpt on the first matching token with ellipses", () => {
    const snippet = buildSnippet(body, tokenize("churn"), 40);
    expect(snippet).toContain("churn");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
  });

  test("falls back to a head slice when nothing matches", () => {
    const snippet = buildSnippet(body, tokenize("zzz"), 20);
    expect(snippet).toBe("The quarterly review…");
  });

  test("returns the whole string when it is short and unclipped", () => {
    expect(buildSnippet("short note", tokenize("note"), 140)).toBe("short note");
  });
});

describe("matchesTokens", () => {
  test("requires every token to be present", () => {
    expect(matchesTokens("Create new board", tokenize("new board"))).toBe(true);
    expect(matchesTokens("Create new board", tokenize("new notebook"))).toBe(false);
  });

  test("is false for an empty token list", () => {
    expect(matchesTokens("anything", [])).toBe(false);
  });
});

describe("searchEntries", () => {
  const entries: SearchIndexEntry[] = [
    makeEntry({ title: "Launch plan", kind: "board" }),
    makeEntry({ title: "Launch retro", kind: "board" }),
    makeEntry({ title: "Launch notebook", kind: "notebook" }),
    makeEntry({ title: "Launch party", kind: "event" }),
    makeEntry({ title: "Unrelated", kind: "project" }),
  ];

  test("groups matches by kind in GROUP_ORDER and reports totals", () => {
    const { groups, total } = searchEntries(entries, "launch");

    expect(total).toBe(4);
    expect(groups.map((g) => g.kind)).toEqual(["board", "notebook", "event"]);
    expect(groups[0].total).toBe(2);
  });

  test("caps each group at limitPerGroup but keeps the true total", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      makeEntry({ title: `Sprint ${i}`, kind: "board" }),
    );

    const { groups } = searchEntries(many, "sprint", { limitPerGroup: 3 });

    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(3);
    expect(groups[0].total).toBe(9);
  });

  test("kind filter restricts results to one group", () => {
    const { groups } = searchEntries(entries, "launch", { kind: "notebook" });

    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("notebook");
  });

  test("a blank query yields no groups", () => {
    expect(searchEntries(entries, "  ")).toEqual({ groups: [], total: 0 });
  });
});
