const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'فتح القائمة' : 'إغلاق القائمة');
  navigation?.classList.toggle('is-open', !isOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'فتح القائمة');
    navigation?.classList.remove('is-open');
  });
});

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const backstageGallery = document.querySelector('#backstage-gallery');
if (backstageGallery) {
  fetch('/backstage.json')
    .then((response) => {
      if (!response.ok) throw new Error('تعذّر تحميل معرض الكواليس');
      return response.json();
    })
    .then((images) => {
      if (!Array.isArray(images) || images.length === 0) throw new Error('لا توجد صور');
      backstageGallery.innerHTML = images.map((image, index) => {
        const src = String(image.src || '');
        if (!src.startsWith('manus-storage/')) return '';
        const alt = escapeHtml(image.alt || `صورة من كواليس المعرض ${index + 1}`);
        const safeSrc = escapeHtml(src);
        return `<a class="media-card" href="${safeSrc}" target="_blank" rel="noopener noreferrer" aria-label="فتح الصورة ${index + 1} بالحجم الكامل">
          <img src="${safeSrc}" alt="${alt}" loading="lazy" decoding="async" />
          <span class="media-card-caption">من كواليس المعرض · ${String(index + 1).padStart(2, '0')}</span>
        </a>`;
      }).join('');
    })
    .catch(() => {
      backstageGallery.innerHTML = '<p class="media-loading">ستُضاف صور الكواليس هنا.</p>';
    });
}

const volunteerGrid = document.querySelector('#volunteer-grid');
const teamSearch = document.querySelector('#team-search');
const teamFilter = document.querySelector('#team-filter');
const teamTotal = document.querySelector('#team-total');
const loadMoreButton = document.querySelector('#team-load-more');
const foundersGrid = document.querySelector('#founders-grid');
const administrationGrid = document.querySelector('#administration-grid');
const foundersSection = document.querySelector('#founders-section');
const administrationSection = document.querySelector('#administration-section');

