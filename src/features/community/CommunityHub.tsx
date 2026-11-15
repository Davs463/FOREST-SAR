import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, Leaf, MessageCircle, Plus, Radio, Send, ShieldCheck, ThumbsUp } from 'lucide-react';
import './community-hub.css';

type Post = { id: number; category: string; title: string; body: string; author: string; place: string; votes: number; comments: number; sampleReplies?: string[]; demo?: boolean };
type Proposal = { id: string; type: 'Poll topic' | 'Sample event'; title: string; details: string; place?: string };

const seedPosts: Post[] = [
  { id: 1, category: 'Community reports', title: 'What changes have you noticed near your community?', body: 'Share observations such as new clearing, flooding, or changes along a river. A date and general location help others understand the context.', author: 'BosqueVivo team', place: 'Honduras', votes: 18, comments: 2, sampleReplies: ['A useful observation includes when and roughly where it happened.', 'Keep the description separate from any guess about its cause.'], demo: true },
  { id: 2, category: 'Research & science', title: 'How can radar support forest monitoring?', body: 'SAR sends and receives microwave signals. The return signal can help researchers study changes on the surface, including when clouds limit optical views.', author: 'Learning desk', place: 'NISAR / learning topic', votes: 12, comments: 2, sampleReplies: ['Comparing observations over time can help identify changes to investigate.', 'Other sources and local context are still needed to interpret a signal.'], demo: true },
  { id: 3, category: 'Environmental education', title: 'A field note is useful even without a photo', body: 'Record what you saw, when you saw it, and the broad area. Avoid sharing sensitive personal details or entering hazardous places to collect information.', author: 'Community guide', place: 'Field practice', votes: 9, comments: 2, sampleReplies: ['A date and broad area can make a note easier to understand.', 'Please keep personal details and unsafe locations out of reports.'], demo: true },
];

const pollOptions = [
  { label: 'Forest change and land cover', votes: 34 },
  { label: 'Flooding and river conditions', votes: 26 },
  { label: 'Learning how satellite radar works', votes: 21 },
];

const events = [
  { date: 'DEMO', kind: 'Workshop example', title: 'Reading the landscape with radar', place: 'Online learning session', detail: 'A sample event card showing how a community learning activity could be presented.' },
  { date: 'DEMO', kind: 'Community example', title: 'Share a local nature observation', place: 'Honduras · location to be confirmed', detail: 'Illustrative listing only. No real date, venue, or registration is being announced.' },
];

const learningCards = [
  { icon: Radio, eyebrow: '01 / The signal', title: 'Radar sends a pulse', body: 'A synthetic aperture radar instrument transmits microwave energy and measures the signal that returns from Earth.' },
  { icon: Leaf, eyebrow: '02 / The surface', title: 'Surfaces return signals differently', body: 'The return depends on properties such as surface structure and moisture. A change in signal can be a clue to investigate, not proof of a cause.' },
  { icon: CircleHelp, eyebrow: '03 / Read with care', title: 'An observation needs context', body: 'Researchers compare observations over time and use other information to interpret them. This prototype does not process NISAR measurements.' },
];

const preparedness = [
  { title: 'Forest fire readiness', items: ['Know local official information channels', 'Keep emergency contacts accessible', 'Follow directions from local authorities'] },
  { title: 'Flood awareness', items: ['Learn which official sources publish local notices', 'Keep essential documents and contacts together', 'Never cross moving floodwater'] },
  { title: 'Environmental observation', items: ['Record date and broad location', 'Describe what you observed without guessing the cause', 'Do not enter unsafe or restricted areas'] },
];

const sources = [
  { kind: 'Mission source', title: 'NASA–ISRO Synthetic Aperture Radar (NISAR)', href: 'https://nisar.jpl.nasa.gov/' },
  { kind: 'Learning source', title: 'NASA Earthdata: Synthetic Aperture Radar', href: 'https://www.earthdata.nasa.gov/learn/backgrounders/what-is-sar' },
  { kind: 'Data status', title: 'This prototype uses illustrative local content', href: '#observatory' },
];

