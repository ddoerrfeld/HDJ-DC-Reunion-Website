export interface FaqItem {
  question: string;
  answerMd: string;
}

/**
 * The organizer writes the FAQ as one text: each question on its own line
 * starting with "##", the answer underneath. Text before the first question
 * becomes an introduction.
 */
export function parseFaq(md: string | null): { intro: string; items: FaqItem[] } {
  const items: FaqItem[] = [];
  const intro: string[] = [];
  let current: FaqItem | null = null;
  for (const line of (md ?? "").split(/\r?\n/)) {
    const q = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (q) {
      current = { question: q[1], answerMd: "" };
      items.push(current);
    } else if (current) current.answerMd += `${line}\n`;
    else intro.push(line);
  }
  return { intro: intro.join("\n").trim(), items: items.map((i) => ({ ...i, answerMd: i.answerMd.trim() })) };
}
