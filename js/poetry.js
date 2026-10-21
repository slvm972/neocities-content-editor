// ============================================
// poetry.js — Модуль редактування поезії (З YOUTUBE, ВИПРАВЛЕНО)
// ВИПРАВЛЕНО: autoGenerateSlug тепер використовує SlugHelper
// ============================================

const PoetryEditor = {
  currentPoem: null,
  currentFilter: '',

  renderCollections() {
    const container = document.getElementById('collectionButtons');
    const cols = [...new Set(Editor.data.poetry.map(p => p.collection).filter(Boolean))].sort();
    container.innerHTML = `<button onclick="PoetryEditor.filterByCollection('')">📚 Все</button>`;
    cols.forEach(c => {
      container.innerHTML += `<button onclick="PoetryEditor.filterByCollection('${c}')">${c}</button>`;
    });
  },

  filterByCollection(col) {
    this.currentFilter = col;
    this.renderList();
  },

  renderList() {
    const list = document.getElementById('poetryList');
    const search = document.getElementById('poetrySearch').value.toLowerCase();
    list.innerHTML = '';

    let filtered = Editor.data.poetry.filter(p => p.title.toLowerCase().includes(search));
    if (this.currentFilter) filtered = filtered.filter(p => p.collection === this.currentFilter);

    filtered.forEach(p => {
      const transCount = (p.translations || []).length;
      const transBadge = transCount > 0 ? `<span class="badge" style="background:#28a745;">${transCount} переводов</span>` : '';
      const audioBadge = p.audio ? `<span style="margin-left:5px;">🔊</span>` : '';
      const videoBadge = p.youtubeId ? `<span style="margin-left:5px;">🎬</span>` : '';
      
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div>
          <span class="badge badge-${p.lang}">${p.lang.toUpperCase()}</span>
          ${transBadge}
          <b>${p.title}</b>${audioBadge}${videoBadge}
        </div>
        <div style="display:flex; gap:5px;">
          <button class="btn-secondary" onclick="PoetryEditor.openForm('${p.id}')">✏️</button>
          <button class="btn-danger" onclick="PoetryEditor.deletePoem('${p.id}')">🗑️</button>
        </div>
      `;
      list.appendChild(div);
    });
  },

  openForm(id = null) {
    Editor.formIsOpen = true;
    const p = id ? Editor.data.poetry.find(x => x.id === id) : null;
    this.currentPoem = p ? JSON.parse(JSON.stringify(p)) : {
      id: `poem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lang: 'ru',
      title: '',
      text: '',
      collection: '',
      slug: '',
      date_published: '',
      audio: '',
      youtubeId: '',
      translations: []
    };
    
    document.getElementById('poetryEditorCard').style.display = 'block';
    document.getElementById('p-title').value = this.currentPoem.title;
    document.getElementById('p-text').value = this.currentPoem.text || '';
    document.getElementById('p-lang').value = this.currentPoem.lang || 'ru';
    document.getElementById('p-collection').value = this.currentPoem.collection || '';
    document.getElementById('p-slug').value = this.currentPoem.slug || '';
    document.getElementById('p-date').value = this.currentPoem.date_published || '';
    document.getElementById('p-audio').value = this.currentPoem.audio || '';
    
    // YouTube ID
    const youtubeField = document.getElementById('p-youtube');
    if (youtubeField) {
      youtubeField.value = this.currentPoem.youtubeId || '';
    }
    
    this.updateCollectionDatalist();
    this.renderTranslationSection();
  },

  updateCollectionDatalist() {
    const datalist = document.getElementById('collection-list');
    const cols = [...new Set(Editor.data.poetry.map(p => p.collection).filter(Boolean))].sort();
    datalist.innerHTML = cols.map(c => `<option value="${c}">`).join('');
  },

  renderTranslationSection() {
    const container = document.getElementById('p-trans-list');
    container.innerHTML = '';
    
    console.log(`📋 Рендерим переводы для стиха: ${this.currentPoem.id}`);
    console.log(`📋 Текущие связи в форме:`, this.currentPoem.translations);
    
    const translations = (this.currentPoem.translations || [])
      .map(id => Editor.data.poetry.find(p => p.id === id))
      .filter(Boolean);
    
    console.log(`📋 Найдено переводов для отображения: ${translations.length}`);
    
    if (translations.length === 0) {
      container.innerHTML = '<p style="color:#999; font-size:13px; text-align:center; padding:10px;">Нет связанных переводов</p>';
    } else {
      translations.forEach(t => {
        const div = document.createElement('div');
        div.className = 'trans-item';
        div.innerHTML = `
          <span><span class="badge badge-${t.lang}">${t.lang}</span> ${t.title}</span>
          <button class="btn-danger" style="padding:2px 6px; font-size:11px;" onclick="PoetryEditor.unlinkTranslation('${t.id}')">✕</button>
        `;
        container.appendChild(div);
      });
    }
    
    this.renderAvailablePoems();
  },

  renderAvailablePoems() {
    const container = document.getElementById('p-available-poems');
    const searchTerm = document.getElementById('p-trans-search').value.toLowerCase();
    
    container.innerHTML = '';
    
    const currentLinks = this.currentPoem.translations || [];
    
    const available = Editor.data.poetry
      .filter(p => p.id !== this.currentPoem.id)
      .filter(p => !currentLinks.includes(p.id))
      .filter(p => searchTerm === '' || p.title.toLowerCase().includes(searchTerm) || p.lang.toLowerCase().includes(searchTerm))
      .sort((a, b) => a.title.localeCompare(b.title));
    
    if (available.length === 0) {
      container.innerHTML = '<p style="color:#999; font-size:12px; padding:5px;">Нет доступных стихов</p>';
      return;
    }
    
    available.forEach(p => {
      const div = document.createElement('div');
      div.className = 'available-poem-item';
      div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid #eee; font-size:13px;';
      div.innerHTML = `
        <span><span class="badge badge-${p.lang}">${p.lang}</span> ${p.title}</span>
        <button class="btn-load" style="padding:2px 8px; font-size:11px;" onclick="PoetryEditor.linkTranslation('${p.id}')">+ Связать</button>
      `;
      container.appendChild(div);
    });
  },

  linkTranslation(targetId) {
    if (!this.currentPoem.translations) this.currentPoem.translations = [];
    
    if (!this.currentPoem.translations.includes(targetId)) {
      this.currentPoem.translations.push(targetId);
      console.log(`🔗 Связь добавлена в форму: ${targetId}`);
    }
    
    this.renderTranslationSection();
  },

  unlinkTranslation(targetId) {
    if (!this.currentPoem.translations) {
      this.currentPoem.translations = [];
      return;
    }
    
    this.currentPoem.translations = this.currentPoem.translations.filter(id => id !== targetId);
    
    console.log(`🔓 Связь удалена из формы: ${targetId}`);
    console.log(`📋 Осталось связей:`, this.currentPoem.translations);
    
    this.renderTranslationSection();
  },

  savePoem() {
    const p = this.currentPoem;
    
    p.title = document.getElementById('p-title').value.trim();
    p.text = document.getElementById('p-text').value;
    p.lang = document.getElementById('p-lang').value;
    p.collection = document.getElementById('p-collection').value.trim();
    p.slug = document.getElementById('p-slug').value.trim();
    p.date_published = document.getElementById('p-date').value;
    p.audio = document.getElementById('p-audio').value.trim();
    
    // ✅ ИСПРАВЛЕНО: Читаем YouTube ID с автоматической очисткой
    const youtubeField = document.getElementById('p-youtube');
    if (youtubeField) {
      const youtubeInput = youtubeField.value.trim();
      
      if (youtubeInput) {
        // 🔥 КРИТИЧНО: Извлекаем чистый ID
        const extractedId = typeof YouTubeHelper !== 'undefined'
          ? YouTubeHelper.extractId(youtubeInput)
          : (typeof extractYouTubeId !== 'undefined' ? extractYouTubeId(youtubeInput) : youtubeInput);
        
        if (!extractedId) {
          alert('❌ Не удалось извлечь YouTube ID из введённого значения');
          return;
        }
        
        // ✅ Валидация формата
        const isValid = typeof YouTubeHelper !== 'undefined'
          ? YouTubeHelper.isValid(extractedId)
          : /^[a-zA-Z0-9_-]{11}$/.test(extractedId);
        
        if (!isValid) {
          alert('❌ Некорректный YouTube ID. Должен быть 11 символов (например: dQw4w9WgXcQ)');
          return;
        }
        
        // 🎯 СОХРАНЯЕМ ТОЛЬКО ЧИСТЫЙ ID
        p.youtubeId = extractedId;
        console.log(`✅ YouTube ID сохранён: ${extractedId}`);
      } else {
        delete p.youtubeId;
      }
    }
    
    if (!p.title) {
      alert('Пожалуйста, введите название стиха');
      return;
    }
    
    if (!p.audio) {
      delete p.audio;
    }
    
    if (!p.slug && typeof SlugHelper !== 'undefined') {
      p.slug = SlugHelper.generateUnique(p.title, p.lang, p.id, Editor.data.poetry);
      console.log(`✨ Автоматически сгенерирован slug: ${p.slug}`);
    }
    
    if (p.slug && typeof SlugHelper !== 'undefined') {
      const validation = SlugHelper.validateSlug(p.slug);
      if (!validation.valid) {
        alert(`Ошибка slug: ${validation.error}`);
        return;
      }
      
      if (!SlugHelper.isUnique(p.slug, p.id, Editor.data.poetry)) {
        alert(`Slug "${p.slug}" уже используется другим стихом. Выберите уникальный slug.`);
        return;
      }
    }
    
    console.log(`📋 Сохраняем стих с переводами:`, p.translations);
    
    const idx = Editor.data.poetry.findIndex(x => x.id === p.id);
    if (idx > -1) {
      Editor.data.poetry[idx] = p;
    } else {
      Editor.data.poetry.push(p);
    }
    
    p.translations.forEach(targetId => {
      const target = Editor.data.poetry.find(x => x.id === targetId);
      if (target) {
        if (!target.translations) target.translations = [];
        if (!target.translations.includes(p.id)) {
          target.translations.push(p.id);
        }
      }
    });
    
    Editor.data.poetry.forEach(poem => {
      if (poem.id === p.id) return;
      if (!poem.translations) return;
      
      if (poem.translations.includes(p.id) && !p.translations.includes(poem.id)) {
        poem.translations = poem.translations.filter(id => id !== p.id);
        console.log(`🔓 Удалена обратная связь: ${poem.title} -X- ${p.title}`);
      }
    });
    
    if (typeof TranslationManager !== 'undefined') {
      TranslationManager.normalizeAllTranslations(false);
    }
    
    Editor.isDirty = true;
    Editor.formIsOpen = false;
    document.getElementById('poetryEditorCard').style.display = 'none';
    Editor.renderAll();
    
    const finalPoem = Editor.data.poetry.find(x => x.id === p.id);
    console.log(`✅ Стих сохранён: ${p.title}${p.youtubeId ? ' (с видео)' : ''}`);
    console.log(`📋 Финальные связи:`, finalPoem ? finalPoem.translations : []);
  },

  deletePoem(id) {
    const poem = Editor.data.poetry.find(p => p.id === id);
    if (!poem) return;
    
    if (confirm(`Удалить стих "${poem.title}"?`)) {
      TranslationManager.deletePoemWithCleanup(id);
      Editor.renderAll();
      console.log(`🗑️ Удалён: ${poem.title}`);
    }
  },

  cancelEdit() {
    if (Editor.isDirty && !confirm('Есть несохранённые изменения. Закрыть форму?')) {
      return;
    }
    Editor.formIsOpen = false;
    document.getElementById('poetryEditorCard').style.display = 'none';
  },

  /**
   * ✅ ИСПРАВЛЕНО: автоматическая генерация slug с транслитерацией
   * Теперь использует SlugHelper.generate() вместо примитивной замены
   */
  autoGenerateSlug() {
    const title = document.getElementById('p-title').value.trim();
    const lang = document.getElementById('p-lang').value;
    
    if (!title) {
      console.warn('⚠️ Невозможно сгенерировать slug: заголовок пуст');
      return;
    }
    
    // 🔥 КРИТИЧНО: используем SlugHelper.generate() для правильной транслитерации
    if (typeof SlugHelper !== 'undefined') {
      const slug = SlugHelper.generate(title, lang);
      document.getElementById('p-slug').value = slug;
      console.log(`✨ Автоматически сгенерирован slug: ${slug} (язык: ${lang})`);
    } else {
      console.error('❌ SlugHelper не загружен! Транслитерация недоступна.');
      alert('Ошибка: модуль транслитерации не загружен. Проверьте подключение slugHelper.js');
    }
  },

  showPreview() {
    const text = document.getElementById('p-text').value;
    const title = document.getElementById('p-title').value || 'Без названия';
    
    const preview = window.open('', 'Preview', 'width=700,height=600');
    preview.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Предпросмотр: ${title}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.8; }
          h1 { text-align: center; color: #333; }
          .poem { white-space: pre-wrap; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="poem">${text}</div>
      </body>
      </html>
    `);
    preview.document.close();
  },

  showValidationReport() {
    const validation = TranslationManager.validateTranslations();
    const stats = TranslationManager.getStatistics();
    
    let report = '=== СТАТИСТИКА ===\n';
    report += `Всего стихов: ${stats.totalPoems}\n`;
    report += `  - Со slug: ${stats.poemsWithSlug}\n`;
    report += `  - С переводами: ${stats.poemsWithTranslations}\n`;
    report += `Новостей: ${stats.totalNews}\n`;
    report += `Музыки: ${stats.totalTracks}\n`;
    report += `Видео: ${stats.totalVideos}\n`;
    report += `\n=== ПЕРЕВОДЫ ===\n`;
    report += `Групп переводов: ${stats.translationGroups}\n`;
    report += `Всего связей: ${stats.totalLinks}\n`;
    report += `Средний размер группы: ${stats.averageGroupSize}\n`;
    report += `Максимальная группа: ${stats.largestGroup} стихов\n`;
    
    if (validation.errors.length > 0) {
      report += '\n=== ОШИБКИ ===\n';
      validation.errors.forEach(e => {
        report += `❌ ${e.poem}: ${e.issue}\n`;
      });
      report += '\n';
    }
    
    if (validation.warnings.length > 0) {
      report += '=== ПРЕДУПРЕЖДЕНИЯ ===\n';
      validation.warnings.forEach(w => {
        report += `⚠️ ${w.poem}${w.target ? ' → ' + w.target : ''}: ${w.issue}\n`;
      });
    }
    
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      report += '✅ Все связи корректны!';
    }
    
    alert(report);
  }
};

console.log('✅ PoetryEditor (ИСПРАВЛЕНО: автоматическая транслитерация slug) загружен');