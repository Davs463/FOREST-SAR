import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, Leaf, MessageCircle, Plus, Radio, Send, ShieldCheck, ThumbsUp } from 'lucide-react';
import { APP_CONFIG, routeHref } from '../../config/app.config';
import { useI18n, type MessageKey, type TFunction } from '../../i18n';
import { storage } from '../../services/storage';
import './community-hub.css';

const brandName = APP_CONFIG.brand.name;
const POSTS_KEY = 'community:posts';

function jumpTo(event: { preventDefault: () => void }, href: string) {
  event.preventDefault();
  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Stable category ids: filters and saved posts use these, never the translated labels.
const CATEGORY_IDS = ['reports', 'science', 'education'] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];
type Filter = 'all' | CategoryId;
const FILTERS: Filter[] = ['all', ...CATEGORY_IDS];
const FILTER_KEY: Record<Filter, MessageKey> = {
  all: 'community.categories.all',
  reports: 'community.categories.reports',
  science: 'community.categories.science',
  education: 'community.categories.education',
};
// Category names saved by earlier versions of this page (English labels) mapped to ids.
const LEGACY_CATEGORY = new Map<string, CategoryId>([
  ['Community reports', 'reports'],
  ['Research & science', 'science'],
  ['Environmental education', 'education'],
]);

function normalizeCategory(value: unknown): CategoryId {
  if (typeof value !== 'string') return 'reports';
  if ((CATEGORY_IDS as readonly string[]).includes(value)) return value as CategoryId;
  return LEGACY_CATEGORY.get(value) ?? 'reports';
}

type Post = {
  id: number;
  category: CategoryId;
  title: string;
  body: string;
  votes: number;
  comments: number;
  /** Sample posts only: authored text is supplied by the translated content, not by the user. */
  demo?: boolean;
  author?: string;
  place?: string;
  replies?: string[];
};
type ProposalType = 'poll' | 'event';
type Proposal = { id: string; type: ProposalType; title: string; details: string; place?: string };

function buildContent(t: TFunction) {
  const seeds: Post[] = [
    { id: 1, category: 'reports', demo: true, votes: 18, comments: 2, title: t('community.seed.p1Title'), body: t('community.seed.p1Body'), author: t('community.seed.p1Author'), place: t('community.seed.p1Place'), replies: [t('community.seed.p1Reply1'), t('community.seed.p1Reply2')] },
    { id: 2, category: 'science', demo: true, votes: 12, comments: 2, title: t('community.seed.p2Title'), body: t('community.seed.p2Body'), author: t('community.seed.p2Author'), place: t('community.seed.p2Place'), replies: [t('community.seed.p2Reply1'), t('community.seed.p2Reply2')] },
    { id: 3, category: 'education', demo: true, votes: 9, comments: 2, title: t('community.seed.p3Title'), body: t('community.seed.p3Body'), author: t('community.seed.p3Author'), place: t('community.seed.p3Place'), replies: [t('community.seed.p3Reply1'), t('community.seed.p3Reply2')] },
  ];

  const pollOptions = [
    { label: t('community.poll.opt1'), votes: 34 },
    { label: t('community.poll.opt2'), votes: 26 },
    { label: t('community.poll.opt3'), votes: 21 },
  ];

  const events = [
    { date: t('community.events.demoDate'), kind: t('community.events.kind1'), title: t('community.events.title1'), place: t('community.events.place1'), detail: t('community.events.detail1') },
    { date: t('community.events.demoDate'), kind: t('community.events.kind2'), title: t('community.events.title2'), place: t('community.events.place2'), detail: t('community.events.detail2') },
  ];

  const learningCards = [
    { icon: Radio, eyebrow: t('community.learn.card1Eyebrow'), title: t('community.learn.card1Title'), body: t('community.learn.card1Body') },
    { icon: Leaf, eyebrow: t('community.learn.card2Eyebrow'), title: t('community.learn.card2Title'), body: t('community.learn.card2Body') },
    { icon: CircleHelp, eyebrow: t('community.learn.card3Eyebrow'), title: t('community.learn.card3Title'), body: t('community.learn.card3Body') },
  ];

  const preparedness = [
    { title: t('community.prep.plan1Title'), items: [t('community.prep.plan1Item1'), t('community.prep.plan1Item2'), t('community.prep.plan1Item3')] },
    { title: t('community.prep.plan2Title'), items: [t('community.prep.plan2Item1'), t('community.prep.plan2Item2'), t('community.prep.plan2Item3')] },
    { title: t('community.prep.plan3Title'), items: [t('community.prep.plan3Item1'), t('community.prep.plan3Item2'), t('community.prep.plan3Item3')] },
  ];

  const sources = [
    { kind: t('community.sources.kind1'), title: t('community.sources.title1'), href: 'https://nisar.jpl.nasa.gov/' },
    { kind: t('community.sources.kind2'), title: t('community.sources.title2'), href: 'https://www.earthdata.nasa.gov/learn/backgrounders/what-is-sar' },
    { kind: t('community.sources.kind3'), title: t('community.sources.title3'), href: routeHref('observatory') },
  ];

  const navItems = [
    { href: '#bv-community', label: t('community.nav.community'), icon: MessageCircle },
    { href: '#bv-polls', label: t('community.nav.polls'), icon: ThumbsUp },
    { href: '#bv-events', label: t('community.nav.events'), icon: CalendarDays },
    { href: '#bv-preparedness', label: t('community.nav.preparedness'), icon: ShieldCheck },
    { href: '#bv-learning', label: t('community.nav.learn'), icon: BookOpen },
    { href: '#bv-journal', label: t('community.nav.fieldNotes'), icon: Leaf },
  ];

  return { seeds, pollOptions, events, learningCards, preparedness, sources, navItems };
}

