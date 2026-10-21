// ============================================
// media.js — Модуль управления медиа-контентом
// CHROME-СОВМЕСТИМАЯ ВЕРСИЯ С YOUTUBE (ИСПРАВЛЕНО)
// ============================================

const MediaEditor = {
  currentMedia: null,
  currentType: null,

  render() {
    const cont = document.getElementById('mediaList');
    if (!cont) return;
    cont.innerHTML = '<h3>🎵 Управление медиа</h3>';

    this.renderSection(cont, 'tracks', 'Музыка (аудио)');
    this.renderSection(cont, 'videos', 'Видео (YouTube)');
    
    // Добавляем кнопку тестирования YouTube
    this.addTestButton(cont);
  },

  renderSection(container, type, title) {
    const section = document.createElement('div');
    section.style.marginBottom = '30px';
    section.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #eee; margin-bottom:10px; padding-bottom:5px;">
        <h4 style="margin:0;">${title}</h4>
        <button class="btn-load" style="font-size:12px; padding:4px 10px;" onclick="MediaEditor.openForm('${type}')">+ Добавить</button>
      </div>
    `;

    const list = document.createElement('div');
    const items = [...(Editor.data[type] || [])].sort((a, b) => (a.order || 999) - (b.order || 999));

    if (items.length === 0) {
      list.innerHTML = '<p style="color:#999; font-size:13px; padding:10px;">Список пуст</p>';
    } else {
      items.forEach(item => {
        const hasAudio = item.audio ? '🔊' : '';
        const audioInfo = item.audio ? `<br><small style="color:#666;">📁 ${item.audio}</small>` : '';
        
        const hasYouTube = item.youtubeId ? '🎬' : '';
        const youtubeInfo = item.youtubeId 
          ? `<br><small style="color:#666;">🎬 YouTube: ${item.youtubeId}</small>
             <br><button class="btn-secondary" style="font-size:10px; padding:2px 6px; margin-top:3px;" onclick="MediaEditor.testVideo('${item.youtubeId}', '${item.title.replace(/'/g, "\\'")}')">🧪 Тест</button>` 
          : '';
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
          <div style="flex:1;">
            <span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:8px;">${item.order || 0}</span>
            <strong>${Editor.sanitizeInput(item.title)}</strong> ${hasAudio}${hasYouTube}
            ${audioInfo}${youtubeInfo}
          </div>
          <div style="display:flex; gap:5px;">
            ${type === 'videos' && item.youtubeId ? `
              <button class="btn-secondary" style="padding:4px 8px;" onclick="MediaEditor.previewVideo('${item.youtubeId}', '${item.title.replace(/'/g, "\\'")}')">👁️</button>
            ` : ''}
            <button class="btn-secondary" style="padding:4px 8px;" onclick="MediaEditor.openForm('${type}', '${item.id}')">✏️</button>
            <button class="btn-danger" style="padding:4px 8px;" onclick="MediaEditor.deleteMedia('${type}', '${item.id}')">🗑️</button>
          </div>
        `;
        list.appendChild(div);
      });
    }

    section.appendChild(list);
    container.appendChild(section);
  },

  /**
   * Добавляет кнопку тестирования YouTube
   */
  addTestButton(container) {
    const testSection = document.createElement('div');
    testSection.style.cssText = 'margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;';
    testSection.innerHTML = `
      <h4 style="margin-top:0;">🔧 Диагностика YouTube</h4>
      <p style="font-size:13px; color:#666; margin-bottom:15px;">
        Если видео не воспроизводятся в Chrome, запустите диагностику:
      </p>
      <button class="btn-secondary" onclick="MediaEditor.runDiagnostics()">🔍 Диагностика Chrome</button>
      <button class="btn-secondary" onclick="MediaEditor.showChromeHelp()" style="margin-left:10px;">❓ Помощь</button>
    `;
    container.appendChild(testSection);
  },

  /**
   * Превью видео в модальном окне
   */
  previewVideo(youtubeId, title) {
    if (typeof YouTubeHelper === 'undefined') {
      alert('❌ YouTubeHelper не загружен');
      return;
    }

    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.id = 'videoPreviewModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      padding: 20px;
      position: relative;
    `;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0;">${Editor.sanitizeInput(title)}</h3>
        <button class="btn-danger" style="padding: 5px 10px;" onclick="document.getElementById('videoPreviewModal').remove()">✕ Закрыть</button>
      </div>
      <div id="videoContainer"></div>
      <div style="margin-top: 15px; font-size: 12px; color: #666;">
        <strong>ID:</strong> ${youtubeId}<br>
        <strong>Браузер:</strong> ${YouTubeHelper.detectBrowser()}
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Вставляем видео
    const container = content.querySelector('#videoContainer');
    const videoElement = YouTubeHelper.createResponsiveContainer(youtubeId, {
      aspectRatio: '16/9',
      autoplay: false
    });
    container.appendChild(videoElement);

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  },

  /**
   * Тестирование конкретного видео
   */
  async testVideo(youtubeId, title) {
    if (typeof YouTubeHelper === 'undefined') {
      alert('❌ YouTubeHelper не загружен');
      return;
    }

    alert('🧪 Запуск теста воспроизведения...\n\nЭто может занять несколько секунд.');

    const result = await YouTubeHelper.testPlayback(youtubeId);

    let message = `🎬 Тест видео: ${title}\n\n`;
    message += `ID: ${youtubeId}\n`;
    message += `Браузер: ${YouTubeHelper.detectBrowser()}\n\n`;

    if (result.success) {
      message += '✅ УСПЕШНО: Видео загружено корректно\n\n';
      message += 'Если видео всё равно не воспроизводится на сайте, проверьте:\n';
      message += '• Настройки блокировщиков рекламы\n';
      message += '• Настройки cookie (должны быть разрешены)\n';
      message += '• Настройки безопасности браузера';
    } else {
      message += `❌ ОШИБКА: ${result.error}\n\n`;
      message += '💡 Рекомендации:\n';
      result.recommendations.forEach(rec => {
        message += `• ${rec}\n`;
      });
    }

    alert(message);
  },

  /**
   * Диагностика Chrome
   */
  runDiagnostics() {
    if (typeof YouTubeHelper === 'undefined') {
      alert('❌ YouTubeHelper не загружен. Подключите youtubeHelper.js');
      return;
    }

    const diagnosis = YouTubeHelper.diagnoseChrome();

    let message = '🔍 ДИАГНОСТИКА YOUTUBE В CHROME\n\n';
    message += `Браузер: ${diagnosis.browser}\n\n`;

    if (diagnosis.issues.length === 0) {
      message += '✅ Проблем не обнаружено!\n\n';
      message += 'Если видео всё равно не работают, попробуйте:\n';
      message += '1. Очистить кэш браузера\n';
      message += '2. Отключить блокировщики рекламы\n';
      message += '3. Проверить интернет-соединение\n';
      message += '4. Открыть сайт в режиме инкогнито';
    } else {
      message += '⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:\n\n';
      diagnosis.issues.forEach((issue, idx) => {
        message += `${idx + 1}. ${issue}\n`;
      });
      
      message += '\n💡 РЕКОМЕНДАЦИИ:\n\n';
      diagnosis.recommendations.forEach((rec, idx) => {
        message += `${idx + 1}. ${rec}\n`;
      });
    }

    alert(message);
  },

  /**
   * Помощь по Chrome
   */
  showChromeHelp() {
    const help = `
🔧 РЕШЕНИЕ ПРОБЛЕМ С YOUTUBE В CHROME

Если видео не воспроизводятся в Chrome, попробуйте:

1️⃣ РАЗРЕШИТЬ COOKIE
   • Откройте chrome://settings/cookies
   • Выберите "Разрешить все файлы cookie"
   • Перезагрузите страницу

2️⃣ ОТКЛЮЧИТЬ БЛОКИРОВЩИКИ РЕКЛАМЫ
   • Временно отключите AdBlock/uBlock
   • Добавьте сайт в исключения

3️⃣ ОЧИСТИТЬ КЭШ
   • Нажмите Ctrl+Shift+Delete
   • Выберите "Изображения и файлы в кэше"
   • Очистите данные

4️⃣ ПРОВЕРИТЬ HTTPS
   • Убедитесь что сайт открыт по HTTPS
   • YouTube может блокировать HTTP

5️⃣ РЕЖИМ ИНКОГНИТО
   • Откройте сайт в режиме инкогнито (Ctrl+Shift+N)
   • Если работает — проблема в расширениях

6️⃣ РАЗРЕШЕНИЯ САЙТА
   • Нажмите на замок в адресной строке
   • Проверьте что cookie и JavaScript разрешены

7️⃣ ОБНОВИТЬ БРАУЗЕР
   • chrome://settings/help
   • Установите последнюю версию

8️⃣ ПОПРОБОВАТЬ ДРУГОЙ БРАУЗЕР
   • Edge, Firefox, Safari
   • Если работает — проблема в Chrome

Если ничего не помогло — напишите в поддержку.
    `.trim();

    alert(help);
  },

  openForm(type, id = null) {
    this.currentType = type;
    
    const item = id ? Editor.data[type].find(i => i.id === id) : null;
    
    this.currentMedia = item ? JSON.parse(JSON.stringify(item)) : {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: '',
      link: '',
      order: 999,
      ...(type === 'tracks' ? { audio: '' } : {}),
      ...(type === 'videos' ? { youtubeId: '' } : {})
    };
    
    const form = document.getElementById('mediaEditorCard');
    form.style.display = 'block';
    
    document.getElementById('mediaEditorTitle').textContent = 
      item ? `✏️ Редактирование: ${type === 'tracks' ? 'Музыка' : 'Видео'}` 
           : `➕ Добавление: ${type === 'tracks' ? 'Музыка' : 'Видео'}`;
    
    const typeSelect = document.getElementById('m-type');
    typeSelect.value = type;
    
    document.getElementById('m-title').value = this.currentMedia.title || '';
    document.getElementById('m-link').value = this.currentMedia.link || '';
    document.getElementById('m-order').value = this.currentMedia.order || 999;
    
    // Поле audio только для треков
    const audioGroup = document.getElementById('m-audio-group');
    if (type === 'tracks') {
      audioGroup.style.display = 'block';
      document.getElementById('m-audio').value = this.currentMedia.audio || '';
    } else {
      audioGroup.style.display = 'none';
    }
    
    // YouTube ID для видео
    const youtubeGroup = document.getElementById('m-youtube-group');
    if (type === 'videos') {
      youtubeGroup.style.display = 'block';
      document.getElementById('m-youtube').value = this.currentMedia.youtubeId || '';
    } else {
      youtubeGroup.style.display = 'none';
    }
    
    const linkLabel = document.getElementById('m-link-label');
    const linkHint = document.getElementById('m-link-hint');
    
    if (type === 'tracks') {
      linkLabel.textContent = 'Ссылка на SoundCloud';
      linkHint.textContent = 'Пример: https://soundcloud.com/artist/track-name';
    } else {
      linkLabel.textContent = 'Ссылка на YouTube (опционально)';
      linkHint.textContent = 'Пример: https://www.youtube.com/watch?v=... (можно оставить пустым если есть YouTube ID)';
    }
    
    Editor.formIsOpen = true;
    
    console.log(`📝 Открыта форма редактирования: ${type}`, this.currentMedia);
  },

  saveMedia() {
    if (!this.currentType || !this.currentMedia) {
      alert('Ошибка: форма не инициализирована');
      return;
    }
    
    this.currentMedia.title = document.getElementById('m-title').value.trim();
    this.currentMedia.link = document.getElementById('m-link').value.trim();
    this.currentMedia.order = parseInt(document.getElementById('m-order').value) || 999;
    
    // Для треков читаем audio
    if (this.currentType === 'tracks') {
      const audioValue = document.getElementById('m-audio').value.trim();
      if (audioValue) {
        this.currentMedia.audio = audioValue;
      } else {
        delete this.currentMedia.audio;
      }
    }
    
    // ✅ ИСПРАВЛЕНО: Для видео ВСЕГДА извлекаем чистый ID
    if (this.currentType === 'videos') {
      const youtubeInput = document.getElementById('m-youtube').value.trim();
      
      if (youtubeInput) {
        // 🔥 КРИТИЧНО: Используем YouTubeHelper.extractId()
        const extractedId = typeof YouTubeHelper !== 'undefined'
          ? YouTubeHelper.extractId(youtubeInput)
          : (typeof extractYouTubeId !== 'undefined' ? extractYouTubeId(youtubeInput) : youtubeInput);
        
        if (!extractedId) {
          alert('❌ Не удалось извлечь YouTube ID из введённого значения');
          return;
        }
        
        // ✅ Валидация: проверяем что это именно 11-символьный ID
        const isValid = typeof YouTubeHelper !== 'undefined'
          ? YouTubeHelper.isValid(extractedId)
          : /^[a-zA-Z0-9_-]{11}$/.test(extractedId);
        
        if (!isValid) {
          alert('❌ Некорректный YouTube ID. Должен быть 11 символов (например: dQw4w9WgXcQ)');
          return;
        }
        
        // 🎯 СОХРАНЯЕМ ТОЛЬКО ЧИСТЫЙ ID
        this.currentMedia.youtubeId = extractedId;
        
        // Автоматически генерируем link если его нет
        if (!this.currentMedia.link) {
          this.currentMedia.link = `https://www.youtube.com/watch?v=${extractedId}`;
        }
        
        console.log(`✅ YouTube ID сохранён: ${extractedId}`);
      } else {
        delete this.currentMedia.youtubeId;
      }
    }
    
    // Валидация
    if (!this.currentMedia.title) {
      alert('❌ Пожалуйста, введите название');
      return;
    }
    
    // Для видео: или link или youtubeId должны быть
    if (this.currentType === 'videos' && !this.currentMedia.link && !this.currentMedia.youtubeId) {
      alert('❌ Укажите либо ссылку на видео, либо YouTube ID');
      return;
    }
    
    // Валидация link если он указан
    if (this.currentMedia.link) {
      try {
        new URL(this.currentMedia.link);
      } catch (e) {
        alert('❌ Некорректная ссылка. Введите полный URL (https://...)');
        return;
      }
    }
    
    const existingIndex = Editor.data[this.currentType].findIndex(i => i.id === this.currentMedia.id);
    
    if (existingIndex > -1) {
      Editor.data[this.currentType][existingIndex] = this.currentMedia;
      console.log(`✅ Обновлено: ${this.currentMedia.title} (ID: ${this.currentMedia.youtubeId || 'нет'})`);
    } else {
      if (!Editor.data[this.currentType]) Editor.data[this.currentType] = [];
      Editor.data[this.currentType].push(this.currentMedia);
      console.log(`✅ Добавлено: ${this.currentMedia.title} (ID: ${this.currentMedia.youtubeId || 'нет'})`);
    }
    
    Editor.isDirty = true;
    this.cancelEdit();
    Editor.renderAll();
    
    alert(`✅ ${existingIndex > -1 ? 'Обновлено' : 'Добавлено'}: ${this.currentMedia.title}`);
  },

  cancelEdit() {
    if (Editor.isDirty && !confirm('У вас есть несохранённые изменения. Закрыть форму?')) {
      return;
    }
    
    const form = document.getElementById('mediaEditorCard');
    form.style.display = 'none';
    
    this.currentMedia = null;
    this.currentType = null;
    Editor.formIsOpen = false;
    
    console.log('❌ Редактирование отменено');
  },

  deleteMedia(type, id) {
    const item = Editor.data[type].find(i => i.id === id);
    if (!item) return;
    
    if (confirm(`Удалить "${item.title}"?`)) {
      Editor.data[type] = Editor.data[type].filter(i => i.id !== id);
      Editor.isDirty = true;
      this.render();
      console.log(`🗑️ Удалено: ${item.title}`);
    }
  }
};

console.log('✅ MediaEditor (Chrome-совместимый, ИСПРАВЛЕНО) загружен');