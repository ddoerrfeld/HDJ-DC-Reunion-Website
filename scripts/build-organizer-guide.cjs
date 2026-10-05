/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the app */
// Builds docs/Class77-Organizer-Guide.docx (house style: Cambria headings, Calibri body, US Letter).
// Not part of the site build: run from a folder with `npm i docx@9`, then `node build-organizer-guide.cjs out.docx`;
// convert to PDF with LibreOffice (`soffice --headless --convert-to pdf out.docx`).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, LevelFormat, Header, Footer, PageNumber, PageBreak, TabStopType,
} = require("docx");

// House style: Cambria headings, Calibri body, navy headings, gold rules (school colors).
const NAVY = "14336B";
const BLUE = "1F4E9E";
const GOLD = "E8A317";
const BROWN = "4A2C12";
const INK = "1E1B16";
const MUTED = "5C554A";
const TINT = "F7F1E3";
const BODY = "Calibri";
const HEAD = "Cambria";
const W = 9360; // content width (8.5in − 2 × 1in)

const run = (text, o = {}) => new TextRun({ text, font: BODY, size: 22, color: INK, ...o });
function rich(parts) {
  // "**bold**" segments inside a string
  return parts.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) => (t.startsWith("**") ? run(t.slice(2, -2), { bold: true }) : run(t)));
}
const p = (text, o = {}) => new Paragraph({ spacing: { after: 140, line: 288 }, ...o, children: typeof text === "string" ? rich(text) : text });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const bullet = (text) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 276 }, children: rich(text) });
let stepList = 0;
function steps(items) {
  const ref = `steps${stepList++}`;
  numberingConfigs.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } }, run: { font: BODY, bold: true, color: NAVY } } }] });
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 }, children: rich(t) }));
}
// Tip / caution boxes: shaded paragraph with a colored left border.
function box(label, text, color = GOLD) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color, space: 8 } },
    indent: { left: 160, right: 160 },
    spacing: { before: 120, after: 180, line: 288 },
    children: [run(`${label}  `, { bold: true, color: color === GOLD ? BROWN : color }), ...rich(text)],
  });
}
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D9CFB8" };
function table(headers, rows, widths) {
  const mk = (text, header, w) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: NAVY } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
      children: [new Paragraph({ spacing: { after: 0, line: 264 }, children: header ? [run(text, { bold: true, color: "FFFFFF", size: 20 })] : rich(text).map((r) => r) })],
    });
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      ...(headers ? [new TableRow({ tableHeader: true, children: headers.map((h, i) => mk(h, true, widths[i])) })] : []),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => mk(c, false, widths[i])) })),
    ],
  });
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const numberingConfigs = [
  { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 270 } }, run: { color: GOLD } } }] },
];

// ----------------------------------------------------------------- content
const content = [];
const add = (...xs) => content.push(...xs.flat());

// Cover
add(
  new Paragraph({ spacing: { before: 2400, after: 120 }, children: [run("CLASS OF ’77 · 50-YEAR REUNION", { font: HEAD, size: 24, color: NAVY, characterSpacing: 40 })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 12 } }, spacing: { after: 360 }, children: [run("Organizer Guide", { font: HEAD, size: 72, bold: true, color: INK })] }),
  p([run("How to run the reunion website: RSVPs, events, the classmate list, downloads, and launch day.", { size: 28, color: MUTED })], { spacing: { after: 600 } }),
  table(
    null,
    [
      ["**Website**", "crownjacobs77.com"],
      ["**Organizer pages**", "crownjacobs77.com/admin"],
      ["**Reunion**", "Friday, October 8 – Sunday, October 10, 2027"],
      ["**Schools**", "Irving Crown High School and Harry D. Jacobs High School"],
      ["**Organizer email**", "reunion@crownjacobs77.com (forwards to the organizer)"],
      ["**Guide version**", "October 2026 — written for the preview (passcode) stage and launch"],
    ],
    [2600, 6760],
  ),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [run("Contents", { font: HEAD, size: 36, bold: true, color: NAVY })] }),
  ...[
    "1. The website at a glance",
    "2. Signing in",
    "3. The dashboard",
    "4. Managing RSVPs",
    "5. The classmate check and the classmate list",
    "6. Editing events, times and places",
    "7. Site text, hotels and optional pages",
    "8. Downloading lists",
    "9. Keeping an eye on the website",
    "10. Launch day",
  ].map((t) => new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "D9CFB8", space: 4 } }, children: [run(t, { size: 24 })] })),
);

