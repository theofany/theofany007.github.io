(function () {
	const root = document.documentElement;

	// Footer year
	document.getElementById('year').textContent = new Date().getFullYear();

	// Theme toggle (light / dark), remembered per browser
	const isDark = () =>
		root.dataset.theme ? root.dataset.theme === 'dark'
			: window.matchMedia('(prefers-color-scheme: dark)').matches;

	document.getElementById('themeToggle').addEventListener('click', () => {
		const next = isDark() ? 'light' : 'dark';
		root.dataset.theme = next;
		try { localStorage.setItem('theme', next); } catch (e) {}
	});

	// Nav border once scrolled
	const nav = document.querySelector('.nav');
	const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });

	// Highlight the nav link of the section in view
	const links = [...document.querySelectorAll('.nav__links a')];
	const sections = links.map(a => document.querySelector(a.getAttribute('href')));
	const spy = new IntersectionObserver(entries => {
		entries.forEach(entry => {
			if (!entry.isIntersecting) return;
			links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
		});
	}, { rootMargin: '-45% 0px -50% 0px' });
	sections.forEach(s => s && spy.observe(s));

	// Reveal on scroll
	const revealTargets = document.querySelectorAll('.section__head, .about, .role, .edu, .project, .articles, .outlets, .contact__title');
	const reveal = new IntersectionObserver(entries => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('is-visible');
				reveal.unobserve(entry.target);
			}
		});
	}, { threshold: 0.12 });
	revealTargets.forEach(el => { el.classList.add('reveal'); reveal.observe(el); });

	// Latest Medium articles (falls back to the static link if the feed fails)
	const MEDIUM_USER = 'theofany007';
	const MAX_ARTICLES = 5;
	const list = document.getElementById('articles');
	const fallback = list.innerHTML;

	list.innerHTML = Array.from({ length: 3 }, () =>
		'<li class="article article--loading"><a><span class="mono article__date">&nbsp;</span><span class="article__title"></span><span></span></a></li>'
	).join('');

	const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
	const formatDate = d => new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

	const feed = 'https://medium.com/feed/@' + MEDIUM_USER;
	fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed))
		.then(r => r.json())
		.then(data => {
			if (data.status !== 'ok' || !data.items || !data.items.length) throw new Error('empty feed');
			list.innerHTML = data.items.slice(0, MAX_ARTICLES).map(item => `
				<li class="article">
					<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
						<span class="mono article__date">${formatDate(item.pubDate)}</span>
						<span class="article__title">${escapeHtml(item.title)}</span>
						<span class="article__arrow">↗</span>
					</a>
				</li>`).join('');
		})
		.catch(() => { list.innerHTML = fallback; });
})();
