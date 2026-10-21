// ============================================
// news.js — Модуль управління новинами (БАГАТОМОВНА ВЕРСІЯ)
// Підтримка 4 мов: ru, uk, en, he
// ДЛЯ РЕДАКТОРА (editor.html)
// ============================================

const NewsEditor = {
  editingIndex: null, // Индекс редактируемой новости
  LANGUAGES: ['ru', 'uk', 'en', 'he'],
  LANGUAGE_NAMES: {
    ru: '🇷🇺 Русский',
    uk: '🇺🇦 Українська',
    en: '🇬🇧 English',
    he: '🇮🇱 עברית'
  },

  render() {
    const list = document.getElementById('newsList');
    if (!list) return;
    
    // Обновляем форму для многоязычности
    this._renderMultilangForm();
    
    list.innerHTML = '';

    // Сортируем новости от новых к старым
    const sortedNews = [...(Editor.data.news || [])].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    if (sortedNews.length === 0) {
      list.innerHTML = '<div class="list-item" style="justify-content:center; color:#999;">Новостей пока нет</div>';
      return;
    }

    sortedNews.forEach((n, idx) => {
      // Находим оригинальный индекс в несортированном массиве
      const originalIndex = Editor.data.news.indexOf(n);
      
      // Определяем, многоязычная ли новость
      const isMultilang = n.translations && typeof n.translations === 'object';
      
      const div = document.createElement('div');
      div.className = 'list-item';
      
      let textPreview = '';
      if (isMultilang) {
        // Показываем превью на всех языках
        const langs = Object.keys(n.translations).filter(lang => n.translations[lang]);
        textPreview = langs.map(lang => {
          const badge = `<span class="badge badge-${lang}">${lang.toUpperCase()}</span>`;
          const text = n.translations[lang].substring(0, 50);
          return `${badge} ${text}${n.translations[lang].length > 50 ? '...' : ''}`;
        }).join('<br>');
      } else {
        // Старый формат (только текст)
        textPreview = `<span style="color:#999;">📜 Старый формат</span><br>${n.text}`;
      }
      
      div.innerHTML = `
        <div style="flex: 1;">
          <div style="margin-bottom: 8px;">
            <span style="color: var(--primary); font-weight: bold; margin-right: 10px;">${n.date}</span>
            ${isMultilang ? '<span class="badge" style="background:#28a745;">🌐 Многоязычная</span>' : ''}
          </div>
          <div style="font-size: 13px; line-height: 1.6;">
            ${textPreview}
          </div>
          ${n.link ? `<div style="margin-top: 5px;"><small><a href="${n.link}" target="_blank" style="color:#888;">🔗 ${n.link}</a></small></div>` : ''}
        </div>
        <div style="display:flex; gap:5px; flex-direction: column;">
          <button class="btn-secondary" onclick="NewsEditor.edit(${originalIndex})" style="white-space: nowrap;">✏️ Редактировать</button>
          <button class="btn-danger" onclick="NewsEditor.delete(${originalIndex})" style="white-space: nowrap;">🗑️ Удалить</button>
        </div>
      `;
      list.appendChild(div);
    });
  },

  /**
   * Рендерит многоязычную форму
   */
  _renderMultilangForm() {
    const formCard = document.querySelector('#tab-news .card:first-child');
    if (!formCard) return;
    
    // Если форма уже многоязычная, не перерисовываем
    if (formCard.querySelector('#n-translations')) return;
    
    formCard.innerHTML = `
      <h3>📰 Добавить новость</h3>
      
      <div class="form-group">
        <label>📅 Дата</label>
        <input type="date" id="n-date">
      </div>
      
      <div class="form-group">
        <label>🔗 Ссылка (опционально)</label>
        <input type="text" id="n-link" placeholder="https://example.com">
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h4 style="margin-top: 0; margin-bottom: 15px;">🌐 Тексты на разных языках</h4>
        <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
          Заполните хотя бы один язык. Если заполнено несколько — новость будет показываться на соответствующем языке сайта.
        </p>
        
        <div id="n-translations">
          ${this.LANGUAGES.map(lang => `
            <div class="form-group">
              <label>
                <span class="badge badge-${lang}">${this.LANGUAGE_NAMES[lang]}</span>
              </label>
              <textarea 
                id="n-text-${lang}" 
                placeholder="Текст новости на ${this.LANGUAGE_NAMES[lang]}..."
                style="height: 80px; ${lang === 'he' ? 'direction: rtl; text-align: right;' : ''}"
              ></textarea>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button class="btn-load" onclick="NewsEditor.add()" style="flex: 1;">
          ➕ Добавить новость
        </button>
        <button class="btn-secondary" onclick="NewsEditor.clearForm()" style="flex: 0;">
          🔄 Очистить
        </button>
      </div>
      
      <div id="form-actions-container"></div>
    `;
    
    // Устанавливаем текущую дату по умолчанию
    document.getElementById('n-date').valueAsDate = new Date();
  },

  /**
   * Добавление новости
   */
  add() {
    const dateInput = document.getElementById('n-date');
    const linkInput = document.getElementById('n-link');
    
    const date = dateInput.value;
    const link = linkInput.value.trim();

    if (!date) {
      alert('Пожалуйста, укажите дату новости');
      return;
    }

    // Собираем тексты на всех языках
    const translations = {};
    let hasAnyText = false;
    
    this.LANGUAGES.forEach(lang => {
      const textInput = document.getElementById(`n-text-${lang}`);
      if (textInput && textInput.value.trim()) {
        translations[lang] = Editor.sanitizeInput(textInput.value.trim());
        hasAnyText = true;
      }
    });

    if (!hasAnyText) {
      alert('Пожалуйста, заполните текст хотя бы на одном языке');
      return;
    }

    const newEntry = {
      date: date,
      translations: translations,
      link: Editor.sanitizeInput(link)
    };

    if (!Editor.data.news) Editor.data.news = [];
    Editor.data.news.push(newEntry);
    
    Editor.isDirty = true;
    
    // Очищаем форму
    this.clearForm();
    this.render();
    
    console.log("✅ Многоязычная новость добавлена");
  },

  /**
   * Очистка формы
   */
  clearForm() {
    this.LANGUAGES.forEach(lang => {
      const input = document.getElementById(`n-text-${lang}`);
      if (input) input.value = '';
    });
    
    const linkInput = document.getElementById('n-link');
    if (linkInput) linkInput.value = '';
    
    document.getElementById('n-date').valueAsDate = new Date();
  },

  /**
   * Редактирование новости
   */
  edit(idx) {
    const news = Editor.data.news[idx];
    if (!news) return;

    // Сохраняем индекс редактируемой новости
    this.editingIndex = idx;

    // Заполняем форму
    document.getElementById('n-date').value = news.date;
    document.getElementById('n-link').value = news.link || '';

    // Проверяем формат новости
    const isMultilang = news.translations && typeof news.translations === 'object';
    
    if (isMultilang) {
      // Новый формат — заполняем все языки
      this.LANGUAGES.forEach(lang => {
        const input = document.getElementById(`n-text-${lang}`);
        if (input) {
          input.value = news.translations[lang] || '';
        }
      });
    } else {
      // Старый формат — копируем в русский
      const ruInput = document.getElementById('n-text-ru');
      if (ruInput) {
        ruInput.value = news.text || '';
      }
      alert('⚠️ Эта новость в старом формате. После сохранения она будет конвертирована в многоязычный формат.');
    }

    // Меняем кнопки на режим редактирования
    const container = document.getElementById('form-actions-container');
    container.innerHTML = `
      <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #667eea;">
        <button class="btn-save" onclick="NewsEditor.saveEdit()" style="flex: 1;">
          ✅ Сохранить изменения
        </button>
        <button class="btn-secondary" onclick="NewsEditor.cancelEdit()">
          ❌ Отмена
        </button>
      </div>
    `;

    // Скрываем основную кнопку "Добавить"
    const addBtn = document.querySelector('#tab-news .card:first-child button.btn-load');
    if (addBtn) addBtn.style.display = 'none';

    // Скроллим к форме
    document.querySelector('#tab-news .card:first-child').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });

    console.log(`✏️ Редактирование новости: ${news.date}`);
  },

  /**
   * Сохранение изменений
   */
  saveEdit() {
    if (this.editingIndex === null) return;

    const dateInput = document.getElementById('n-date');
    const linkInput = document.getElementById('n-link');

    const date = dateInput.value;
    const link = linkInput.value.trim();

    if (!date) {
      alert('Пожалуйста, укажите дату новости');
      return;
    }

    // Собираем тексты на всех языках
    const translations = {};
    let hasAnyText = false;
    
    this.LANGUAGES.forEach(lang => {
      const textInput = document.getElementById(`n-text-${lang}`);
      if (textInput && textInput.value.trim()) {
        translations[lang] = Editor.sanitizeInput(textInput.value.trim());
        hasAnyText = true;
      }
    });

    if (!hasAnyText) {
      alert('Пожалуйста, заполните текст хотя бы на одном языке');
      return;
    }

    // Обновляем новость
    Editor.data.news[this.editingIndex] = {
      date: date,
      translations: translations,
      link: Editor.sanitizeInput(link)
    };

    Editor.isDirty = true;

    // Очищаем форму и возвращаем в режим добавления
    this.cancelEdit();
    this.render();

    console.log("✅ Новость обновлена");
  },

  /**
   * Отмена редактирования
   */
  cancelEdit() {
    this.editingIndex = null;

    // Очищаем форму
    this.clearForm();

    // Показываем основную кнопку "Добавить"
    const addBtn = document.querySelector('#tab-news .card:first-child button.btn-load');
    if (addBtn) addBtn.style.display = 'flex';

    // Удаляем кнопки редактирования
    const container = document.getElementById('form-actions-container');
    if (container) container.innerHTML = '';
  },

  /**
   * Удаление новости
   */
  delete(idx) {
    const news = Editor.data.news[idx];
    if (confirm(`Удалить новость от ${news.date}?`)) {
      Editor.data.news.splice(idx, 1);
      Editor.isDirty = true;
      
      // Если удаляем редактируемую новость, отменяем редактирование
      if (this.editingIndex === idx) {
        this.cancelEdit();
      } else if (this.editingIndex !== null && this.editingIndex > idx) {
        // Корректируем индекс если удалили новость перед редактируемой
        this.editingIndex--;
      }
      
      this.render();
      console.log(`🗑️ Новость удалена: ${news.date}`);
    }
  },

  /**
   * МИГРАЦИЯ: конвертирует старые новости в новый формат
   */
  migrateOldNews() {
    if (!Editor.data.news) return 0;
    
    let migrated = 0;
    
    Editor.data.news.forEach(news => {
      // Если новость в старом формате (есть поле text, но нет translations)
      if (news.text && (!news.translations || typeof news.translations !== 'object')) {
        console.log(`🔄 Миграция новости: ${news.date}`);
        
        // Копируем текст в русский язык
        news.translations = {
          ru: news.text
        };
        
        // Удаляем старое поле
        delete news.text;
        
        migrated++;
      }
    });
    
    if (migrated > 0) {
      Editor.isDirty = true;
      console.log(`✅ Мигрировано ${migrated} новостей в многоязычный формат`);
      alert(`✅ Конвертировано ${migrated} новостей в многоязычный формат. Сохраните файл.`);
    } else {
      alert('✅ Все новости уже в многоязычном формате');
    }
    
    return migrated;
  },

  /**
   * ВАЛИДАЦИЯ: проверяет корректность новостей
   */
  validateNews() {
    if (!Editor.data.news) {
      alert('Нет новостей для проверки');
      return;
    }

    const issues = [];
    
    Editor.data.news.forEach((news, idx) => {
      // Проверка даты
      if (!news.date) {
        issues.push(`Новость #${idx + 1}: отсутствует дата`);
      }
      
      // Проверка формата
      const isMultilang = news.translations && typeof news.translations === 'object';
      const hasOldFormat = news.text && !isMultilang;
      
      if (hasOldFormat) {
        issues.push(`Новость ${news.date}: старый формат (требуется миграция)`);
      }
      
      // Проверка наличия хотя бы одного текста
      if (isMultilang) {
        const hasAnyText = this.LANGUAGES.some(lang => 
          news.translations[lang] && news.translations[lang].trim()
        );
        
        if (!hasAnyText) {
          issues.push(`Новость ${news.date}: нет текста ни на одном языке`);
        }
      }
    });
    
    let report = '=== ВАЛИДАЦИЯ НОВОСТЕЙ ===\n\n';
    report += `Всего новостей: ${Editor.data.news.length}\n\n`;
    
    if (issues.length === 0) {
      report += '✅ Проблем не найдено!';
    } else {
      report += `⚠️ Найдено проблем: ${issues.length}\n\n`;
      issues.forEach(issue => report += `• ${issue}\n`);
    }
    
    console.log(report);
    alert(report);
  }
};