// 1. At a glance
add(
  h1("1. The website at a glance"),
  p("The site has two sides. The **public site** is what classmates see: the weekend schedule, hotels, the RSVP form, Who’s Coming and the two 1977 yearbooks. The **organizer pages** (Admin) are where you run everything: no code and no developer needed for day-to-day changes."),
  table(
    ["Public page", "What classmates do there"],
    [
      ["Home", "See the countdown, the weekend at a glance and recent classmate photos."],
      ["Weekend", "Read each event’s time, place, price and description; add events to their calendar."],
      ["Stay", "Find hotels, group codes and booking deadlines."],
      ["RSVP", "Sign up once, choose events and guests, add a photo, and pick their senior portrait (“See Me in ’77”)."],
      ["Who’s Coming", "Browse classmates who RSVP’d, by school and by event; flip to their ’77 portrait."],
      ["Yearbooks", "Leaf through the Crown and Jacobs yearbooks page by page, zoom in, and search names."],
      ["Info, In Memoriam", "Optional pages that appear only when you turn them on in Settings."],
    ],
    [2400, 6960],
  ),
  gap(),
  h2("Privacy, in one paragraph"),
  p("Email addresses, phone numbers and hometowns are never shown on the public site. Who’s Coming lists only names, photos, school and chosen events, and only for people who left “show me on Who’s Coming” ticked. After launch, the yearbooks and Who’s Coming are for confirmed classmates only (see section 5). Downloads from the organizer pages do include contact details, so keep them within the organizing team."),
  h2("No online payments"),
  p("The site does not take payments. Paid events show their price and a “payment details coming soon” note. When someone pays you, mark them as paid in the organizer pages (section 4); the dashboard keeps the totals."),
);

// 2. Signing in
add(
  h1("2. Signing in"),
  p("There is no password. You sign in with a one-time link sent to your email."),
  ...steps([
    "Go to **crownjacobs77.com/admin**.",
    "Enter your email address and press **Email me a sign-in link**.",
    "Open the email “Your sign-in link” and press **Sign in to admin**. The link works once and expires after 15 minutes.",
    "On the page that opens, press **Sign in**. You stay signed in on that device for 7 days.",
  ]),
  box("Why the extra button?", "Some email services open links automatically to scan them. The final “Sign in” press makes sure only you use the link."),
  h2("Adding another organizer"),
  ...steps(["Go to **Settings** → **Organizers who can sign in**.", "Enter their email and press **Add**. They can now sign in the same way.", "To remove someone, press **Remove** next to their address; they are signed out everywhere immediately."]),
  box("If the email doesn’t arrive", "Check the spam or promotions folder, and make sure you typed the address that is on the organizer list. The page shows the same message for every address, on purpose, so strangers can’t find out who the organizers are."),
);

// 3. Dashboard
add(
  h1("3. The dashboard"),
  p("The first page after signing in. Everything updates live as classmates RSVP."),
  table(
    ["Section", "What it tells you"],
    [
      ["RSVPs need your check", "Classmates whose names didn’t match the yearbook list. Click a name to review (section 5)."],
      ["Classmates", "Total RSVPs, guests, and the split by school; how many are listed on Who’s Coming and have photos."],
      ["By event", "For every event: classmates signed up, headcount including guests, capacity, and waitlist."],
      ["Halftime walkers", "For each football game: how many will walk onto the field at halftime."],
      ["Payments", "For paid events: how many have paid, how many haven’t (click the number to see who), money collected and expected."],
      ["Site health", "Whether the website has recorded any problems in the last 7 days (section 9)."],
    ],
    [2600, 6760],
  ),
);