const categories = ['All topics', 'Community reports', 'Research & science', 'Environmental education'];
const navItems = [
  { href: '#bv-community', label: 'Community', icon: MessageCircle },
  { href: '#bv-polls', label: 'Polls', icon: ThumbsUp },
  { href: '#bv-events', label: 'Events', icon: CalendarDays },
  { href: '#bv-preparedness', label: 'Preparedness', icon: ShieldCheck },
  { href: '#bv-learning', label: 'Learn SAR', icon: BookOpen },
  { href: '#bv-journal', label: 'Field notes', icon: Leaf },
];

function readSavedPosts(): Post[] {
  try {
    const saved = localStorage.getItem('bosquevivo-community-posts');
    if (!saved) return seedPosts;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? [...(parsed as Post[]), ...seedPosts] : seedPosts;
  } catch {
    return seedPosts;
  }
}

export function CommunityHub() {
  const [posts, setPosts] = useState<Post[]>(readSavedPosts);
  const [filter, setFilter] = useState('All topics');
  const [draftOpen, setDraftOpen] = useState(false);
  const [voted, setVoted] = useState<number | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalType, setProposalType] = useState<Proposal['type']>('Poll topic');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalMessage, setProposalMessage] = useState('');
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, string[]>>({});
  const [interested, setInterested] = useState<number[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const visiblePosts = useMemo(() => filter === 'All topics' ? posts : posts.filter((post) => post.category === filter), [filter, posts]);
  const counts = pollOptions.map((option, i) => option.votes + (voted === i ? 1 : 0));
  const totalVotes = counts.reduce((sum, count) => sum + count, 0);

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    const category = String(form.get('category') ?? categories[1]);
    if (!title || !body) return;
    const next: Post = { id: Date.now(), category, title, body, author: 'You', place: 'Community contribution', votes: 0, comments: 0 };
    const userPosts = [next, ...posts.filter((post) => !post.demo)];
    setPosts([...userPosts, ...seedPosts]);
    try { localStorage.setItem('bosquevivo-community-posts', JSON.stringify(userPosts)); } catch { /* Storage may be disabled. */ }
    event.currentTarget.reset();
    setDraftOpen(false);
    setFilter('All topics');
    setNotice('Your post was added on this device.');
    window.setTimeout(() => setNotice(''), 3500);
  }

  function toggleCheck(key: string) {
    setChecked((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function submitComment(event: FormEvent<HTMLFormElement>, postId: number) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const comment = String(form.get('comment') ?? '').trim();
    if (!comment) return;
    setCommentsByPost((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
    event.currentTarget.reset();
    setNotice('Your reply was added on this device.');
    window.setTimeout(() => setNotice(''), 3500);
  }

  function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('proposalTitle') ?? '').trim();
    const details = String(form.get('proposalDetails') ?? '').trim();
    const place = String(form.get('proposalPlace') ?? '').trim();
    if (!title || !details || (proposalType === 'Sample event' && !place)) return;
    const identity = [proposalType, title, details, place].map((value) => value.trim().toLocaleLowerCase()).join('|');
    const proposal: Proposal = { id: identity, type: proposalType, title, details, ...(proposalType === 'Sample event' ? { place } : {}) };
    const alreadySaved = proposals.some((current) => current.id === identity);
    if (!alreadySaved) setProposals((current) => [proposal, ...current]);
    event.currentTarget.reset();
    setProposalOpen(false);
    setProposalMessage(alreadySaved ? 'This identical idea is already saved on this page. Nothing was sent or published.' : 'Your idea is saved on this page only. Nothing was sent or published.');
  }

  return (
    <div className="bv-community-hub" id="community">
      <section className="bv-community-intro" aria-labelledby="bv-community-title">
        <div className="bv-community-intro-copy">
          <span className="bv-kicker"><span className="bv-kicker-mark" /> PEOPLE · KNOWLEDGE · PLACE</span>
          <h2 id="bv-community-title">Observation is stronger <em>together.</em></h2>
          <p>Explore ways to learn, share a field note, and prepare with trusted local information.</p>
        </div>
        <div className="bv-community-intro-aside"><span className="bv-monogram">BV / HN</span><span>Community features<br />prototype edition</span><ArrowDownRight size={18} aria-hidden="true" /></div>
      </section>

      <nav className="bv-community-subnav" aria-label="Community section navigation">
        {navItems.map(({ href, label, icon: Icon }) => <a key={href} href={href}><Icon size={15} aria-hidden="true" /><span>{label}</span><ChevronRight size={13} aria-hidden="true" /></a>)}
      </nav>

      <section id="bv-community" className="bv-community-section" aria-labelledby="bv-community-feed-title">
        <div className="bv-section-heading">
          <div><span className="bv-kicker">01 / COMMUNITY FIELD NOTES</span><h3 id="bv-community-feed-title">A shared field notebook</h3><p>Contributions and sample posts are kept local to this browser.</p></div>
          <button className="bv-action-button" type="button" onClick={() => setDraftOpen((open) => !open)}><Plus size={16} /> Add an observation</button>
        </div>
        {notice && <p className="bv-inline-notice" role="status"><Check size={15} /> {notice}</p>}
        {draftOpen && <form className="bv-post-form" onSubmit={submitPost}>
          <div className="bv-form-heading"><span className="bv-kicker">NEW CONTRIBUTION</span><span className="bv-demo-tag">LOCAL DEMO</span></div>
          <label>Topic<select name="category" defaultValue="Community reports">{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Title<input name="title" required maxLength={90} placeholder="What did you observe?" /></label>
          <label>Details<textarea name="body" required maxLength={500} rows={3} placeholder="Add context such as when and the broad area. Avoid personal or sensitive details." /></label>
          <div className="bv-form-foot"><span>Saved on this device only · Not reviewed or sent to authorities</span><button className="bv-action-button" type="submit"><Send size={14} /> Post note</button></div>
        </form>}
        <div className="bv-feed-tools" aria-label="Filter field notes">
          {categories.map((category) => <button type="button" key={category} className={filter === category ? 'is-active' : ''} onClick={() => setFilter(category)} aria-pressed={filter === category}>{category}</button>)}
        </div>
        <div className="bv-post-list">{visiblePosts.map((post, index) => <article className="bv-post" key={post.id}>
          <div className="bv-post-index">{String(index + 1).padStart(2, '0')}<span> / HN</span></div>
          <div className="bv-post-main"><div className="bv-post-meta"><span>{post.category}</span>{post.demo && <span className="bv-demo-tag">SAMPLE</span>}</div><h4>{post.title}</h4><p>{post.body}</p><div className="bv-post-byline">{post.author} <span>·</span> {post.place}</div></div>
          <div className="bv-post-actions"><button type="button" aria-label={`Support ${post.title}`} onClick={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, votes: item.votes + 1 } : item))}><ArrowUpRight size={16} /> {post.votes}</button><button type="button" aria-expanded={openComments === post.id} aria-label={`${openComments === post.id ? 'Hide' : 'Show'} replies to ${post.title}`} onClick={() => setOpenComments((current) => current === post.id ? null : post.id)}><MessageCircle size={14} /> {post.comments + (commentsByPost[post.id]?.length ?? 0)}</button></div>
          {openComments === post.id && <div className="bv-comments"><span className="bv-kicker">LOCAL DISCUSSION · EXAMPLE CONTENT</span>{(post.sampleReplies ?? []).map((comment, commentIndex) => <p className="bv-comment" key={`sample-${post.id}-${commentIndex}`}><strong><span className="bv-demo-tag">SAMPLE</span></strong>{comment}</p>)}{(commentsByPost[post.id] ?? []).map((comment, commentIndex) => <p className="bv-comment" key={`user-${post.id}-${commentIndex}`}><strong>You</strong>{comment}</p>)}<form className="bv-comment-form" onSubmit={(event) => submitComment(event, post.id)}><label className="bv-sr-only" htmlFor={`reply-${post.id}`}>Write a reply</label><input id={`reply-${post.id}`} name="comment" required maxLength={240} placeholder="Add a thoughtful reply…" /><button type="submit" aria-label="Post reply"><Send size={14} /></button></form></div>}
        </article>)}</div>
      </section>

      <section id="bv-polls" className="bv-poll-section" aria-labelledby="bv-poll-title">
        <div className="bv-poll-copy"><span className="bv-kicker">02 / CITIZEN PARTICIPATION</span><h3 id="bv-poll-title">What should we explore next?</h3><p>Choose a topic to see a locally simulated response. Results are illustrative, not a public survey.</p><span className="bv-demo-tag">SIMULATED POLL · {totalVotes} SAMPLE RESPONSES</span></div>
        <div className="bv-poll-options" role="group" aria-label="Choose an environmental topic">
          {pollOptions.map((option, index) => <button type="button" key={option.label} className={`bv-poll-option ${voted === index ? 'is-selected' : ''}`} onClick={() => setVoted(index)} aria-pressed={voted === index}>
            <span className="bv-poll-option-label"><span>{option.label}</span>{voted === index && <Check size={15} aria-label="Your selection" />}</span>
            <span className="bv-poll-track"><span style={{ width: `${Math.round((counts[index] / totalVotes) * 100)}%` }} /></span>
            <span className="bv-poll-share">{Math.round((counts[index] / totalVotes) * 100)}% <small>{counts[index]} responses</small></span>
          </button>)}
        </div>
        <div className="bv-proposal-block">
          <div className="bv-proposal-heading"><div><span className="bv-kicker">HAVE AN IDEA?</span><p>Suggest a poll topic or an illustrative event listing. Suggestions stay on this device and are never published.</p></div><button type="button" className="bv-text-button" aria-expanded={proposalOpen} onClick={() => setProposalOpen((open) => !open)}>{proposalOpen ? 'Close form' : 'Make a suggestion'} <Plus size={15} /></button></div>
          {proposalOpen && <form className="bv-proposal-form" onSubmit={submitProposal}>
            <label>Idea type<select value={proposalType} onChange={(event) => setProposalType(event.target.value as Proposal['type'])}><option>Poll topic</option><option>Sample event</option></select></label>
            <label>{proposalType === 'Poll topic' ? 'Poll question or topic' : 'Sample event title'}<input name="proposalTitle" required maxLength={100} placeholder={proposalType === 'Poll topic' ? 'What would you like to ask?' : 'What could the sample event be about?'} /></label>
            <label>Short description<textarea name="proposalDetails" required maxLength={280} rows={2} placeholder="Describe the idea briefly." /></label>
            {proposalType === 'Sample event' && <label>Example location<input name="proposalPlace" required maxLength={100} placeholder="For example: online, or a general area" /></label>}
            <div className="bv-proposal-foot"><span>Local demo only · Nothing is submitted publicly</span><button className="bv-action-button" type="submit"><Send size={14} /> Save idea</button></div>
          </form>}
          {proposalMessage && <p className="bv-proposal-confirmation" role="status"><Check size={14} /> {proposalMessage}</p>}
          {proposals.length > 0 && <div className="bv-proposal-results" aria-label="Ideas saved locally">{proposals.map((proposal) => <article className="bv-proposal-card" key={proposal.id}><span className="bv-demo-tag">LOCAL {proposal.type.toUpperCase()}</span><h4>{proposal.title}</h4><p>{proposal.details}</p>{proposal.place && <small>{proposal.place}</small>}<span className="bv-proposal-local">Saved in this page only · Not published</span></article>)}</div>}
        </div>
      </section>

      <section id="bv-events" className="bv-community-section" aria-labelledby="bv-events-title">
        <div className="bv-section-heading"><div><span className="bv-kicker">03 / GATHER & LEARN</span><h3 id="bv-events-title">On the community calendar</h3><p>Examples of how learning and conservation activities could appear.</p></div><span className="bv-demo-tag">ILLUSTRATIVE LISTINGS</span></div>
        <div className="bv-event-list">{events.map((event, index) => <article className="bv-event" key={event.title}>
          <div className="bv-event-date"><CalendarDays size={17} /><span>{event.date}</span></div><div className="bv-event-body"><span className="bv-kicker">{event.kind} · 0{index + 1}</span><h4>{event.title}</h4><p>{event.detail}</p><span className="bv-event-place">{event.place}</span></div>
          <button type="button" className={`bv-interest ${interested.includes(index) ? 'is-active' : ''}`} onClick={() => setInterested((current) => current.includes(index) ? current.filter((id) => id !== index) : [...current, index])} aria-pressed={interested.includes(index)}>{interested.includes(index) ? 'Saved' : 'Save interest'} <ArrowUpRight size={15} /></button>
        </article>)}</div>
      </section>

      <section id="bv-preparedness" className="bv-preparedness" aria-labelledby="bv-preparedness-title">
        <div className="bv-prep-lead"><span className="bv-kicker">04 / KNOW BEFORE YOU NEED IT</span><h3 id="bv-preparedness-title">Preparedness starts with reliable information.</h3><p>Educational checklists only. They are not alerts or emergency instructions. Follow guidance from the authorities responsible for your area.</p><a href="https://www.copeco.gob.hn/" target="_blank" rel="noreferrer">COPECO official website <ArrowUpRight size={15} /></a></div>
        <div className="bv-checklist-grid">{preparedness.map((plan, planIndex) => <article className="bv-checklist" key={plan.title}><div className="bv-checklist-top"><span>0{planIndex + 1}</span><ShieldCheck size={17} aria-hidden="true" /></div><h4>{plan.title}</h4>{plan.items.map((item, itemIndex) => { const key = `${planIndex}-${itemIndex}`; const isChecked = checked.includes(key); return <label className={`bv-check-item ${isChecked ? 'is-checked' : ''}`} key={item}><input type="checkbox" checked={isChecked} onChange={() => toggleCheck(key)} /><span className="bv-check-box"><Check size={12} /></span><span>{item}</span></label>; })}</article>)}</div>
        <p className="bv-safety-note"><ShieldCheck size={15} /> Plans are educational examples and do not replace instructions from competent authorities.</p>
      </section>

      <section id="bv-learning" className="bv-community-section" aria-labelledby="bv-learning-title">
        <div className="bv-section-heading"><div><span className="bv-kicker">05 / UNDERSTAND THE SIGNAL</span><h3 id="bv-learning-title">A short introduction to SAR</h3><p>Three ideas to help read an observation with care.</p></div><a className="bv-text-link" href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">Explore NASA–ISRO NISAR <ArrowUpRight size={15} /></a></div>
        <div className="bv-learning-grid">{learningCards.map(({ icon: Icon, eyebrow, title, body }) => <article className="bv-learning-card" key={title}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /><span className="bv-kicker">{eyebrow}</span><h4>{title}</h4><p>{body}</p></article>)}</div>
      </section>

      <section id="bv-journal" className="bv-journal" aria-labelledby="bv-journal-title">
        <div><span className="bv-kicker">06 / CONTINUE EXPLORING</span><h3 id="bv-journal-title">Field notes & sources</h3><p>Start with mission and learning resources from NASA. Prototype content is clearly marked and does not represent live news.</p><article className="bv-mission-card"><span className="bv-kicker">MISSION BACKGROUND</span><h4>One mission, two radar partners.</h4><p>NISAR is a joint NASA–ISRO Earth-observing mission using synthetic aperture radar to study changes across Earth's land and ice.</p><a href="https://nisar.jpl.nasa.gov/mission/mission-concept/" target="_blank" rel="noreferrer">Read the NASA/JPL mission concept <ArrowUpRight size={14} /></a></article></div>
        <div className="bv-source-list">{sources.map((source, index) => <a key={source.title} href={source.href} target={source.href.startsWith('http') ? '_blank' : undefined} rel={source.href.startsWith('http') ? 'noreferrer' : undefined}><span className="bv-source-number">0{index + 1}</span><span><small>{source.kind}</small>{source.title}</span><ArrowUpRight size={16} /></a>)}</div>
      </section>

      <footer className="bv-community-footer"><span className="bv-kicker">BOSQUEVIVO HN · NASA SPACE APPS PROTOTYPE</span><span>Local demo interactions · No live NISAR processing</span></footer>
    </div>
  );
}

export default CommunityHub;
