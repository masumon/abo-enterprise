import { fillEnglish, mergeLists, parseFaq, parseLines, templateLists, type DetailLists } from "@/lib/serviceDetailKit";

const empty: DetailLists = { process_steps: [], benefits: [], requirements: [], required_documents: [], faq: [] };

describe("serviceDetailKit", () => {
  it("parses pasted lines and FAQ pairs", () => {
    expect(parseLines("• দ্রুত\n2. সস্তা\n\n- ভালো")).toEqual(["দ্রুত", "সস্তা", "ভালো"]);
    expect(parseFaq("কত সময়?\nএকই দিনে।\nQ: Price\nA: Low")).toEqual([{ q: "কত সময়?", a: "একই দিনে।" }, { q: "Price", a: "Low" }]);
  });

  it("merges without duplicates and renumbers steps", () => {
    const t = templateLists("printing");
    const once = mergeLists(empty, t);
    const twice = mergeLists(once, t);
    expect(twice.benefits.length).toBe(once.benefits.length);
    expect(twice.process_steps.map((s) => s.step)).toEqual(once.process_steps.map((_, i) => i + 1));
  });

  it("fills only blank English from Bangla", async () => {
    const lists: DetailLists = { ...empty, benefits: [{ bn: "দ্রুত", en: "" }, { bn: "সস্তা", en: "Cheap" }], faq: [{ question: "", question_bn: "প্রশ্ন", answer: "", answer_bn: "উত্তর" }] };
    const out = await fillEnglish(lists, async (b) => `EN:${b}`);
    expect(out.benefits).toEqual([{ bn: "দ্রুত", en: "EN:দ্রুত" }, { bn: "সস্তা", en: "Cheap" }]);
    expect(out.faq[0].question).toBe("EN:প্রশ্ন");
    expect(out.faq[0].answer).toBe("EN:উত্তর");
  });
});
