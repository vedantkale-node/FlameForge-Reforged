// FlameForge Production Client Script v2.1 (Matte Dark Diluc Suite)
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const home = document.getElementById('nav-0');
    const characters = document.getElementById('nav-1');
    const weapons = document.getElementById('nav-2');
    const artifacts = document.getElementById('nav-3');
    const admin = document.getElementById('nav-4');
    const people = document.getElementById('nav-5');
    const settings = document.getElementById('nav-6');
    const scraperStudio = document.getElementById('nav-8');
    const heading = document.getElementById('heading');
    const closeBtn = document.getElementById('btn-modal-close');
    const logoutModal = document.getElementById('modal');
    const navLogoutBtn = document.getElementById('nav-logout');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar-main');
    const mainContent = document.getElementById('content');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebarCollapseIcon = document.getElementById('sidebarCollapseIcon');
    const copyButtons = document.querySelectorAll('.copyBtn');
    const deleteBtn = document.getElementById('btn-delete');
    const btnQuickOpenStudio = document.getElementById('btnQuickOpenStudio');

    const TITLES = {
        0: 'Overview',
        1: 'Characters Archive',
        2: 'Weapons Armory',
        3: 'Artifacts Reliquary',
        4: 'Database Control Center',
        5: 'User Directory',
        6: 'System Configuration',
        8: '⚡ HoYoWiki Scraper Studio'
    };

    function showTitle(title) {
        if (heading) heading.innerText = title;
    }

    function toggleActive(navOrder) {
        for (let i = 0; i <= 8; i++) {
            const el = document.getElementById(`nav-${i}`);
            if (el) {
                el.classList.remove('bg-[#21262d]', 'text-white', 'border-l-2', 'border-red-500');
            }
        }
        const currentNav = document.getElementById(`nav-${navOrder}`);
        if (currentNav) {
            currentNav.classList.add('bg-[#21262d]', 'text-white', 'border-l-2', 'border-red-500');
        }
        localStorage.setItem('activeNav', navOrder);
    }

    function toggleContent(contentOrder) {
        for (let i = 0; i <= 8; i++) {
            const el = document.getElementById(`content-${i}`);
            if (el) el.style.display = 'none';
        }
        const targetContent = document.getElementById(`content-${contentOrder}`);
        if (targetContent) targetContent.style.display = 'block';
        localStorage.setItem('activeContent', contentOrder);
    }

    function selectTab(order) {
        toggleContent(order);
        toggleActive(order);
        const title = TITLES[order] || 'Overview';
        showTitle(title);
        localStorage.setItem('activeHeader', title);
        if (sidebar) {
            sidebar.classList.remove('sidebar-active', 'sidebar-mob');
        }
        body.classList.remove('body-overflow');
    }

    function loadDefaults() {
        let activeContent = localStorage.getItem('activeContent');
        if (activeContent === null || isNaN(activeContent) || parseInt(activeContent, 10) === 7) {
            activeContent = 0;
        } else {
            activeContent = parseInt(activeContent, 10);
        }
        selectTab(activeContent);

        // Restore Sidebar Collapsed State (Desktop)
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed && sidebar && mainContent) {
            sidebar.classList.add('sidebar-collapsed');
            mainContent.classList.add('content-expanded');
            if (sidebarCollapseIcon) sidebarCollapseIcon.className = 'ti ti-layout-sidebar-left-expand text-lg';
        }
    }

    // Sidebar Collapse Toggle (Desktop)
    if (btnToggleSidebar && sidebar && mainContent) {
        btnToggleSidebar.addEventListener('click', () => {
            const collapsed = sidebar.classList.toggle('sidebar-collapsed');
            mainContent.classList.toggle('content-expanded');
            localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false');
            if (sidebarCollapseIcon) {
                sidebarCollapseIcon.className = collapsed ? 'ti ti-layout-sidebar-left-expand text-lg' : 'ti ti-layout-sidebar-left-collapse text-lg';
            }
        });
    }

    // Mobile Hamburger Toggle
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('sidebar-active');
            body.classList.toggle('body-overflow');
        });
    }

    // Auto-close sidebar on mobile when any option is selected
    const allSidebarButtons = document.querySelectorAll('.nav-btn, .sidebar-btn, #nav-logout');
    allSidebarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('sidebar-active', 'sidebar-mob');
                body.classList.remove('body-overflow');
            }
        });
    });

    // Close on outside click for mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('sidebar-active')) {
            if (!sidebar.contains(e.target) && !hamburgerBtn?.contains(e.target)) {
                sidebar.classList.remove('sidebar-active', 'sidebar-mob');
                body.classList.remove('body-overflow');
            }
        }
    });

    // Sidebar navigation bindings
    if (home) home.addEventListener('click', () => selectTab(0));
    if (characters) characters.addEventListener('click', () => selectTab(1));
    if (weapons) weapons.addEventListener('click', () => selectTab(2));
    if (artifacts) artifacts.addEventListener('click', () => selectTab(3));
    if (admin) admin.addEventListener('click', () => selectTab(4));
    if (people) people.addEventListener('click', () => selectTab(5));
    if (settings) settings.addEventListener('click', () => selectTab(6));
    if (scraperStudio) scraperStudio.addEventListener('click', () => selectTab(8));
    if (btnQuickOpenStudio) btnQuickOpenStudio.addEventListener('click', () => selectTab(8));

    // ----------------------------------------------------
    // Toast Notifications
    // ----------------------------------------------------
    let toastTimer = null;
    let toastErrorTimer = null;

    window.showAlertBox = function(msg) {
        const box = document.getElementById('alertBox');
        if (!box) return;
        box.innerHTML = `<i class="ti ti-circle-check mr-2 text-base"></i><span>${msg}</span>`;
        box.classList.add('toast-active');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            box.classList.remove('toast-active');
        }, 3500);
    };

    window.showAlertErrorBox = function(msg) {
        const box = document.getElementById('alertBoxError');
        if (!box) return;
        const formattedMsg = String(msg || 'An error occurred').replace(/\n/g, '<br/>');
        box.innerHTML = `<div class="flex items-start text-left"><i class="ti ti-alert-triangle mr-2 text-base shrink-0 mt-0.5"></i><span class="leading-relaxed font-semibold">${formattedMsg}</span></div>`;
        box.classList.add('toast-active');
        if (toastErrorTimer) clearTimeout(toastErrorTimer);
        toastErrorTimer = setTimeout(() => {
            box.classList.remove('toast-active');
        }, 4500);
    };

    // ----------------------------------------------------
    // Search & Filter Logic for Each Section
    // ----------------------------------------------------
    // 1. Characters Filter
    const charSearchInput = document.getElementById('charSearchInput');
    const charVisionFilter = document.getElementById('charVisionFilter');
    const charRarityFilter = document.getElementById('charRarityFilter');
    const charVisibleCount = document.getElementById('charVisibleCount');

    function filterCharacters() {
        const query = (charSearchInput?.value || '').toLowerCase().trim();
        const vision = (charVisionFilter?.value || '').toLowerCase().trim();
        const rarity = (charRarityFilter?.value || '').trim();

        const cards = document.querySelectorAll('.char-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardName = (card.dataset.name || '').toLowerCase();
            const cardVision = (card.dataset.vision || '').toLowerCase();
            const cardRarity = (card.dataset.rarity || '').trim();
            const cardWeapon = (card.dataset.weapon || '').toLowerCase();

            const matchQuery = !query || cardName.includes(query) || cardVision.includes(query) || cardWeapon.includes(query);
            const matchVision = !vision || cardVision === vision;
            const matchRarity = !rarity || cardRarity === rarity;

            if (matchQuery && matchVision && matchRarity) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (charVisibleCount) charVisibleCount.innerText = visibleCount;
    }

    if (charSearchInput) charSearchInput.addEventListener('input', filterCharacters);
    if (charVisionFilter) charVisionFilter.addEventListener('change', filterCharacters);
    if (charRarityFilter) charRarityFilter.addEventListener('change', filterCharacters);

    // 2. Weapons Filter
    const weapSearchInput = document.getElementById('weapSearchInput');
    const weapFamilyFilter = document.getElementById('weapFamilyFilter');
    const weapRarityFilter = document.getElementById('weapRarityFilter');
    const weapVisibleCount = document.getElementById('weapVisibleCount');

    function filterWeapons() {
        const query = (weapSearchInput?.value || '').toLowerCase().trim();
        const family = (weapFamilyFilter?.value || '').toLowerCase().trim();
        const rarity = (weapRarityFilter?.value || '').trim();

        const cards = document.querySelectorAll('.weap-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardName = (card.dataset.name || '').toLowerCase();
            const cardFamily = (card.dataset.family || '').toLowerCase();
            const cardRarity = (card.dataset.rarity || '').trim();

            const matchQuery = !query || cardName.includes(query) || cardFamily.includes(query);
            const matchFamily = !family || cardFamily === family;
            const matchRarity = !rarity || cardRarity === rarity;

            if (matchQuery && matchFamily && matchRarity) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (weapVisibleCount) weapVisibleCount.innerText = visibleCount;
    }

    if (weapSearchInput) weapSearchInput.addEventListener('input', filterWeapons);
    if (weapFamilyFilter) weapFamilyFilter.addEventListener('change', filterWeapons);
    if (weapRarityFilter) weapRarityFilter.addEventListener('change', filterWeapons);

    // 3. Artifacts Filter
    const artSearchInput = document.getElementById('artSearchInput');
    const artVisibleCount = document.getElementById('artVisibleCount');

    function filterArtifacts() {
        const query = (artSearchInput?.value || '').toLowerCase().trim();
        const cards = document.querySelectorAll('.art-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardName = (card.dataset.name || '').toLowerCase();
            if (!query || cardName.includes(query)) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (artVisibleCount) artVisibleCount.innerText = visibleCount;
    }

    if (artSearchInput) artSearchInput.addEventListener('input', filterArtifacts);

    // ----------------------------------------------------
    // VIEW INFO / DETAILS MODAL LOGIC
    // ----------------------------------------------------
    const modalViewInfo = document.getElementById('modal-view-info');
    const btnCloseViewInfo = document.getElementById('btn-close-view-info');
    const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
    let currentModalData = null;

    if (modalTabBtns) {
        modalTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.dataset.tab;
                modalTabBtns.forEach(b => {
                    b.classList.remove('bg-red-600/20', 'text-red-300', 'border', 'border-red-500/30');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('bg-red-600/20', 'text-red-300', 'border', 'border-red-500/30');
                btn.classList.remove('text-slate-400');

                document.querySelectorAll('.modal-tab-pane').forEach(pane => {
                    pane.classList.add('hidden');
                });
                const targetPane = document.getElementById(targetTabId);
                if (targetPane) targetPane.classList.remove('hidden');
            });
        });
    }

    if (btnCloseViewInfo && modalViewInfo) {
        btnCloseViewInfo.addEventListener('click', () => {
            modalViewInfo.classList.add('hidden');
        });
    }

    const btnModalCopyJson = document.getElementById('btn-modal-copy-json');
    if (btnModalCopyJson) {
        btnModalCopyJson.addEventListener('click', () => {
            if (currentModalData) {
                navigator.clipboard.writeText(JSON.stringify(currentModalData, null, 2))
                    .then(() => window.showAlertBox('Full JSON copied to clipboard!'))
                    .catch(() => window.showAlertErrorBox('Could not copy JSON'));
            }
        });
    }

    // Attach View Info click event to all .view-info-btn or card clicks
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('.view-info-btn, .char-card, .weap-card, .art-card');
        if (!target) return;

        const category = target.dataset.category;
        const id = target.dataset.id;
        if (!category || !id || !modalViewInfo) return;

        try {
            const res = await axios.get(`/dashboard/entity-detail/${category}/${id}`);
            if (!res.data || !res.data.success || !res.data.data) {
                throw new Error('Failed to retrieve entity data');
            }

            const data = res.data.data;
            currentModalData = data;

            // Header Elements
            const modalImg = document.getElementById('modalInfoImg');
            const modalName = document.getElementById('modalInfoName');
            const modalSubtitle = document.getElementById('modalInfoSubtitle');
            const modalRarity = document.getElementById('modalInfoRarity');
            const modalVision = document.getElementById('modalInfoVisionBadge');
            const modalTags = document.getElementById('modalInfoTags');
            const modalDesc = document.getElementById('modalInfoDesc');
            const modalAttrGrid = document.getElementById('modalInfoAttrGrid');
            const modalTalents = document.getElementById('modalInfoTalentsList');
            const modalConstellations = document.getElementById('modalInfoConstellationsList');
            const modalStories = document.getElementById('modalInfoStoriesList');
            const modalVoice = document.getElementById('modalInfoVoiceList');
            const modalJson = document.getElementById('modalInfoJsonCode');

            if (modalImg) modalImg.src = data.images?.profile || data.images?.icon || data.fullSet?.flower?.icon || '/assets/images/characters.webp';
            if (modalName) modalName.innerText = data.name || 'Unnamed Entity';
            if (modalSubtitle) modalSubtitle.innerText = `${data.title ? data.title.join(', ') : (data.family || 'Genshin Impact')} • ${data.region || 'Teyvat'}`;
            if (modalRarity) modalRarity.innerText = `${data.rarity ? (Array.isArray(data.rarity) ? data.rarity.join('/') : data.rarity) : 5}★`;
            if (modalVision) modalVision.innerText = data.vision || data.family || category.toUpperCase();
            if (modalDesc) modalDesc.innerText = data.desc || (data.effect ? `2-Pc: ${data.effect.twoPc}\n4-Pc: ${data.effect.fourPc}` : 'No description available.');

            // Tags
            if (modalTags) {
                let tagsHtml = '';
                if (data.vision) tagsHtml += `<span class="px-2 py-0.5 rounded-md bg-red-600/20 text-red-300 border border-red-500/30 font-bold">${data.vision}</span>`;
                if (data.weapon) tagsHtml += `<span class="px-2 py-0.5 rounded-md bg-amber-600/20 text-amber-300 border border-amber-500/30">${data.weapon}</span>`;
                if (data.family) tagsHtml += `<span class="px-2 py-0.5 rounded-md bg-amber-600/20 text-amber-300 border border-amber-500/30">${data.family}</span>`;
                if (data.region) tagsHtml += `<span class="px-2 py-0.5 rounded-md bg-[#21262d] text-slate-300 border border-[#30363d]">${Array.isArray(data.region) ? data.region.join(', ') : data.region}</span>`;
                if (data.versionRelease) tagsHtml += `<span class="px-2 py-0.5 rounded-md bg-[#21262d] text-slate-300 border border-[#30363d]">v${data.versionRelease}</span>`;
                modalTags.innerHTML = tagsHtml;
            }

            // Overview Attributes Grid
            if (modalAttrGrid) {
                let gridHtml = '';
                const isCharacter = (category === 'character' || category === 'characters');
                const isWeapon = (category === 'weapon' || category === 'weapons');
                const isArtifact = (category === 'artifact' || category === 'artifacts');

                if (isCharacter) {
                    if (data.birthday) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-red-400">Birthday</p><p class="font-semibold text-slate-200 mt-0.5">${data.birthday}</p></div>`;
                    if (data.constellation) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-red-400">Constellation</p><p class="font-semibold text-slate-200 mt-0.5">${data.constellation}</p></div>`;
                    if (data.affiliation) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-red-400">Affiliation</p><p class="font-semibold text-slate-200 mt-0.5">${Array.isArray(data.affiliation) ? data.affiliation.join(', ') : data.affiliation}</p></div>`;
                    if (data.cv) {
                        gridHtml += `<div class="col-span-2 sm:col-span-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1"><p class="text-[10px] uppercase font-bold text-amber-400">Voice Actors (CV)</p><div class="flex flex-wrap gap-3 text-xs text-slate-300 font-medium"><span>🎙️ EN: ${data.cv.en || 'N/A'}</span><span>🎙️ JP: ${data.cv.jp || 'N/A'}</span><span>🎙️ CN: ${data.cv.cn || 'N/A'}</span><span>🎙️ KR: ${data.cv.kr || 'N/A'}</span></div></div>`;
                    }
                } else if (isWeapon) {
                    if (data.baseAtk) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-amber-400">Base ATK (Lv 1)</p><p class="font-semibold text-slate-200 mt-0.5">${data.baseAtk}</p></div>`;
                    if (data.statsTable && data.statsTable.length > 0) {
                        const maxStat = data.statsTable[data.statsTable.length - 1];
                        gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-amber-400">Max ATK (${maxStat.level || 'Lv 90'})</p><p class="font-semibold text-slate-200 mt-0.5">${maxStat.baseAtk || 'N/A'}</p></div>`;
                    }
                    if (data.subStatType) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-amber-400">${data.subStatType}</p><p class="font-semibold text-slate-200 mt-0.5">${data.baseSubStat || 'N/A'}</p></div>`;
                    if (data.family) gridHtml += `<div class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"><p class="text-[10px] uppercase font-bold text-amber-400">Weapon Type</p><p class="font-semibold text-slate-200 mt-0.5">${data.family}</p></div>`;
                    if (data.passive) {
                        gridHtml += `<div class="col-span-2 sm:col-span-3 p-3.5 rounded-xl bg-[#0d1117] border border-amber-500/30 space-y-1"><p class="text-[10px] uppercase font-bold text-amber-400">Weapon Passive: ${data.affix || 'Refinement Skill'}</p><p class="text-xs text-slate-200 leading-relaxed">${data.passive}</p></div>`;
                    }
                } else if (isArtifact) {
                    if (data.effect) {
                        if (data.effect.onePc) gridHtml += `<div class="col-span-2 sm:col-span-3 p-3 rounded-xl bg-[#0d1117] border border-indigo-500/30 space-y-0.5"><p class="text-[10px] uppercase font-bold text-indigo-400">1-Piece Set Bonus</p><p class="text-xs text-slate-200 leading-relaxed">${data.effect.onePc}</p></div>`;
                        if (data.effect.twoPc) gridHtml += `<div class="col-span-2 sm:col-span-3 p-3 rounded-xl bg-[#0d1117] border border-indigo-500/30 space-y-0.5"><p class="text-[10px] uppercase font-bold text-indigo-400">2-Piece Set Bonus</p><p class="text-xs text-slate-200 leading-relaxed">${data.effect.twoPc}</p></div>`;
                        if (data.effect.fourPc) gridHtml += `<div class="col-span-2 sm:col-span-3 p-3 rounded-xl bg-[#0d1117] border border-indigo-500/30 space-y-0.5"><p class="text-[10px] uppercase font-bold text-indigo-400">4-Piece Set Bonus</p><p class="text-xs text-slate-200 leading-relaxed">${data.effect.fourPc}</p></div>`;
                    }
                    if (data.fullSet) {
                        const pieces = [
                            { label: 'Flower of Life', item: data.fullSet.flower },
                            { label: 'Plume of Death', item: data.fullSet.plume },
                            { label: 'Sands of Eon', item: data.fullSet.sands },
                            { label: 'Goblet of Eonothem', item: data.fullSet.goblet },
                            { label: 'Circlet of Logos', item: data.fullSet.circlet }
                        ].filter(p => p.item && (p.item.title || p.item.name || p.item.icon));

                        if (pieces.length > 0) {
                            gridHtml += `<div class="col-span-2 sm:col-span-3 p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2"><p class="text-[10px] uppercase font-bold text-indigo-300">Set Relic Pieces (${pieces.length})</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">${pieces.map(p => `<div class="flex items-center gap-2.5 p-2 rounded-lg bg-[#161b22] border border-[#30363d]"><img src="${p.item.icon || '/assets/images/artifacts.webp'}" class="w-8 h-8 rounded-lg object-cover border border-[#30363d] bg-[#0d1117]"><div><p class="font-bold text-white text-[11px]">${p.item.title || p.item.name}</p><p class="text-[9px] text-slate-400">${p.label}</p></div></div>`).join('')}</div></div>`;
                        }
                    }
                }

                modalAttrGrid.innerHTML = gridHtml;
            }

            // Character-Only Tabs Visibility Control
            const isCharacter = (category === 'character' || category === 'characters');
            const tabTalentsBtn = document.querySelector('.modal-tab-btn[data-tab="tab-talents"]');
            const tabConstellationsBtn = document.querySelector('.modal-tab-btn[data-tab="tab-constellations"]');
            const tabStoriesBtn = document.querySelector('.modal-tab-btn[data-tab="tab-stories"]');

            if (tabTalentsBtn) tabTalentsBtn.style.display = isCharacter ? '' : 'none';
            if (tabConstellationsBtn) tabConstellationsBtn.style.display = isCharacter ? '' : 'none';
            if (tabStoriesBtn) tabStoriesBtn.style.display = isCharacter ? '' : 'none';

            // Talents (Characters only)
            if (modalTalents && isCharacter) {
                if (data.talents && data.talents.length > 0) {
                    modalTalents.innerHTML = data.talents.map(t => `
                        <div class="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-white text-xs">${t.name}</span>
                                <span class="px-2 py-0.2 rounded bg-red-600/20 text-red-300 text-[10px] font-semibold">${t.type || 'Combat Talent'}</span>
                            </div>
                            <p class="text-xs text-slate-300 leading-relaxed">${t.desc}</p>
                        </div>
                    `).join('');
                } else {
                    modalTalents.innerHTML = '<p class="text-xs text-slate-400">No combat talents available.</p>';
                }
            }

            // Constellations (Characters only)
            if (modalConstellations && isCharacter) {
                if (data.constellations && data.constellations.length > 0) {
                    modalConstellations.innerHTML = data.constellations.map(c => `
                        <div class="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                            <span class="font-bold text-amber-300 text-xs">C${c.level}: ${c.name}</span>
                            <p class="text-xs text-slate-300 leading-relaxed">${c.desc}</p>
                        </div>
                    `).join('');
                } else {
                    modalConstellations.innerHTML = '<p class="text-xs text-slate-400">No constellations available.</p>';
                }
            }

            // Stories & Voice lines (Characters only)
            if (modalStories && isCharacter) {
                if (data.stories && data.stories.length > 0) {
                    modalStories.innerHTML = data.stories.map(s => `
                        <details class="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] cursor-pointer">
                            <summary class="font-bold text-white text-xs">${s.title}</summary>
                            <p class="mt-2 text-xs text-slate-300 leading-relaxed whitespace-pre-line border-t border-[#30363d] pt-2">${s.desc}</p>
                        </details>
                    `).join('');
                } else {
                    modalStories.innerHTML = '<p class="text-xs text-slate-400">No character stories available.</p>';
                }
            }

            if (modalVoice && isCharacter) {
                if (data.voiceLines && data.voiceLines.length > 0) {
                    modalVoice.innerHTML = `<p class="font-bold text-xs text-amber-400 mb-2">Voice Quotes (${data.voiceLines.length}):</p>` + data.voiceLines.slice(0, 8).map(v => `
                        <div class="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-0.5">
                            <p class="font-bold text-xs text-white">${v.title}</p>
                            <p class="text-[11px] text-slate-400 italic">"${v.desc}"</p>
                        </div>
                    `).join('');
                } else {
                    modalVoice.innerHTML = '';
                }
            }

            // Raw JSON
            if (modalJson) {
                modalJson.innerText = JSON.stringify(data, null, 2);
            }

            if (modalTabBtns && modalTabBtns[0]) modalTabBtns[0].click();
            modalViewInfo.classList.remove('hidden');

        } catch (err) {
            window.showAlertErrorBox(err.response?.data?.error || err.message || 'Failed to open details');
        }
    });

    // ----------------------------------------------------
    // Scraper Engine Console Logging
    // ----------------------------------------------------
    function appendScraperLog(msg, type = 'info') {
        const box = document.getElementById('scraperConsoleBox');
        if (!box) return;
        const p = document.createElement('p');
        const time = new Date().toLocaleTimeString();
        if (type === 'success') {
            p.className = 'text-emerald-400 font-semibold';
            p.innerHTML = `[${time}] ✅ ${msg}`;
        } else if (type === 'error') {
            p.className = 'text-rose-400 font-semibold';
            p.innerHTML = `[${time}] ❌ ${msg}`;
        } else if (type === 'warn') {
            p.className = 'text-amber-400';
            p.innerHTML = `[${time}] ⚡ ${msg}`;
        } else {
            p.className = 'text-slate-300';
            p.innerHTML = `[${time}] > ${msg}`;
        }
        box.appendChild(p);
        box.scrollTop = box.scrollHeight;
    }

    const btnClearConsole = document.getElementById('btnClearConsole');
    if (btnClearConsole) {
        btnClearConsole.addEventListener('click', () => {
            const box = document.getElementById('scraperConsoleBox');
            if (box) box.innerHTML = '<p class="text-slate-500">> Console cleared.</p>';
        });
    }

    // ----------------------------------------------------
    // Single Entry Scraper Preview
    // ----------------------------------------------------
    const btnScraperPreview = document.getElementById('btnScraperPreview');
    if (btnScraperPreview) {
        btnScraperPreview.addEventListener('click', async () => {
            const input = document.getElementById('scraperEntryInput');
            const categorySelect = document.getElementById('scraperCategory');
            const previewContainer = document.getElementById('scraperPreviewContainer');

            if (!input || !input.value.trim()) {
                window.showAlertErrorBox('Please enter a HoYoWiki URL or Entry ID');
                return;
            }

            const urlOrId = input.value.trim();
            const category = categorySelect ? categorySelect.value : 'character';

            btnScraperPreview.disabled = true;
            btnScraperPreview.innerHTML = '<i class="ti ti-refresh mr-1 text-sm animate-spin"></i> Fetching...';
            appendScraperLog(`Fetching ${category} preview for "${urlOrId}"...`);

            try {
                const res = await axios.post('/dashboard/scraper/preview', {
                    urlOrId: urlOrId,
                    category: category
                });

                if (res.data && res.data.success && res.data.data) {
                    const data = res.data.data;
                    const prevName = document.getElementById('prevName');
                    const prevDesc = document.getElementById('prevDesc');
                    const prevRarity = document.getElementById('prevRarity');
                    const prevVision = document.getElementById('prevVision');
                    const prevWeapon = document.getElementById('prevWeapon');
                    const prevImg = document.getElementById('prevImg');
                    const detailsBox = document.getElementById('prevDetails');

                    if (prevName) prevName.innerText = data.name || 'Unnamed';
                    if (prevDesc) prevDesc.innerText = data.desc || 'No description available.';
                    if (prevRarity) prevRarity.innerText = `${data.rarity || 4}★`;
                    if (prevVision) prevVision.innerText = data.vision || data.family || 'Genshin Impact';
                    if (prevWeapon) prevWeapon.innerText = data.weapon || (data.source ? data.source[0] : 'Teyvat');
                    if (prevImg) prevImg.src = data.images?.profile || data.images?.icon || data.fullSet?.flower?.icon || '/assets/images/characters.webp';

                    let detailsHtml = '';
                    if (data.talents && data.talents.length > 0) {
                        detailsHtml += `<div class="mt-2"><p class="font-bold text-red-400 mb-1">⚔️ Combat Talents (${data.talents.length}):</p><div class="flex flex-wrap gap-1.5">${data.talents.map(t => `<span class="px-2 py-0.5 rounded-lg bg-[#161b22] text-slate-200 border border-[#30363d]">${t.name}</span>`).join('')}</div></div>`;
                    }
                    if (data.constellations && data.constellations.length > 0) {
                        detailsHtml += `<div class="mt-2"><p class="font-bold text-amber-400 mb-1">🌟 Constellations (C1-C6):</p><div class="flex flex-wrap gap-1.5">${data.constellations.map(c => `<span class="px-2 py-0.5 rounded-lg bg-[#161b22] text-amber-300 border border-amber-500/20">C${c.level}: ${c.name}</span>`).join('')}</div></div>`;
                    }
                    if (data.effect) {
                        detailsHtml += `<div class="mt-2 text-slate-300"><p><strong class="text-indigo-400">2-Pc:</strong> ${data.effect.twoPc || 'N/A'}</p><p class="mt-1"><strong class="text-indigo-400">4-Pc:</strong> ${data.effect.fourPc || 'N/A'}</p></div>`;
                    }

                    if (detailsBox) detailsBox.innerHTML = detailsHtml;
                    if (previewContainer) previewContainer.classList.remove('hidden');

                    appendScraperLog(`Extracted "${data.name}"!`, 'success');
                    window.showAlertBox(`Loaded preview for ${data.name}!`);
                } else {
                    throw new Error(res.data?.error || 'Failed to fetch entry');
                }
            } catch (err) {
                const errMsg = err.response?.data?.error || err.message || 'Error occurred';
                appendScraperLog(`Preview Error: ${errMsg}`, 'error');
                window.showAlertErrorBox(errMsg);
            } finally {
                btnScraperPreview.disabled = false;
                btnScraperPreview.innerHTML = '<i class="ti ti-eye mr-1 text-sm"></i> Preview';
            }
        });
    }

    // ----------------------------------------------------
    // Single Entry Scraper Sync Logic
    // ----------------------------------------------------
    const btnScraperSync = document.getElementById('btnScraperSync');
    if (btnScraperSync) {
        btnScraperSync.addEventListener('click', async () => {
            const input = document.getElementById('scraperEntryInput');
            const categorySelect = document.getElementById('scraperCategory');
            const cloudinaryToggle = document.getElementById('cloudinaryToggle');

            if (!input || !input.value.trim()) {
                window.showAlertErrorBox('Please enter a HoYoWiki URL or Entry ID');
                return;
            }

            const urlOrId = input.value.trim();
            const category = categorySelect ? categorySelect.value : 'character';
            const uploadToCloudinary = cloudinaryToggle ? cloudinaryToggle.checked : true;

            btnScraperSync.disabled = true;
            btnScraperSync.innerHTML = '<i class="ti ti-refresh mr-1 text-sm animate-spin"></i> Syncing...';
            appendScraperLog(`Syncing ${category} "${urlOrId}"...`);

            try {
                const res = await axios.post('/dashboard/scraper/sync-single', {
                    urlOrId: urlOrId,
                    category: category,
                    uploadToCloudinary: uploadToCloudinary
                });

                if (res.data && res.data.success) {
                    appendScraperLog(res.data.message, 'success');
                    window.showAlertBox(res.data.message);
                    setTimeout(() => location.reload(), 1400);
                } else {
                    throw new Error(res.data?.error || 'Failed to sync');
                }
            } catch (err) {
                const errMsg = err.response?.data?.error || err.message || 'Sync failed';
                appendScraperLog(`Sync Error: ${errMsg}`, 'error');
                window.showAlertErrorBox(errMsg);
            } finally {
                btnScraperSync.disabled = false;
                btnScraperSync.innerHTML = '<i class="ti ti-cloud-upload mr-1 text-sm"></i> Sync';
            }
        });
    }

    // ----------------------------------------------------
    // Batch Category Scraper Handlers
    // ----------------------------------------------------
    async function triggerBatchSync(category, buttonId, defaultLabel) {
        const btn = document.getElementById(buttonId);
        const cloudinaryToggle = document.getElementById('cloudinaryToggle');
        const uploadToCloudinary = cloudinaryToggle ? cloudinaryToggle.checked : true;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ti ti-refresh mr-1 text-sm animate-spin"></i> Syncing...';
        }

        appendScraperLog(`🚀 Batch sync started for "${category}"...`, 'warn');
        window.showAlertBox(`Starting batch sync for ${category}...`);

        try {
            const res = await axios.post('/dashboard/scraper/sync-category', {
                category: category,
                uploadToCloudinary: uploadToCloudinary
            });

            if (res.data && res.data.success) {
                appendScraperLog(res.data.message, 'success');
                window.showAlertBox(res.data.message);
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(res.data?.error || 'Batch sync failed');
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Batch sync error';
            appendScraperLog(`Batch Sync Error: ${errMsg}`, 'error');
            window.showAlertErrorBox(errMsg);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = defaultLabel;
            }
        }
    }

    const btnSyncChars = document.getElementById('btnSyncChars');
    if (btnSyncChars) {
        btnSyncChars.addEventListener('click', () => {
            triggerBatchSync('characters', 'btnSyncChars', '<i class="ti ti-download mr-1 text-sm"></i> Sync Characters (~4s)');
        });
    }

    const btnSyncWeaps = document.getElementById('btnSyncWeaps');
    if (btnSyncWeaps) {
        btnSyncWeaps.addEventListener('click', () => {
            triggerBatchSync('weapons', 'btnSyncWeaps', '<i class="ti ti-download mr-1 text-sm"></i> Sync Weapons (~9s)');
        });
    }

    const btnSyncArts = document.getElementById('btnSyncArts');
    if (btnSyncArts) {
        btnSyncArts.addEventListener('click', () => {
            triggerBatchSync('artifacts', 'btnSyncArts', '<i class="ti ti-download mr-1 text-sm"></i> Sync Artifacts (~2s)');
        });
    }

    const btnSyncUniverse = document.getElementById('btnSyncUniverse');
    if (btnSyncUniverse) {
        btnSyncUniverse.addEventListener('click', () => {
            triggerBatchSync('all', 'btnSyncUniverse', '<i class="ti ti-rocket mr-1 text-sm"></i> 🚀 Sync All (~15s)');
        });
    }

    // ----------------------------------------------------
    // Quick Category Single-Sync Handlers
    // ----------------------------------------------------
    async function handleQuickSync(category, inputId, buttonId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(buttonId);

        if (!input || !input.value.trim()) {
            window.showAlertErrorBox('Please enter a HoYoWiki URL or Entry ID');
            return;
        }

        const urlOrId = input.value.trim();
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ti ti-refresh mr-1 text-sm animate-spin"></i>';
        }
        window.showAlertBox(`Syncing ${category} "${urlOrId}" from HoYoWiki...`);

        try {
            const cloudinaryToggle = document.getElementById('cloudinaryToggle');
            const uploadToCloudinary = cloudinaryToggle ? cloudinaryToggle.checked : true;
            const res = await axios.post('/dashboard/scraper/sync-single', {
                urlOrId: urlOrId,
                category: category,
                uploadToCloudinary: uploadToCloudinary
            });

            if (res.data && res.data.success) {
                window.showAlertBox(res.data.message);
                setTimeout(() => location.reload(), 1200);
            } else {
                throw new Error(res.data?.error || 'Sync failed');
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Sync failed';
            window.showAlertErrorBox(errMsg);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="ti ti-cloud-download mr-1 text-sm"></i> Sync ${category.charAt(0).toUpperCase() + category.slice(1)}`;
            }
        }
    }

    const btnQuickCharSync = document.getElementById('btnQuickCharSync');
    if (btnQuickCharSync) {
        btnQuickCharSync.addEventListener('click', () => handleQuickSync('character', 'quickCharInput', 'btnQuickCharSync'));
    }

    const btnQuickWeaponSync = document.getElementById('btnQuickWeaponSync');
    if (btnQuickWeaponSync) {
        btnQuickWeaponSync.addEventListener('click', () => handleQuickSync('weapon', 'quickWeaponInput', 'btnQuickWeaponSync'));
    }

    const btnQuickArtifactSync = document.getElementById('btnQuickArtifactSync');
    if (btnQuickArtifactSync) {
        btnQuickArtifactSync.addEventListener('click', () => handleQuickSync('artifact', 'quickArtifactInput', 'btnQuickArtifactSync'));
    }

    // ----------------------------------------------------
    // Delete Modals
    // ----------------------------------------------------
    const deleteCharacterBtns = document.querySelectorAll('.delete-character-btn');
    const modalDeleteCharacter = document.getElementById('modal-delete-character');
    if (deleteCharacterBtns && modalDeleteCharacter) {
        deleteCharacterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modalDeleteCharacter.classList.remove('hidden');
                const cancelBtn = modalDeleteCharacter.querySelector('.btn-delete-character-modal-close');
                const charId = btn.dataset.characterid;
                const form = modalDeleteCharacter.querySelector('#character-delete-form');
                if (form) form.action = `/dashboard/character/delete/${charId}`;
                if (cancelBtn) {
                    cancelBtn.onclick = () => modalDeleteCharacter.classList.add('hidden');
                }
            });
        });
    }

    const deleteWeaponBtns = document.querySelectorAll('.delete-weapon-btn');
    const modalDeleteWeapon = document.getElementById('modal-delete-weapon');
    if (deleteWeaponBtns && modalDeleteWeapon) {
        deleteWeaponBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modalDeleteWeapon.classList.remove('hidden');
                const cancelBtn = modalDeleteWeapon.querySelector('.btn-delete-weapon-modal-close');
                const weapId = btn.dataset.weaponid;
                const form = modalDeleteWeapon.querySelector('#weapon-delete-form');
                if (form) form.action = `/dashboard/weapon/delete/${weapId}`;
                if (cancelBtn) {
                    cancelBtn.onclick = () => modalDeleteWeapon.classList.add('hidden');
                }
            });
        });
    }

    const deleteArtifactBtns = document.querySelectorAll('.delete-artifact-btn');
    const modalDeleteArtifact = document.getElementById('modal-delete-artifact');
    if (deleteArtifactBtns && modalDeleteArtifact) {
        deleteArtifactBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modalDeleteArtifact.classList.remove('hidden');
                const cancelBtn = modalDeleteArtifact.querySelector('.btn-delete-artifact-modal-close');
                const artId = btn.dataset.artifactid;
                const form = modalDeleteArtifact.querySelector('#artifact-delete-form');
                if (form) form.action = `/dashboard/artifact/delete/${artId}`;
                if (cancelBtn) {
                    cancelBtn.onclick = () => modalDeleteArtifact.classList.add('hidden');
                }
            });
        });
    }

    // ----------------------------------------------------
    // User Directory: Admin Actions & Search Filter
    // ----------------------------------------------------
    const deleteUserBtns = document.querySelectorAll('.btn-delete-user-modal');
    const modalDeleteUser = document.getElementById('modal-delete-user');
    if (deleteUserBtns && modalDeleteUser) {
        deleteUserBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modalDeleteUser.classList.remove('hidden');
                const userId = btn.dataset.id;
                const username = btn.dataset.username;
                const deleteUserName = document.getElementById('deleteUserName');
                if (deleteUserName) deleteUserName.innerText = `@${username}`;
                const form = modalDeleteUser.querySelector('#user-delete-form');
                if (form) form.action = `/dashboard/user/delete/${userId}`;
            });
        });
        const closeBtn = document.getElementById('btn-delete-user-modal-close');
        if (closeBtn) closeBtn.onclick = () => modalDeleteUser.classList.add('hidden');
    }

    const editUserBtns = document.querySelectorAll('.btn-edit-user-modal');
    const modalEditUser = document.getElementById('modal-edit-user');
    if (editUserBtns && modalEditUser) {
        editUserBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modalEditUser.classList.remove('hidden');
                const userId = btn.dataset.id;
                const username = btn.dataset.username;
                const firstName = btn.dataset.firstname || '';
                const lastName = btn.dataset.lastname || '';
                const role = btn.dataset.role || 'user';

                const subtitle = document.getElementById('editUserSubtitle');
                if (subtitle) subtitle.innerText = `@${username}`;

                const fnInput = document.getElementById('editUserFirstName');
                if (fnInput) fnInput.value = firstName;

                const lnInput = document.getElementById('editUserLastName');
                if (lnInput) lnInput.value = lastName;

                const roleSelect = document.getElementById('editUserRole');
                if (roleSelect) roleSelect.value = role;

                const form = modalEditUser.querySelector('#user-edit-form');
                if (form) form.action = `/dashboard/user/edit-basic/${userId}`;
            });
        });
        document.querySelectorAll('.btn-edit-user-modal-close').forEach(c => {
            c.onclick = () => modalEditUser.classList.add('hidden');
        });
    }

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;
            document.querySelectorAll('.user-card').forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const username = (card.dataset.username || '').toLowerCase();
                const role = (card.dataset.role || '').toLowerCase();
                const matches = name.includes(query) || username.includes(query) || role.includes(query);
                card.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });
            const counter = document.getElementById('userVisibleCount');
            if (counter) counter.innerText = visibleCount;
        });
    }

    // ----------------------------------------------------
    // Section 4: Database Admin Center Multi-Filter Engine
    // ----------------------------------------------------
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminCatFilter = document.getElementById('adminCategoryFilter');
    const adminRarityFilter = document.getElementById('adminRarityFilter');
    const adminVisionFilter = document.getElementById('adminVisionFilter');
    const adminWeaponFilter = document.getElementById('adminWeaponFilter');

    const adminCharSection = document.getElementById('adminCharSection');
    const adminWeapSection = document.getElementById('adminWeapSection');
    const adminArtSection = document.getElementById('adminArtSection');
    const adminNoResults = document.getElementById('adminNoResults');

    const adminCharVisibleCount = document.getElementById('adminCharVisibleCount');
    const adminWeapVisibleCount = document.getElementById('adminWeapVisibleCount');
    const adminArtVisibleCount = document.getElementById('adminArtVisibleCount');

    function applyAdminFilters() {
        if (!adminSearchInput) return;
        const q = adminSearchInput.value.toLowerCase().trim();
        const cat = adminCatFilter ? adminCatFilter.value : 'all';
        const rarity = adminRarityFilter ? adminRarityFilter.value : 'all';
        const vision = adminVisionFilter ? adminVisionFilter.value : 'all';
        const weaponType = adminWeaponFilter ? adminWeaponFilter.value : 'all';

        let charVisible = 0;
        let weapVisible = 0;
        let artVisible = 0;

        // 1. Filter Characters
        const charItems = document.querySelectorAll('.character-list');
        const showCharCat = (cat === 'all' || cat === 'character');
        charItems.forEach(item => {
            if (!showCharCat) {
                item.style.display = 'none';
                return;
            }
            const name = (item.dataset.name || '').toLowerCase();
            const itemVision = item.dataset.vision || '';
            const itemWeapon = item.dataset.weapon || '';
            const itemRarity = item.dataset.rarity || '';

            const matchQuery = !q || name.includes(q) || itemVision.toLowerCase().includes(q) || itemWeapon.toLowerCase().includes(q);
            const matchVision = (vision === 'all' || itemVision.toLowerCase() === vision.toLowerCase());
            const matchWeapon = (weaponType === 'all' || itemWeapon.toLowerCase() === weaponType.toLowerCase());
            const matchRarity = (rarity === 'all' || itemRarity === rarity);

            if (matchQuery && matchVision && matchWeapon && matchRarity) {
                item.style.display = '';
                charVisible++;
            } else {
                item.style.display = 'none';
            }
        });
        if (adminCharSection) adminCharSection.style.display = (showCharCat && charVisible > 0) ? '' : 'none';
        if (adminCharVisibleCount) adminCharVisibleCount.innerText = charVisible;

        // 2. Filter Weapons
        const weapItems = document.querySelectorAll('.weapon-list');
        const showWeapCat = (cat === 'all' || cat === 'weapon');
        weapItems.forEach(item => {
            if (!showWeapCat) {
                item.style.display = 'none';
                return;
            }
            const name = (item.dataset.name || '').toLowerCase();
            const itemFamily = item.dataset.family || '';
            const itemRarity = item.dataset.rarity || '';

            const matchQuery = !q || name.includes(q) || itemFamily.toLowerCase().includes(q);
            const matchWeapon = (weaponType === 'all' || itemFamily.toLowerCase() === weaponType.toLowerCase());
            const matchRarity = (rarity === 'all' || itemRarity === rarity);
            const matchVision = (vision === 'all');

            if (matchQuery && matchWeapon && matchRarity && matchVision) {
                item.style.display = '';
                weapVisible++;
            } else {
                item.style.display = 'none';
            }
        });
        if (adminWeapSection) adminWeapSection.style.display = (showWeapCat && weapVisible > 0) ? '' : 'none';
        if (adminWeapVisibleCount) adminWeapVisibleCount.innerText = weapVisible;

        // 3. Filter Artifacts
        const artItems = document.querySelectorAll('.artifact-list');
        const showArtCat = (cat === 'all' || cat === 'artifact');
        artItems.forEach(item => {
            if (!showArtCat) {
                item.style.display = 'none';
                return;
            }
            const name = (item.dataset.name || '').toLowerCase();
            const matchQuery = !q || name.includes(q);
            const matchVision = (vision === 'all');
            const matchWeapon = (weaponType === 'all');
            const matchRarity = (rarity === 'all' || rarity === '5');

            if (matchQuery && matchVision && matchWeapon && matchRarity) {
                item.style.display = '';
                artVisible++;
            } else {
                item.style.display = 'none';
            }
        });
        if (adminArtSection) adminArtSection.style.display = (showArtCat && artVisible > 0) ? '' : 'none';
        if (adminArtVisibleCount) adminArtVisibleCount.innerText = artVisible;

        const totalVisible = charVisible + weapVisible + artVisible;
        if (adminNoResults) {
            adminNoResults.classList.toggle('hidden', totalVisible > 0);
        }
    }

    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', applyAdminFilters);
        if (adminCatFilter) adminCatFilter.addEventListener('change', applyAdminFilters);
        if (adminRarityFilter) adminRarityFilter.addEventListener('change', applyAdminFilters);
        if (adminVisionFilter) adminVisionFilter.addEventListener('change', applyAdminFilters);
        if (adminWeaponFilter) adminWeaponFilter.addEventListener('change', applyAdminFilters);
    }

    // Mobile Hamburger
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-mob');
            body.classList.toggle('body-overflow');
        });
    }

    // Copy Code Snippets
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const codeId = button.getAttribute('data-code');
            const codeEl = document.getElementById(codeId);
            if (codeEl) {
                navigator.clipboard.writeText(codeEl.innerText)
                    .then(() => window.showAlertBox('Code copied to clipboard!'))
                    .catch(() => window.showAlertErrorBox('Could not copy to clipboard'));
            }
        });
    });

    // Logout Modal
    if (navLogoutBtn && logoutModal) {
        navLogoutBtn.addEventListener('click', () => {
            logoutModal.classList.remove('hidden');
        });
    }
    if (closeBtn && logoutModal) {
        closeBtn.addEventListener('click', () => {
            logoutModal.classList.add('hidden');
        });
    }

    // Account Deletion Safeguard
    if (deleteBtn) {
        const deleteInput = document.getElementById('input-delete');
        if (deleteInput) {
            deleteInput.addEventListener('input', () => {
                if (deleteInput.value === 'DISAPPEAR') {
                    deleteBtn.classList.remove('opacity-50', 'pointer-events-none');
                    deleteBtn.classList.add('bg-rose-600', 'text-white');
                } else {
                    deleteBtn.classList.add('opacity-50', 'pointer-events-none');
                    deleteBtn.classList.remove('bg-rose-600', 'text-white');
                }
            });
        }
        deleteBtn.addEventListener('click', async () => {
            const userId = deleteBtn.dataset.userid;
            try {
                const res = await axios.delete(`/dashboard/delete/${userId}`);
                if (res.status === 200) window.location.href = '/login';
            } catch (err) {
                window.showAlertErrorBox('Failed to delete account');
            }
        });
    }

    // Run initial tab setup and hide loader
    loadDefaults();
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
});