// 4. RSVPs
add(
  h1("4. Managing RSVPs"),
  p("**RSVPs** lists everyone who has signed up. Search by any name (high-school or current last name, nickname), email, phone or city, or filter by school and event."),
  h2("What you can do on a person’s page"),
  table(
    ["Task", "How"],
    [
      ["Confirm a classmate", "Under Classmate check, press **Yes, this is a classmate**. They are emailed that the yearbooks are open to them."],
      ["Mark a payment", "Under the paid event, press **Mark as paid** (or **Mark as not paid** to undo). The date is recorded."],
      ["Give a waitlisted person a spot", "Press **Give them a spot**. Use **Move to waitlist** for the reverse."],
      ["Change the halftime answer", "Press **Change halftime walk to Yes/No**."],
      ["Take them off one event", "Press **Remove from this event…** and confirm."],
      ["Fix their details", "Edit name, nickname, email, phone, city, school or the Who’s Coming listing under **Details**, then **Save details**."],
      ["Send them their private link again", "Press **Email them a new link**. Their old link stops working."],
      ["Hide an unsuitable photo", "Press **Hide photo**. The site shows the school monogram instead; **Show photo again** undoes it."],
      ["Clear a wrong ’77 portrait", "Press **Clear ’77 portrait**. They can choose again from their link."],
      ["Delete the RSVP", "Open **Delete this RSVP…**, type DELETE and confirm. This cannot be undone."],
    ],
    [3000, 6360],
  ),
  gap(),
  box("Guests and new events", "Classmates change their own guests and events through the private link in their confirmation email. If someone has lost it, use **Email them a new link**, or they can use “Lost your link?” on the RSVP page."),
  h2("After the RSVP deadline"),
  p("Once the deadline set in Settings passes, the RSVP form closes. People can still update their details and free events with their link; sign-ups for paid events are frozen. You can still change anything from the organizer pages."),
);

// 5. Classmate list
add(
  h1("5. The classmate check and the classmate list"),
  p("To keep strangers out of the yearbooks and Who’s Coming, every RSVP is checked against the list of senior names read from the two 1977 yearbooks (**Classmates** in the menu: about 450 names)."),
  table(
    ["The RSVP name…", "Result"],
    [
      ["Matches a name on the list", "Confirmed instantly. They appear on Who’s Coming and can open the yearbooks."],
      ["Same last name and same first initial (Cathy for Catherine)", "Confirmed instantly."],
      ["Last name off by a letter or two (a misread yearbook name) with a matching first name", "Confirmed instantly."],
      ["No match", "RSVP is saved and their spot is held, but they wait for your check. You get an email and they appear on the dashboard."],
    ],
    [4200, 5160],
  ),
  gap(),
  h2("When someone is waiting for your check"),
  ...steps([
    "Open **Classmates**. People waiting are listed at the top, each with similar names from the list.",
    "If their name is on the list but misspelled (for example “Doerfield” for “Doerrfeld”), click the similar name, correct the spelling and press **Save**. Everyone waiting is checked again automatically, and anyone who now matches is confirmed and emailed.",
    "If they weren’t photographed for the yearbook, add them with **Add a name**, or simply confirm them on their RSVP page.",
    "If they are not a classmate, do nothing. Their RSVP stays saved but they won’t be listed or see the yearbooks.",
  ]),
  box("Worth doing early", "The names were read from the yearbook pages by computer, so some will be misspelled. Skimming the list by letter (A–Z buttons) and fixing obvious errors saves you checks later."),
);