if (volunteerGrid) {
  fetch('/volunteers.json')
    .then((response) => {
      if (!response.ok) throw new Error('تعذّر تحميل بيانات الفريق');
      return response.json();
    })
    .then((people) => {
      if (!Array.isArray(people)) throw new Error('بيانات الفريق غير صالحة');
      const pageSize = 12;
      let visibleCount = pageSize;
      const teamOrder = ['المؤسسون', 'الإدارة', 'العمليات', 'الشراكات', 'الفريق التقني', 'الإعلام', 'تنظيم الجمهور', 'الضيافة', 'الفريق التنظيمي'];
      const teamRank = new Map(teamOrder.map((team, index) => [team, index]));
      const priority = (position = '') => /قيادة|مؤسس|رئيس|مدير|co-founder|general leader/i.test(position) ? 0 : /تسجيل/.test(position) ? 1 : 2;
      const orderedPeople = people.map((person, index) => ({ person, index }))
        .sort((a, b) => (teamRank.get(a.person.team) ?? 99) - (teamRank.get(b.person.team) ?? 99)
          || priority(a.person.position) - priority(b.person.position) || a.index - b.index)
        .map(({ person }) => person);
      const categories = [...new Set(orderedPeople.map((person) => person.team).filter(Boolean))]
        .sort((a, b) => (teamRank.get(a) ?? 99) - (teamRank.get(b) ?? 99) || a.localeCompare(b, 'ar'));
      categories.forEach((team) => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter?.append(option);
      });
      if (teamTotal) teamTotal.textContent = String(people.length);

      const renderCard = (person) => {
        const name = escapeHtml(person.name || 'عضو الفريق');
        const team = escapeHtml(person.team || 'الفريق التنظيمي');
        const position = escapeHtml(person.position || 'عضو الفريق');
        const photo = String(person.photo || '');
        const ratio = Number(person.photoRatio);
        const photoRatio = Number.isFinite(ratio) && ratio >= 0.55 && ratio <= 1.3 ? ratio.toFixed(4) : '0.92';
        const rawPosition = String(person.photoPosition || '50% 24%');
        const positionMatch = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(rawPosition);
        const photoPosition = positionMatch && Number(positionMatch[1]) <= 100 && Number(positionMatch[2]) <= 100
          ? `${positionMatch[1]}% ${positionMatch[2]}%` : '50% 24%';
        const initials = escapeHtml((person.name || 'ف').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join(''));
        const portrait = photo.startsWith('manus-storage/')
          ? `<img src="${escapeHtml(photo)}" alt="صورة ${name}" loading="lazy" decoding="async" />`
          : `<span class="volunteer-initials" aria-hidden="true">${initials}</span>`;
        return `<article class="volunteer-card"><div class="volunteer-avatar" style="--volunteer-photo-ratio:${photoRatio};--volunteer-photo-position:${photoPosition}">${portrait}</div><div class="volunteer-meta"><h3>${name}</h3><p>${position}</p><span class="volunteer-team">${team}</span></div></article>`;
      };

      const render = () => {
        const query = (teamSearch?.value || '').trim().toLocaleLowerCase('ar');
        const selectedTeam = teamFilter?.value || '';
        const matches = orderedPeople.filter((person) => {
          const searchable = `${person.name || ''} ${person.team || ''} ${person.position || ''}`.toLocaleLowerCase('ar');
          return (!query || searchable.includes(query)) && (!selectedTeam || person.team === selectedTeam);
        });
        const founders = matches.filter((person) => person.leadershipSection === 'founders')
          .sort((a, b) => (a.leadershipOrder || 99) - (b.leadershipOrder || 99));
        const administration = matches.filter((person) => person.leadershipSection === 'administration')
          .sort((a, b) => (a.leadershipOrder || 99) - (b.leadershipOrder || 99));
        const regularMatches = matches.filter((person) => !person.leadershipSection);
        if (foundersGrid) foundersGrid.innerHTML = founders.map(renderCard).join('');
        if (administrationGrid) administrationGrid.innerHTML = administration.map(renderCard).join('');
        if (foundersSection) foundersSection.hidden = founders.length === 0;
        if (administrationSection) administrationSection.hidden = administration.length === 0;
        const visiblePeople = regularMatches.slice(0, visibleCount);
        const groupCounts = new Map();
        regularMatches.forEach((person) => groupCounts.set(person.team, (groupCounts.get(person.team) || 0) + 1));
        let previousTeam = '';
        volunteerGrid.innerHTML = visiblePeople.map((person) => {
          const team = escapeHtml(person.team || 'الفريق التنظيمي');
          const heading = person.team !== previousTeam
            ? `<h3 class="team-group-heading"><span>${team}</span><small>${groupCounts.get(person.team) || 0} أعضاء</small></h3>`
            : '';
          previousTeam = person.team;
          return `${heading}${renderCard(person)}`;
        }).join('');
        if (matches.length === 0) volunteerGrid.innerHTML = '<p class="media-loading">ما لقينا نتائج مطابقة.</p>';
        if (loadMoreButton) loadMoreButton.hidden = regularMatches.length <= visibleCount;
      };

      teamSearch?.addEventListener('input', () => { visibleCount = pageSize; render(); });
      teamFilter?.addEventListener('change', () => { visibleCount = pageSize; render(); });
      loadMoreButton?.addEventListener('click', () => { visibleCount += pageSize; render(); });
      render();
    })
    .catch(() => {
      volunteerGrid.innerHTML = '<p class="media-loading">تعذّر تحميل قائمة الفريق حالياً.</p>';
    });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const navLinks = [...document.querySelectorAll('.primary-nav a')];
const trackedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && trackedSections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          const selected = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-current', selected);
          if (selected) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    });
  }, { rootMargin: '-34% 0px -58% 0px' });
  trackedSections.forEach((section) => sectionObserver.observe(section));
}