/** Saved user posts; anything malformed is dropped. Storage failures fall back to an empty list. */
function readSavedPosts(): Post[] {
  try {
    const saved = storage.get(POSTS_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown): Post[] => {
      if (typeof item !== 'object' || item === null) return [];
      const record = item as Record<string, unknown>;
      if (typeof record.title !== 'string' || typeof record.body !== 'string') return [];
      return [{
        id: typeof record.id === 'number' ? record.id : Date.now(),
        category: normalizeCategory(record.category),
        title: record.title,
        body: record.body,
        votes: 0,
        comments: 0,
      }];
    });
  } catch {
    return [];
  }
}

export function CommunityHub() {
  const { t } = useI18n();
  const content = useMemo(() => buildContent(t), [t]);
  const [userPosts, setUserPosts] = useState<Post[]>(readSavedPosts);
  const [extraVotes, setExtraVotes] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [draftOpen, setDraftOpen] = useState(false);
  const [voted, setVoted] = useState<number | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalType, setProposalType] = useState<ProposalType>('poll');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalMessage, setProposalMessage] = useState<MessageKey | ''>('');
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, string[]>>({});
  const [interested, setInterested] = useState<number[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [notice, setNotice] = useState<MessageKey | ''>('');
  const posts = useMemo(() => [...userPosts, ...content.seeds], [userPosts, content.seeds]);
  const visiblePosts = useMemo(() => filter === 'all' ? posts : posts.filter((post) => post.category === filter), [filter, posts]);
  const postVotes = (post: Post) => post.votes + (extraVotes[post.id] ?? 0);
  const counts = content.pollOptions.map((option, i) => option.votes + (voted === i ? 1 : 0));
  const totalVotes = counts.reduce((sum, count) => sum + count, 0);

  function flashNotice(key: MessageKey) {
    setNotice(key);
    window.setTimeout(() => setNotice(''), 3500);
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    const category = normalizeCategory(form.get('category'));
    if (!title || !body) return;
    const next: Post = { id: Date.now(), category, title, body, votes: 0, comments: 0 };
    const updated = [next, ...userPosts];
    setUserPosts(updated);
    storage.set(POSTS_KEY, JSON.stringify(updated)); // adapter never throws if storage is disabled
    event.currentTarget.reset();
    setDraftOpen(false);
    setFilter('all');
    flashNotice('community.feed.noticePosted');
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
    flashNotice('community.feed.noticeReply');
  }

  function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('proposalTitle') ?? '').trim();
    const details = String(form.get('proposalDetails') ?? '').trim();
    const place = String(form.get('proposalPlace') ?? '').trim();
    if (!title || !details || (proposalType === 'event' && !place)) return;
    const identity = [proposalType, title, details, place].map((value) => value.trim().toLocaleLowerCase()).join('|');
    const proposal: Proposal = { id: identity, type: proposalType, title, details, ...(proposalType === 'event' ? { place } : {}) };
    const alreadySaved = proposals.some((current) => current.id === identity);
    if (!alreadySaved) setProposals((current) => [proposal, ...current]);
    event.currentTarget.reset();
    setProposalOpen(false);
    setProposalMessage(alreadySaved ? 'community.proposal.duplicate' : 'community.proposal.saved');
  }

  return (
    <div className="bv-community-hub" id="community">
      <section className="bv-community-intro" aria-labelledby="bv-community-title">
        <div className="bv-community-intro-copy">
          <span className="bv-kicker"><span className="bv-kicker-mark" /> {t('community.intro.kicker')}</span>
          <h2 id="bv-community-title">{t('community.intro.title')} <em>{t('community.intro.titleEm')}</em></h2>
          <p>{t('community.intro.lead')}</p>
        </div>
        <div className="bv-community-intro-aside"><span className="bv-monogram">{brandName}</span><span>{t('community.intro.asideLine1')}<br />{t('community.intro.asideLine2')}</span><ArrowDownRight size={18} aria-hidden="true" /></div>
      </section>

      <nav className="bv-community-subnav" aria-label={t('community.navLabel')}>
        {content.navItems.map(({ href, label, icon: Icon }) => <a key={href} href={href} onClick={(event) => jumpTo(event, href)}><Icon size={15} aria-hidden="true" /><span>{label}</span><ChevronRight size={13} aria-hidden="true" /></a>)}
      </nav>

      <section id="bv-community" className="bv-community-section" aria-labelledby="bv-community-feed-title">
        <div className="bv-section-heading">
          <div><span className="bv-kicker">{t('community.feed.kicker')}</span><h3 id="bv-community-feed-title">{t('community.feed.title')}</h3><p>{t('community.feed.lead')}</p></div>
          <button className="bv-action-button" type="button" onClick={() => setDraftOpen((open) => !open)}><Plus size={16} /> {t('community.feed.addButton')}</button>
        </div>
        {notice && <p className="bv-inline-notice" role="status"><Check size={15} /> {t(notice)}</p>}
        {draftOpen && <form className="bv-post-form" onSubmit={submitPost}>
          <div className="bv-form-heading"><span className="bv-kicker">{t('community.feed.formKicker')}</span><span className="bv-demo-tag">{t('community.localDemoTag')}</span></div>
          <label>{t('community.feed.topicLabel')}<select name="category" defaultValue="reports">{CATEGORY_IDS.map((id) => <option key={id} value={id}>{t(FILTER_KEY[id])}</option>)}</select></label>
          <label>{t('community.feed.titleLabel')}<input name="title" required maxLength={90} placeholder={t('community.feed.titlePlaceholder')} /></label>
          <label>{t('community.feed.detailsLabel')}<textarea name="body" required maxLength={500} rows={3} placeholder={t('community.feed.detailsPlaceholder')} /></label>
          <div className="bv-form-foot"><span>{t('community.feed.formFoot')}</span><button className="bv-action-button" type="submit"><Send size={14} /> {t('community.feed.submit')}</button></div>
        </form>}
        <div className="bv-feed-tools" aria-label={t('community.feed.filterLabel')}>
          {FILTERS.map((id) => <button type="button" key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}>{t(FILTER_KEY[id])}</button>)}
        </div>
        <div className="bv-post-list">{visiblePosts.map((post, index) => {
          const title = post.title;
          const repliesOpen = openComments === post.id;
          return <article className="bv-post" key={post.id}>
            <div className="bv-post-index">{String(index + 1).padStart(2, '0')}<span> / HN</span></div>
            <div className="bv-post-main"><div className="bv-post-meta"><span>{t(FILTER_KEY[post.category])}</span>{post.demo && <span className="bv-demo-tag">{t('community.sampleTag')}</span>}</div><h4>{title}</h4><p>{post.body}</p><div className="bv-post-byline">{post.author ?? t('community.you')} <span>·</span> {post.place ?? t('community.feed.userPlace')}</div></div>
            <div className="bv-post-actions"><button type="button" aria-label={t('community.feed.support', { title })} onClick={() => setExtraVotes((current) => ({ ...current, [post.id]: (current[post.id] ?? 0) + 1 }))}><ArrowUpRight size={16} /> {postVotes(post)}</button><button type="button" aria-expanded={repliesOpen} aria-label={t(repliesOpen ? 'community.feed.hideReplies' : 'community.feed.showReplies', { title })} onClick={() => setOpenComments((current) => current === post.id ? null : post.id)}><MessageCircle size={14} /> {post.comments + (commentsByPost[post.id]?.length ?? 0)}</button></div>
            {repliesOpen && <div className="bv-comments"><span className="bv-kicker">{t('community.feed.discussionKicker')}</span>{(post.replies ?? []).map((comment, commentIndex) => <p className="bv-comment" key={`sample-${post.id}-${commentIndex}`}><strong><span className="bv-demo-tag">{t('community.sampleTag')}</span></strong>{comment}</p>)}{(commentsByPost[post.id] ?? []).map((comment, commentIndex) => <p className="bv-comment" key={`user-${post.id}-${commentIndex}`}><strong>{t('community.you')}</strong>{comment}</p>)}<form className="bv-comment-form" onSubmit={(event) => submitComment(event, post.id)}><label className="bv-sr-only" htmlFor={`reply-${post.id}`}>{t('community.feed.writeReply')}</label><input id={`reply-${post.id}`} name="comment" required maxLength={240} placeholder={t('community.feed.replyPlaceholder')} /><button type="submit" aria-label={t('community.feed.postReply')}><Send size={14} /></button></form></div>}
          </article>;
        })}</div>
      </section>

      <section id="bv-polls" className="bv-poll-section" aria-labelledby="bv-poll-title">
        <div className="bv-poll-copy"><span className="bv-kicker">{t('community.poll.kicker')}</span><h3 id="bv-poll-title">{t('community.poll.title')}</h3><p>{t('community.poll.lead')}</p><span className="bv-demo-tag">{t('community.poll.tag', { count: totalVotes })}</span></div>
        <div className="bv-poll-options" role="group" aria-label={t('community.poll.group')}>
          {content.pollOptions.map((option, index) => <button type="button" key={option.label} className={`bv-poll-option ${voted === index ? 'is-selected' : ''}`} onClick={() => setVoted(index)} aria-pressed={voted === index}>
            <span className="bv-poll-option-label"><span>{option.label}</span>{voted === index && <Check size={15} aria-label={t('community.poll.selected')} />}</span>
            <span className="bv-poll-track"><span style={{ width: `${Math.round((counts[index] / totalVotes) * 100)}%` }} /></span>
            <span className="bv-poll-share">{Math.round((counts[index] / totalVotes) * 100)}% <small>{t('community.poll.responses', { count: counts[index] })}</small></span>
          </button>)}
        </div>
        <div className="bv-proposal-block">
          <div className="bv-proposal-heading"><div><span className="bv-kicker">{t('community.proposal.kicker')}</span><p>{t('community.proposal.lead')}</p></div><button type="button" className="bv-text-button" aria-expanded={proposalOpen} onClick={() => setProposalOpen((open) => !open)}>{proposalOpen ? t('community.proposal.close') : t('community.proposal.open')} <Plus size={15} /></button></div>
          {proposalOpen && <form className="bv-proposal-form" onSubmit={submitProposal}>
            <label>{t('community.proposal.typeLabel')}<select value={proposalType} onChange={(event) => setProposalType(event.target.value as ProposalType)}><option value="poll">{t('community.proposal.typePoll')}</option><option value="event">{t('community.proposal.typeEvent')}</option></select></label>
            <label>{proposalType === 'poll' ? t('community.proposal.pollTitleLabel') : t('community.proposal.eventTitleLabel')}<input name="proposalTitle" required maxLength={100} placeholder={proposalType === 'poll' ? t('community.proposal.pollTitlePlaceholder') : t('community.proposal.eventTitlePlaceholder')} /></label>
            <label>{t('community.proposal.detailsLabel')}<textarea name="proposalDetails" required maxLength={280} rows={2} placeholder={t('community.proposal.detailsPlaceholder')} /></label>
            {proposalType === 'event' && <label>{t('community.proposal.placeLabel')}<input name="proposalPlace" required maxLength={100} placeholder={t('community.proposal.placePlaceholder')} /></label>}
            <div className="bv-proposal-foot"><span>{t('community.proposal.foot')}</span><button className="bv-action-button" type="submit"><Send size={14} /> {t('community.proposal.save')}</button></div>
          </form>}
          {proposalMessage && <p className="bv-proposal-confirmation" role="status"><Check size={14} /> {t(proposalMessage)}</p>}
          {proposals.length > 0 && <div className="bv-proposal-results" aria-label={t('community.proposal.savedLabel')}>{proposals.map((proposal) => <article className="bv-proposal-card" key={proposal.id}><span className="bv-demo-tag">{proposal.type === 'poll' ? t('community.proposal.localPoll') : t('community.proposal.localEvent')}</span><h4>{proposal.title}</h4><p>{proposal.details}</p>{proposal.place && <small>{proposal.place}</small>}<span className="bv-proposal-local">{t('community.proposal.localNote')}</span></article>)}</div>}
        </div>
      </section>

      <section id="bv-events" className="bv-community-section" aria-labelledby="bv-events-title">
        <div className="bv-section-heading"><div><span className="bv-kicker">{t('community.events.kicker')}</span><h3 id="bv-events-title">{t('community.events.title')}</h3><p>{t('community.events.lead')}</p></div><span className="bv-demo-tag">{t('community.events.tag')}</span></div>
        <div className="bv-event-list">{content.events.map((event, index) => <article className="bv-event" key={event.title}>
          <div className="bv-event-date"><CalendarDays size={17} /><span>{event.date}</span></div><div className="bv-event-body"><span className="bv-kicker">{event.kind} · 0{index + 1}</span><h4>{event.title}</h4><p>{event.detail}</p><span className="bv-event-place">{event.place}</span></div>
          <button type="button" className={`bv-interest ${interested.includes(index) ? 'is-active' : ''}`} onClick={() => setInterested((current) => current.includes(index) ? current.filter((id) => id !== index) : [...current, index])} aria-pressed={interested.includes(index)}>{interested.includes(index) ? t('community.events.saved') : t('community.events.save')} <ArrowUpRight size={15} /></button>
        </article>)}</div>
      </section>

      <section id="bv-preparedness" className="bv-preparedness" aria-labelledby="bv-preparedness-title">
        <div className="bv-prep-lead"><span className="bv-kicker">{t('community.prep.kicker')}</span><h3 id="bv-preparedness-title">{t('community.prep.title')}</h3><p>{t('community.prep.lead')}</p><a href="https://www.copeco.gob.hn/" target="_blank" rel="noreferrer">{t('community.prep.official')} <ArrowUpRight size={15} /></a></div>
        <div className="bv-checklist-grid">{content.preparedness.map((plan, planIndex) => <article className="bv-checklist" key={plan.title}><div className="bv-checklist-top"><span>0{planIndex + 1}</span><ShieldCheck size={17} aria-hidden="true" /></div><h4>{plan.title}</h4>{plan.items.map((item, itemIndex) => { const key = `${planIndex}-${itemIndex}`; const isChecked = checked.includes(key); return <label className={`bv-check-item ${isChecked ? 'is-checked' : ''}`} key={key}><input type="checkbox" checked={isChecked} onChange={() => toggleCheck(key)} /><span className="bv-check-box"><Check size={12} /></span><span>{item}</span></label>; })}</article>)}</div>
        <p className="bv-safety-note"><ShieldCheck size={15} /> {t('community.prep.note')}</p>
      </section>

      <section id="bv-learning" className="bv-community-section" aria-labelledby="bv-learning-title">
        <div className="bv-section-heading"><div><span className="bv-kicker">{t('community.learn.kicker')}</span><h3 id="bv-learning-title">{t('community.learn.title')}</h3><p>{t('community.learn.lead')}</p></div><a className="bv-text-link" href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">{t('community.learn.link')} <ArrowUpRight size={15} /></a></div>
        <div className="bv-learning-grid">{content.learningCards.map(({ icon: Icon, eyebrow, title, body }) => <article className="bv-learning-card" key={eyebrow}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /><span className="bv-kicker">{eyebrow}</span><h4>{title}</h4><p>{body}</p></article>)}</div>
      </section>

      <section id="bv-journal" className="bv-journal" aria-labelledby="bv-journal-title">
        <div><span className="bv-kicker">{t('community.sources.kicker')}</span><h3 id="bv-journal-title">{t('community.sources.title')}</h3><p>{t('community.sources.lead')}</p><article className="bv-mission-card"><span className="bv-kicker">{t('community.sources.missionKicker')}</span><h4>{t('community.sources.missionTitle')}</h4><p>{t('community.sources.missionBody')}</p><a href="https://nisar.jpl.nasa.gov/mission/mission-concept/" target="_blank" rel="noreferrer">{t('community.sources.missionLink')} <ArrowUpRight size={14} /></a></article></div>
        <div className="bv-source-list">{content.sources.map((source, index) => <a key={source.href} href={source.href} target={source.href.startsWith('http') ? '_blank' : undefined} rel={source.href.startsWith('http') ? 'noreferrer' : undefined}><span className="bv-source-number">0{index + 1}</span><span><small>{source.kind}</small>{source.title}</span><ArrowUpRight size={16} /></a>)}</div>
      </section>

      <footer className="bv-community-footer"><span className="bv-kicker">{t('community.footer.kicker')}</span><span>{t('community.footer.note')}</span></footer>
    </div>
  );
}

export default CommunityHub;