// 6. Events
add(
  h1("6. Editing events, times and places"),
  p("**Events** lists the weekend by day. Click an event to change anything about it. Changes appear on the Weekend page, the home page, the RSVP form and calendar downloads within a minute."),
  table(
    ["Field", "What it does"],
    [
      ["Title, day, starts, ends", "Times are Chicago time. Leave times blank to show “Time & place coming soon”."],
      ["Description", "Plain text. A blank line starts a new paragraph; **double asterisks** make text bold."],
      ["Confirmed / wording while not confirmed", "Untick Confirmed to show a “to be confirmed” tag; optionally write your own wording."],
      ["Place, address, address confirmed", "The map link appears only when the address is marked confirmed."],
      ["Venue website", "Adds a “website” button for out-of-town guests."],
      ["Requires payment, price", "Shows the price and adds the event to the payment report and dashboard."],
      ["Capacity", "People including guests. When full, new sign-ups join a waitlist. Blank means no limit."],
      ["Guests may come; halftime question", "Controls the guest choice and the “walk at halftime” question on the RSVP form."],
      ["Time-slot group", "Events with the same group happen at the same time; classmates pick one."],
      ["Show on the site", "Untick to hide an event without losing its sign-ups."],
    ],
    [3200, 6160],
  ),
  gap(),
  p("Use the arrow buttons on the Events list to change the order within a day, and **Add an event** for something new. An event can only be deleted if nobody has signed up; otherwise hide it."),
  box("Example", "To set the dinner price: Events → Reunion Dinner → type 85 in “Price per person” → Save changes."),
);

// 7. Site text & pages
add(
  h1("7. Site text, hotels and optional pages"),
  h2("Site text"),
  p("**Site text** holds about 30 headings and paragraphs from around the site: the home page headline and sections, the Weekend introduction, RSVP wording and the halftime question, page introductions, the footer and the dates. Edit a box and press **Save site text**. Changed boxes are marked, with the original shown underneath; empty a box and save to restore the original."),
  p("There is also an optional **extra note for every confirmation email**, useful later for parking, dress code or payment instructions."),
  h2("Stay (hotels)"),
  p("**Stay** lists the hotels. Mark one as the **official reunion room block** to put it first and show its group code and book-by date; it then also appears on the home page. A photo up to 4 MB can be added."),
  h2("Info page (questions & answers)"),
  p("In **Settings**, tick **Info page** and write the questions and answers in one box. Start each question on its own line with ## and put the answer underneath, for example:"),
  p([run("## Is there parking?", { font: "Consolas", size: 20 })], { spacing: { after: 0 } }),
  p([run("Yes — free parking at every venue.", { font: "Consolas", size: 20 })]),
  p("The refund policy (also in Settings) is shown at the end of the Info page."),
  h2("In Memoriam"),
  p("Add names under **In Memoriam** (name, school, years, a few words and an optional photo), then tick **In Memoriam page** in Settings when the list is ready. Names are shown alphabetically. Only organizers can add names."),
  h2("Yearbooks"),
  p("**Yearbooks** lets you label pages (for example the printed page number), hide blank pages, and set where the senior portraits start and end for the “Jump to seniors” button."),
);

// 8. Downloads
add(
  h1("8. Downloading lists"),
  p("**Exports** downloads spreadsheets that open in Excel, Numbers or Google Sheets. They include private contact details: keep them within the organizing team."),
  table(
    ["Download", "Use it for"],
    [
      ["Everyone who RSVP’d", "Group emails and the master list: names, contact details, events and guests."],
      ["Payment report", "Who owes what for each paid event, and who has paid."],
      ["Halftime walkers", "The list to give each school, sorted by high-school last name."],
      ["Check-in roster (one per event)", "Check-in sheets and name tags: one row per person, guests listed under the classmate who brought them, sorted by high-school last name."],
    ],
    [3000, 6360],
  ),
  gap(),
  box("Name tags", "The “Name tag” column already shows each classmate the way they were known, e.g. Susan “Sue” (Miller) Johnson. Most label programs and mail merges can use the file directly."),
  h2("Emails the site sends by itself"),
  table(
    ["Email", "Sent to", "When"],
    [
      ["RSVP confirmation (with calendar file)", "The classmate", "When they RSVP or change their RSVP"],
      ["Private link", "The classmate", "When they use “Lost your link?” or you resend it"],
      ["Please confirm a classmate", "Organizer email", "When an RSVP name doesn’t match the list"],
      ["You’re confirmed", "The classmate", "When you (or a list correction) confirm them"],
      ["Sign-in link", "The organizer", "When you sign in"],
      ["Website problem / down / back up", "Organizer email", "See section 9"],
    ],
    [3400, 2300, 3660],
  ),
  gap(),
  p("All emails come from reunion@crownjacobs77.com. Replies go to the organizer email set in Settings."),
);

