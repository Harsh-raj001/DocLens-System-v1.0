"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Citation = { page: number; text: string };
type Message = { role: "assistant" | "user"; text: string; confidence?: "High" | "Medium" | "Low"; citations?: Citation[] };

const demoDocument = {
  title: "Global Mobility Report 2024",
  pages: 42,
  type: "Annual report",
  shortSummary: "Electric mobility is moving from early adoption into scale. The report finds that charging access, cost parity, and regional policy will determine how quickly the market expands.",
  summaries: {
    "30-second": "Electric mobility is entering its scale-up phase. Demand remains strong, but affordability and charging infrastructure are the decisive constraints. The report recommends targeting public charging partnerships and lowering total cost of ownership.",
    "2-minute": "The report describes a maturing electric mobility market: sales are growing across major regions, fleets are adopting faster than individual consumers, and policy incentives continue to shape demand. Its central risk is uneven charging coverage, especially outside urban corridors. The biggest opportunity is a coordinated ecosystem of vehicles, chargers, and grid services. For operators, the next two years are about execution: prioritize dense high-use corridors, make pricing transparent, and partner locally.",
    Executive: "The EV market is structurally attractive but operationally constrained. Organizations that solve charging reliability and total cost of ownership can capture a widening adoption gap. Recommended priority: invest in corridor coverage, fleet partnerships, and a clear affordability narrative.",
    Technical: "The document attributes adoption to falling battery costs, regulatory support, and fleet economics. It identifies charging uptime, peak-load management, and regional interoperability as critical system dependencies. Its cited projections assume continued infrastructure investment and stable policy support."
  },
  topics: [
    ["Market momentum", "EV adoption has moved beyond early adopters in several regions.", 7],
    ["Charging infrastructure", "Reliable public charging is the primary practical bottleneck.", 18],
    ["Fleet transition", "Commercial fleets adopt faster where utilization is predictable.", 23],
    ["Policy landscape", "Incentives and standards remain important demand multipliers.", 31]
  ],
  insights: [
    ["Key finding", "Public charger reliability matters more than raw charger count.", 18],
    ["Recommendation", "Prioritize high-traffic corridors before broad geographic expansion.", 29],
    ["Risk", "A fragmented charging experience may slow consumer confidence.", 19],
    ["Opportunity", "Fleet charging can create dependable early utilization.", 24]
  ]
};

function getAnswer(question: string): Message {
  const q = question.toLowerCase();
  if (q.includes("risk") || q.includes("challenge")) return { role: "assistant", text: "The main risk is inconsistent charging access and reliability. The report warns that a fragmented experience can weaken consumer confidence even when vehicle demand is strong.", confidence: "High", citations: [{ page: 18, text: "Charging availability and uptime remain the principal consumer friction." }, { page: 19, text: "Fragmented access undermines confidence in longer journeys." }] };
  if (q.includes("recommend") || q.includes("should")) return { role: "assistant", text: "The report recommends concentrating investment on high-use corridors, improving charging uptime, and building fleet partnerships before expanding widely. This sequence improves utilization while reducing the perceived access gap.", confidence: "High", citations: [{ page: 29, text: "A corridor-first deployment strategy concentrates usage and improves service quality." }, { page: 24, text: "Fleet commitments create more predictable charger utilization." }] };
  if (q.includes("growth") || q.includes("market")) return { role: "assistant", text: "The report sees continued market expansion, led by regions with policy support and improving cost parity. It frames infrastructure execution—not lack of demand—as the key limiter to growth.", confidence: "Medium", citations: [{ page: 7, text: "Market growth persists across major regions as ownership economics improve." }, { page: 18, text: "Infrastructure availability remains the binding constraint." }] };
  return { role: "assistant", text: "Based on the report, electric mobility is progressing from adoption to scale. The document repeatedly links successful expansion to affordable ownership and dependable charging, particularly on high-use routes.", confidence: "Medium", citations: [{ page: 7, text: "The market is transitioning from early adoption to a broader scale-up phase." }, { page: 18, text: "Dependable charging availability is central to sustained adoption." }] };
}

