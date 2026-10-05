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

	// Project modal: click a card with media to view it one item at a time ("1 / N")
	const modal = document.createElement('div');
	modal.className = 'modal';
	modal.setAttribute('role', 'dialog');
	modal.setAttribute('aria-modal', 'true');
	modal.innerHTML = `
		<div class="modal__panel">
			<button class="modal__close" aria-label="Close">×</button>
			<div class="modal__stage">
				<button class="modal__nav modal__prev" aria-label="Previous">‹</button>
				<button class="modal__nav modal__next" aria-label="Next">›</button>
			</div>
			<div class="modal__info">
				<h3 class="modal__title"></h3>
				<span class="mono modal__count"></span>
			</div>
		</div>`;
	document.body.appendChild(modal);

	const stage = modal.querySelector('.modal__stage');
	const prevBtn = modal.querySelector('.modal__prev');
	const nextBtn = modal.querySelector('.modal__next');
	let items = [], index = 0, lastFocus = null;

	const show = i => {
		index = (i + items.length) % items.length;
		stage.querySelectorAll('img, video').forEach(el => el.remove());
		const el = items[index].cloneNode(true);
		if (el.tagName === 'VIDEO') Object.assign(el, { muted: true, loop: true, playsInline: true, autoplay: true, controls: true });
		stage.prepend(el);
		modal.querySelector('.modal__count').textContent = `${index + 1} / ${items.length}`;
		prevBtn.hidden = nextBtn.hidden = items.length < 2;
	};

	const openModal = card => {
		items = [...card.querySelector('.project__gallery').content.children];
		modal.querySelector('.modal__title').textContent = card.querySelector('h3').textContent;
		lastFocus = card;
		show(0);
		modal.classList.add('is-open');
		document.body.classList.add('no-scroll');
		modal.querySelector('.modal__close').focus();
	};

	const closeModal = () => {
		if (!modal.classList.contains('is-open')) return;
		modal.classList.remove('is-open');
		document.body.classList.remove('no-scroll');
		stage.querySelectorAll('img, video').forEach(el => el.remove());
		if (lastFocus) lastFocus.focus();
	};

	document.querySelectorAll('.project--media').forEach(card => {
		card.addEventListener('click', e => { if (!e.target.closest('a')) openModal(card); });
		card.addEventListener('keydown', e => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
		});
	});

	prevBtn.addEventListener('click', () => show(index - 1));
	nextBtn.addEventListener('click', () => show(index + 1));
	modal.querySelector('.modal__close').addEventListener('click', closeModal);
	modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
	document.addEventListener('keydown', e => {
		if (!modal.classList.contains('is-open')) return;
		if (e.key === 'Escape') closeModal();
		if (e.key === 'ArrowLeft' && items.length > 1) show(index - 1);
		if (e.key === 'ArrowRight' && items.length > 1) show(index + 1);
	});

	// Swipe on touch screens
	let touchX = null;
	stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
	stage.addEventListener('touchend', e => {
		if (touchX === null || items.length < 2) return;
		const dx = e.changedTouches[0].clientX - touchX;
		if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
		touchX = null;
	});

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