// 9. Health
add(
  h1("9. Keeping an eye on the website"),
  p("The site watches itself, so problems reach you before classmates complain."),
  table(
    ["Alert", "What it means", "What to do"],
    [
      ["“The reunion website hit a problem”", "A page or form failed for someone. At most one email an hour.", "Open the link in the email. A one-off is normal (a dropped phone connection). If the same problem repeats, forward the email to whoever maintains the site."],
      ["“The reunion website is down”", "Two checks in a row, five minutes apart, got no answer.", "Try the site yourself. If it’s still down after 15 minutes, contact whoever maintains the site. You’ll get a “back up” email when it recovers."],
    ],
    [2500, 3200, 3660],
  ),
  gap(),
  p("The **Site problems** page (link on the dashboard) lists recent errors with how often they happened. **Clear the list** once they’re dealt with."),
  h2("Things that look wrong but aren’t"),
  table(
    ["You notice…", "Why"],
    [
      ["A change doesn’t show on the site yet", "Pages refresh within a minute. Reload the page."],
      ["“Preview” ribbon at the top", "The site is still behind the passcode. It disappears at launch."],
      ["Someone can’t open the yearbooks after launch", "They haven’t RSVP’d or aren’t confirmed yet. Check them under RSVPs or Classmates."],
      ["A classmate says they didn’t get their email", "Ask them to check spam, then use Email them a new link on their RSVP page."],
    ],
    [3800, 5560],
  ),
);

// 10. Launch
add(
  h1("10. Launch day"),
  p("Until launch, the whole site is behind the passcode (“preview”). Launch makes it public. It is one step for the developer and can be undone the same way."),
  h2("What changes at launch"),
  bullet("The passcode comes off. Home, Weekend, Stay and RSVP are open to everyone and can appear in Google."),
  bullet("The “Preview” ribbon and the design reference page disappear."),
  bullet("The yearbooks and Who’s Coming open only for confirmed classmates (people who RSVP’d and matched, or who pass the name check on the Yearbooks page). Turn this off in Settings if you prefer them open to anyone."),
  bullet("Test entries are removed. Real RSVPs made during the preview are kept."),
  h2("Before you say “go”"),
  ...steps([
    "Check every event under **Events**: titles, times, places, prices and capacity.",
    "Add the official hotel under **Stay**, if there is one.",
    "Set the **RSVP deadline** and **refund policy** in Settings, and decide on the Info and In Memoriam pages.",
    "Skim the **Classmates** list for misspelled names.",
    "Read the home page and RSVP wording once more under **Site text**.",
    "Tell the developer to launch. The site is public within about two minutes.",
    "Open crownjacobs77.com on a phone without the passcode and make a test RSVP with your own details, then share the link with the class.",
  ]),
  box("Sharing the link", "When the site is shared on Facebook or by text, the preview shows the ’77 monogram with “Class of ’77 · 50-Year Reunion · October 8–10, 2027”. Facebook may keep an old preview for a few hours."),
  h2("If you need to undo launch"),
  p("Ask the developer to roll back. The passcode comes back on within about two minutes; no RSVPs are lost."),
);

// ----------------------------------------------------------------- document
const doc = new Document({
  creator: "Class of ’77 Reunion",
  title: "Class of ’77 Reunion — Organizer Guide",
  description: "How to run the reunion website",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: BODY, size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: HEAD, size: 36, bold: true, color: NAVY }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: HEAD, size: 26, bold: true, color: BLUE }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: { config: numberingConfigs },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } }, titlePage: true },
      headers: {
        default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D9CFB8", space: 4 } }, children: [run("Class of ’77 Reunion · Organizer Guide", { size: 18, color: MUTED })] })] }),
        first: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [run("crownjacobs77.com", { size: 18, color: MUTED }), run("\tPage ", { size: 18, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: BODY, size: 18, color: MUTED }), run(" of ", { size: 18, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: BODY, size: 18, color: MUTED })] })] }),
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
      },
      children: content,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2], buf);
  console.log("wrote", process.argv[2]);
});