export default function Home() {
  const [documentName, setDocumentName] = useState(demoDocument.title);
  const [phase, setPhase] = useState<"upload" | "processing" | "ready">("ready");
  const [progress, setProgress] = useState(0);
  const [activeSummary, setActiveSummary] = useState<keyof typeof demoDocument.summaries>("30-second");
  const [activePage, setActivePage] = useState(1);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I’m ready to help you explore this report. Every answer will include its supporting pages.", confidence: "High" }]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "processing") return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + 12, 100)), 320);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "processing" && progress === 100) {
      const done = window.setTimeout(() => setPhase("ready"), 450);
      return () => window.clearTimeout(done);
    }
  }, [phase, progress]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { window.alert("Please select a PDF file."); return; }
    setDocumentName(file.name.replace(/\.pdf$/i, ""));
    setProgress(0); setPhase("processing");
  };

  const ask = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const answer = getAnswer(question);
    setMessages((current) => [...current, { role: "user", text: question }, answer]);
    setQuestion("");
    if (answer.citations?.[0]) setActivePage(answer.citations[0].page);
  };

  if (phase === "upload") return <main className="welcome"><nav className="topbar brand-only"><span className="logo-mark">N</span><strong>Nexa</strong></nav><section className="upload-hero"><span className="eyebrow">DOCUMENT INTELLIGENCE</span><h1>Understand the important parts.<br /><em>In minutes.</em></h1><p>Upload a document and get source-backed summaries, insights, and answers—not just a chat box.</p><button className="primary" onClick={() => fileInput.current?.click()}>Upload a PDF <span>→</span></button><input ref={fileInput} onChange={onFile} type="file" accept="application/pdf" hidden /><small>Text-based PDFs supported · Your documents remain private</small></section></main>;

  if (phase === "processing") return <main className="welcome"><nav className="topbar brand-only"><span className="logo-mark">N</span><strong>Nexa</strong></nav><section className="processing"><div className="document-glyph">▤</div><span className="eyebrow">ANALYZING YOUR DOCUMENT</span><h1>Building its intelligence layer</h1><p>Extracting text, mapping pages, and finding what matters.</p><div className="progress"><i style={{ width: `${progress}%` }} /></div><strong>{progress}% complete</strong><div className="processing-steps"><span className={progress > 15 ? "complete" : ""}>Extracting pages</span><span className={progress > 45 ? "complete" : ""}>Indexing knowledge</span><span className={progress > 75 ? "complete" : ""}>Generating insights</span></div></section></main>;

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="logo-mark">N</span><strong>Nexa</strong></div><button className="new-doc" onClick={() => setPhase("upload")}>＋ New document</button><div className="side-label">YOUR LIBRARY</div><button className="library-item active"><span>▤</span><span>{documentName}</span></button><button className="library-item"><span>▤</span><span>Q1 Product Strategy</span></button><div className="sidebar-footer"><button>⚙ Settings</button><button>◉ Alex Morgan</button></div></aside>
    <section className="workspace"><header className="document-header"><div><div className="crumb">MY LIBRARY / <b>{demoDocument.type.toUpperCase()}</b></div><h1>{documentName}</h1><p>{demoDocument.pages} pages · Analyzed just now <span className="ready-dot">● Ready</span></p></div><button className="share">↗ Share</button></header>
      <div className="content-grid"><section className="main-content"><section className="summary-card"><div className="section-top"><div><span className="eyebrow">OVERVIEW</span><h2>Smart summary</h2></div><span className="spark">✦</span></div><div className="summary-tabs">{(Object.keys(demoDocument.summaries) as Array<keyof typeof demoDocument.summaries>).map((tab) => <button key={tab} onClick={() => setActiveSummary(tab)} className={activeSummary === tab ? "selected" : ""}>{tab}</button>)}</div><p className="summary-copy">{demoDocument.summaries[activeSummary]}</p><button className="source-link" onClick={() => setActivePage(7)}>View source pages <span>→</span></button></section>
        <section className="section-block"><div className="section-top"><div><span className="eyebrow">AT A GLANCE</span><h2>Key topics</h2></div></div><div className="topic-list">{demoDocument.topics.map(([title, copy, page]) => <button key={title} className="topic" onClick={() => setActivePage(page as number)}><span className="topic-icon">⌁</span><span><b>{title}</b><small>{copy}</small></span><em>p. {page}</em><i>→</i></button>)}</div></section>
        <section className="section-block"><div className="section-top"><div><span className="eyebrow">WHAT MATTERS</span><h2>Key insights</h2></div><button className="text-button">See all insights</button></div><div className="insight-grid">{demoDocument.insights.map(([kind, copy, page]) => <button key={kind} className="insight" onClick={() => setActivePage(page as number)}><span className={String(kind).toLowerCase().replace(" ", "-")}>{kind}</span><p>{copy}</p><small>Source: page {page} →</small></button>)}</div></section>
      </section>
      <aside className="right-rail"><section className="viewer"><div className="viewer-head"><b>Source preview</b><span>Page {activePage}</span></div><div className="paper"><div className="paper-running">GLOBAL MOBILITY REPORT 2024 <span>{activePage}</span></div><h3>{activePage === 18 ? "Infrastructure availability" : activePage === 29 ? "A corridor-first strategy" : activePage === 7 ? "The market reaches scale" : "Executive overview"}</h3><p>The transition to electric mobility is accelerating across key markets. Adoption is increasingly shaped by the experience surrounding the vehicle, not the vehicle alone.</p><p className="highlighted">{activePage === 18 ? "Charging availability and uptime remain the principal consumer friction, particularly beyond dense urban areas." : activePage === 29 ? "A corridor-first deployment strategy concentrates usage and improves service quality before expansion." : "Market growth persists as ownership economics improve and policy support creates momentum."}</p><p>Operators that coordinate access, reliability, and transparent pricing are better positioned to serve the next phase of demand.</p><div className="paper-lines"><i /><i /><i /></div></div><button className="open-doc">Open full document ↗</button></section>
        <section className="chat"><div className="chat-head"><div><span className="eyebrow">ASK ANYTHING</span><h2>Chat with this document</h2></div><span className="safe">● Grounded</span></div><div className="messages">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}><p>{message.text}</p>{message.confidence && <small className={`confidence ${message.confidence.toLowerCase()}`}>{message.confidence} confidence</small>}{message.citations?.map((citation) => <button className="citation" key={citation.page} onClick={() => setActivePage(citation.page)}><b>Page {citation.page}</b><span>{citation.text}</span></button>)}</div>)}</div><form className="chat-form" onSubmit={ask}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this document…" /><button aria-label="Send question">↑</button></form><small className="chat-note">Answers include page-level sources</small></section>
      </aside></div>
    </section>
  </main>;
}
